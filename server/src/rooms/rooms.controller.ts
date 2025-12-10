import {
  Controller,
  Get,
  Post,
  Body,
  Param,
  Query,
  UsePipes,
  HttpCode,
  HttpStatus,
  Inject,
  NotFoundException,
  forwardRef,
  Logger,
} from '@nestjs/common';
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiParam,
  ApiBody,
  ApiSecurity,
} from '@nestjs/swagger';
import { RoomsService } from './rooms.service';
import { z } from 'zod';
import { ZodValidationPipe } from '../common/zod-validation.pipe';
import { GetApiKey } from '../auth/decorators/api-key.decorator';
import { ApiKey } from '../database/schema/api-keys';
import { GetUser } from '../auth/decorators/get-user.decorator';
import { RequireScope } from '../auth/scopes/scopes.decorator';
import { Scope } from '../auth/scopes/scopes.constants';
import { SocketGateway } from '../socket/socket.gateway';
import { DATABASE_CONNECTION, Database } from '../database/database.module';
import { users } from '../database/schema/users';
import { eq } from 'drizzle-orm';

const CreateRoomSchema = z.object({
  name: z.string().min(3).max(150),
  description: z.string().max(2000).optional(),
  isPrivate: z.boolean().optional(),
  type: z.enum(['normal', 'support']).optional(),
});

const CreateMessageSchema = z.object({
  content: z.string().min(1).max(1000),
  username: z.string().optional(),
  recipientId: z.string().optional(), // ID получателя (для модератора в чате поддержки)
});

@ApiTags('rooms')
@Controller('rooms')
export class RoomsController {
  private readonly logger = new Logger(RoomsController.name);

  constructor(
    private readonly roomsService: RoomsService,
    @Inject(forwardRef(() => SocketGateway))
    private readonly socketGateway: SocketGateway,
    @Inject(DATABASE_CONNECTION)
    private readonly db: Database,
  ) {}

  @Post()
  @RequireScope(Scope.ALLOW_ALL_CHATS)
  @HttpCode(HttpStatus.CREATED)
  @ApiOperation({
    summary: 'Create a new room',
    description:
      'Create a new room/chat. Requires "allow-all-chats" or "allow-all" scope for API keys. JWT users have full access.',
  })
  @ApiSecurity('api-key')
  @ApiSecurity('bearer')
  @ApiBody({
    schema: {
      type: 'object',
      required: ['name'],
      properties: {
        name: { type: 'string', minLength: 3, maxLength: 150, description: 'Room name' },
        description: { type: 'string', maxLength: 2000, description: 'Room description' },
        isPrivate: { type: 'boolean', description: 'Whether the room is private' },
        type: {
          type: 'string',
          enum: ['normal', 'support'],
          description:
            'Room type: normal (regular chat) or support (support chat where users can only message moderators)',
        },
      },
    },
  })
  @ApiResponse({ status: 201, description: 'Room created successfully' })
  @ApiResponse({ status: 400, description: 'Invalid input data' })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  @ApiResponse({
    status: 403,
    description: 'Forbidden - API key does not have required scope (allow-all-chats or allow-all)',
  })
  async create(
    @Body(new ZodValidationPipe(CreateRoomSchema)) body: z.infer<typeof CreateRoomSchema>,
    @GetUser() user?: { userId: string; username?: string },
    @GetApiKey() apiKey?: ApiKey,
  ) {
    const room = await this.roomsService.create({
      name: body.name,
      description: body.description ?? null,
      isPrivate: body.isPrivate ?? true, // По умолчанию приватные комнаты
      type: body.type ?? 'normal',
      createdBy: user?.userId ?? apiKey?.userId ?? null,
    });

    // Отправляем событие о создании комнаты через WebSocket
    this.socketGateway.emitRoomCreated(room);

    return room;
  }

  @Get()
  @RequireScope(Scope.ALLOW_ALL_CHATS)
  @ApiOperation({
    summary: 'Get all existing rooms',
    description:
      'Get all rooms in the system. Requires "allow-all-chats" or "allow-all" scope for API keys. JWT users have full access.',
  })
  @ApiSecurity('api-key')
  @ApiSecurity('bearer')
  @ApiResponse({
    status: 200,
    description: 'List of all rooms (public only for unauthorized users)',
  })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  @ApiResponse({
    status: 403,
    description: 'Forbidden - API key does not have required scope (allow-all-chats or allow-all)',
  })
  async findAll(
    @GetUser() user?: { userId: string; username?: string },
    @GetApiKey() apiKey?: ApiKey,
  ) {
    try {
      this.logger.debug(`GET /rooms - user: ${user?.userId || 'none'}, apiKey: ${apiKey?.id || 'none'}`);
      // Если пользователь авторизован, показываем все комнаты включая приватные
      // Иначе только публичные
      const includePrivate = !!(user?.userId || apiKey?.userId);
      this.logger.debug(`includePrivate: ${includePrivate}`);
      
      const rooms = await this.roomsService.findAll(includePrivate);
      this.logger.debug(`Returning ${rooms.length} rooms`);
      
      return rooms;
    } catch (error) {
      this.logger.error(`Error in findAll: ${error.message}`, error.stack);
      throw error;
    }
  }

  @Get('my')
  @ApiOperation({ summary: 'Get rooms for the authenticated user' })
  @ApiSecurity('api-key')
  @ApiSecurity('bearer')
  @ApiResponse({ status: 200, description: 'List of user rooms' })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  async findMyRooms(
    @GetUser() user?: { userId: string; username?: string },
    @GetApiKey() apiKey?: ApiKey,
  ) {
    const userId = user?.userId || apiKey?.userId;
    if (!userId) {
      return this.roomsService.findAll(false); // Если не авторизован, возвращаем все публичные комнаты
    }
    return this.roomsService.findByUserId(userId);
  }

  @Get('user/:userId')
  @ApiOperation({ summary: 'Get all rooms created by a specific user' })
  @ApiSecurity('api-key')
  @ApiSecurity('bearer')
  @ApiParam({ name: 'userId', type: 'string', format: 'uuid', description: 'User ID' })
  @ApiResponse({ status: 200, description: 'List of rooms created by the user' })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  @ApiResponse({ status: 404, description: 'User not found' })
  async findByUserId(@Param('userId') userId: string) {
    return this.roomsService.findByUserIdOnly(userId);
  }

  @Get(':id/messages')
  @RequireScope(Scope.ALLOW_ALL_CHATS)
  @ApiOperation({
    summary: 'Get room messages history',
    description:
      'Get messages from a room. Requires "allow-all-chats" or "allow-all" scope for API keys. JWT users have full access. Use query parameters to filter messages for support chat scenarios.',
  })
  @ApiSecurity('api-key')
  @ApiSecurity('bearer')
  @ApiParam({ name: 'id', type: 'string', format: 'uuid' })
  @ApiResponse({ status: 200, description: 'Room messages history' })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  @ApiResponse({
    status: 403,
    description: 'Forbidden - API key does not have required scope (allow-all-chats or allow-all)',
  })
  @ApiResponse({ status: 404, description: 'Room not found' })
  async getRoomMessages(
    @Param('id') id: string,
    @Query('limit') limit?: string,
    @Query('userId') filterUserId?: string, // Фильтр: показывать только сообщения от этого пользователя
    @Query('includeRecipients') includeRecipients?: string, // Если true, включает сообщения где userId или recipientId = filterUserId
    @GetUser() user?: { userId: string; username?: string },
    @GetApiKey() apiKey?: ApiKey,
  ) {
    const messageLimit = limit ? parseInt(limit, 10) : 100;
    // Используем filterUserId из query или userId из токена
    const userId = filterUserId || user?.userId || apiKey?.userId;
    const includeRecipientsFlag = includeRecipients === 'true' || includeRecipients === '1';

    const messages = await this.roomsService.getRoomMessages(
      id,
      messageLimit,
      userId || undefined,
      includeRecipientsFlag,
    );
    // Возвращаем в обратном порядке (старые первыми)
    return messages.reverse();
  }

  @Get(':id')
  @RequireScope(Scope.ALLOW_ALL_CHATS)
  @ApiOperation({
    summary: 'Get room by ID',
    description:
      'Get room details by ID. Requires "allow-all-chats" or "allow-all" scope for API keys. JWT users have full access.',
  })
  @ApiSecurity('api-key')
  @ApiSecurity('bearer')
  @ApiParam({ name: 'id', type: 'string', format: 'uuid' })
  @ApiResponse({ status: 200, description: 'Room details' })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  @ApiResponse({
    status: 403,
    description: 'Forbidden - API key does not have required scope (allow-all-chats or allow-all)',
  })
  @ApiResponse({ status: 404, description: 'Room not found' })
  async findOne(@Param('id') id: string) {
    return this.roomsService.findOne(id);
  }

  @Post(':id/messages')
  @RequireScope(Scope.ALLOW_ALL_CHATS)
  @HttpCode(HttpStatus.CREATED)
  @ApiOperation({
    summary: 'Send a message to a room',
    description:
      'Send a message to a room. Requires "allow-all-chats" or "allow-all" scope for API keys. JWT users have full access. For support chat: set recipientId to target a specific user, or leave null for broadcast to moderators. External application controls who can see messages.',
  })
  @ApiSecurity('api-key')
  @ApiSecurity('bearer')
  @ApiParam({ name: 'id', type: 'string', format: 'uuid', description: 'Room ID' })
  @ApiBody({
    schema: {
      type: 'object',
      required: ['content'],
      properties: {
        content: {
          type: 'string',
          minLength: 1,
          maxLength: 1000,
          description: 'Message content',
        },
        username: {
          type: 'string',
          description:
            'Optional username override (defaults to authenticated user or API key name)',
        },
        recipientId: {
          type: 'string',
          format: 'uuid',
          description:
            'Optional recipient ID. For support chat: null = visible to all moderators, specific userId = private message to that user. External application controls visibility logic.',
        },
      },
    },
  })
  @ApiResponse({ status: 201, description: 'Message sent successfully' })
  @ApiResponse({ status: 400, description: 'Invalid input data' })
  @ApiResponse({ status: 401, description: 'Unauthorized - token required' })
  @ApiResponse({
    status: 403,
    description: 'Forbidden - API key does not have required scope (allow-all-chats or allow-all)',
  })
  @ApiResponse({ status: 404, description: 'Room not found' })
  @UsePipes(new ZodValidationPipe(CreateMessageSchema))
  async sendMessage(
    @Param('id') roomId: string,
    @Body() body: z.infer<typeof CreateMessageSchema>,
    @GetUser() user?: { userId: string; username?: string },
    @GetApiKey() apiKey?: ApiKey,
  ) {
    // Проверяем, что комната существует
    await this.roomsService.findOne(roomId);

    // Определяем userId и username
    let userId: string | null = null;
    let username: string;

    if (user?.userId) {
      userId = user.userId;
      const [dbUser] = await this.db.select().from(users).where(eq(users.id, user.userId)).limit(1);
      username =
        body.username || dbUser?.username || user.username || `user-${user.userId.substring(0, 8)}`;
    } else if (apiKey) {
      userId = apiKey.userId || null;
      username = body.username || apiKey.name || `api-key-${apiKey.id.substring(0, 8)}`;
    } else {
      throw new NotFoundException('Authentication required');
    }

    // Внешнее приложение само решает, кому адресовать сообщение
    // Микросервис просто сохраняет recipientId как есть
    const recipientId = body.recipientId || null;

    // Создаем сообщение в базе данных
    const message = await this.roomsService.createMessage({
      roomId,
      userId,
      recipientId,
      username,
      content: body.content,
    });

    // Отправляем сообщение через WebSocket для реального времени
    const messagePayload = {
      id: message.id,
      username,
      message: body.content,
      timestamp: message.createdAt.toISOString(),
      recipientId: message.recipientId,
      userId: message.userId,
      authType: user?.userId ? 'user' : 'api-key',
    };

    this.socketGateway.server.to(roomId).emit('message', messagePayload);

    return {
      id: message.id,
      roomId: message.roomId,
      userId: message.userId,
      username: message.username,
      content: message.content,
      recipientId: message.recipientId,
      createdAt: message.createdAt,
    };
  }
}

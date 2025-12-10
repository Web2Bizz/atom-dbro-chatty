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
  ForbiddenException,
  Req,
} from '@nestjs/common';
import { appendFileSync } from 'fs';
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
import { RequireScope, RequireAnyScope } from '../auth/scopes/scopes.decorator';
import { Scope, hasScope } from '../auth/scopes/scopes.constants';
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
  private readonly logPath = 'e:\\Others\\web_apps\\atom-dbro-backend\\.cursor\\debug.log';

  private writeLog(data: any) {
    try {
      appendFileSync(this.logPath, JSON.stringify(data) + '\n', 'utf8');
    } catch (e) {}
  }

  constructor(
    private readonly roomsService: RoomsService,
    @Inject(forwardRef(() => SocketGateway))
    private readonly socketGateway: SocketGateway,
    @Inject(DATABASE_CONNECTION)
    private readonly db: Database,
  ) {}

  /**
   * Проверяет, имеет ли API ключ доступ к комнате
   * @param room - комната для проверки
   * @param apiKey - API ключ
   * @param userScopes - scopes пользователя/API ключа
   * @returns true, если доступ разрешен
   */
  private hasAccessToRoom(
    room: { createdBy: string | null },
    apiKey: ApiKey | undefined,
    userScopes: string[],
  ): boolean {
    // JWT пользователи имеют полный доступ
    if (!apiKey) {
      return true;
    }

    // Если есть scope allow-all или allow-all-chats, доступ ко всем комнатам
    if (hasScope(userScopes, Scope.ALLOW_ALL) || hasScope(userScopes, Scope.ALLOW_ALL_CHATS)) {
      return true;
    }

    // Если есть scope allow-create-rooms, доступ только к созданным комнатам
    if (hasScope(userScopes, Scope.ALLOW_CREATE_ROOMS)) {
      return room.createdBy === apiKey.userId;
    }

    // Нет подходящего scope
    return false;
  }

  @Post()
  @RequireAnyScope(Scope.ALLOW_ALL_CHATS, Scope.ALLOW_CREATE_ROOMS)
  @HttpCode(HttpStatus.CREATED)
  @ApiOperation({
    summary: 'Create a new room',
    description:
      'Create a new room/chat. Requires "allow-all-chats", "allow-create-rooms", or "allow-all" scope for API keys. JWT users have full access.',
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
    description:
      'Forbidden - API key does not have required scope (allow-all-chats, allow-create-rooms, or allow-all)',
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
  @RequireAnyScope(Scope.ALLOW_ALL_CHATS, Scope.ALLOW_CREATE_ROOMS)
  @ApiOperation({
    summary: 'Get all existing rooms',
    description:
      'Get all rooms in the system. Requires "allow-all-chats", "allow-create-rooms", or "allow-all" scope for API keys. API keys with "allow-create-rooms" can only see rooms they created. JWT users have full access.',
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
    description:
      'Forbidden - API key does not have required scope (allow-all-chats, allow-create-rooms, or allow-all)',
  })
  async findAll(
    @GetUser() user?: { userId: string; username?: string },
    @GetApiKey() apiKey?: ApiKey,
    @Req() req?: any,
  ) {
    try {
      this.logger.debug(
        `GET /rooms - user: ${user?.userId || 'none'}, apiKey: ${apiKey?.id || 'none'}`,
      );

      // Если это JWT пользователь, показываем все комнаты
      if (user?.userId && !apiKey) {
        const includePrivate = true;
        const rooms = await this.roomsService.findAll(includePrivate);
        this.logger.debug(`Returning ${rooms.length} rooms for JWT user`);
        return rooms;
      }

      // Для API ключей проверяем scopes
      if (apiKey) {
        const userScopes: string[] = req?.user?.scopes || [];
        const hasAllChatsAccess =
          hasScope(userScopes, Scope.ALLOW_ALL) || hasScope(userScopes, Scope.ALLOW_ALL_CHATS);

        if (hasAllChatsAccess) {
          // Полный доступ ко всем комнатам
          const includePrivate = true;
          const rooms = await this.roomsService.findAll(includePrivate);
          this.logger.debug(`Returning ${rooms.length} rooms for API key with full access`);
          return rooms;
        } else if (hasScope(userScopes, Scope.ALLOW_CREATE_ROOMS)) {
          // Доступ только к созданным комнатам
          const userId = apiKey.userId;
          if (!userId) {
            throw new ForbiddenException('API key must be associated with a user to access rooms');
          }
          const rooms = await this.roomsService.findByUserIdOnly(userId);
          this.logger.debug(`Returning ${rooms.length} rooms created by API key`);
          return rooms;
        }
      }

      // Если не авторизован, показываем только публичные комнаты
      const rooms = await this.roomsService.findAll(false);
      this.logger.debug(`Returning ${rooms.length} public rooms`);
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
    // #region agent log
    this.writeLog({location:'rooms.controller.ts:231',message:'findMyRooms entry',data:{userExists:!!user,apiKeyExists:!!apiKey,userId:user?.userId,apiKeyUserId:apiKey?.userId},timestamp:Date.now(),sessionId:'debug-session',runId:'run1',hypothesisId:'C'});
    // #endregion
    const userId = user?.userId || apiKey?.userId;
    // #region agent log
    this.writeLog({location:'rooms.controller.ts:234',message:'userId extracted',data:{userId,userIdType:typeof userId,hasUserId:!!userId},timestamp:Date.now(),sessionId:'debug-session',runId:'run1',hypothesisId:'B'});
    // #endregion
    if (!userId) {
      // #region agent log
      this.writeLog({location:'rooms.controller.ts:236',message:'no userId, returning public rooms',data:{},timestamp:Date.now(),sessionId:'debug-session',runId:'run1',hypothesisId:'C'});
      // #endregion
      return this.roomsService.findAll(false); // Если не авторизован, возвращаем все публичные комнаты
    }
    // #region agent log
    this.writeLog({location:'rooms.controller.ts:240',message:'calling findByUserId',data:{userId},timestamp:Date.now(),sessionId:'debug-session',runId:'run1',hypothesisId:'A'});
    // #endregion
    try {
      const result = await this.roomsService.findByUserId(userId);
      // #region agent log
      this.writeLog({location:'rooms.controller.ts:244',message:'findByUserId success',data:{roomsCount:result?.length},timestamp:Date.now(),sessionId:'debug-session',runId:'run1',hypothesisId:'A'});
      // #endregion
      return result;
    } catch (error) {
      // #region agent log
      this.writeLog({location:'rooms.controller.ts:248',message:'findByUserId error',data:{errorMessage:error?.message,errorName:error?.name,errorStack:error?.stack?.substring(0,500)},timestamp:Date.now(),sessionId:'debug-session',runId:'run1',hypothesisId:'A'});
      // #endregion
      this.logger.error(`Error in findMyRooms: ${error.message}`, error.stack);
      throw error;
    }
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
  @RequireAnyScope(Scope.ALLOW_ALL_CHATS, Scope.ALLOW_CREATE_ROOMS)
  @ApiOperation({
    summary: 'Get room messages history',
    description:
      'Get messages from a room. Requires "allow-all-chats", "allow-create-rooms", or "allow-all" scope for API keys. API keys with "allow-create-rooms" can only access messages from rooms they created. JWT users have full access. Use query parameters to filter messages for support chat scenarios.',
  })
  @ApiSecurity('api-key')
  @ApiSecurity('bearer')
  @ApiParam({ name: 'id', type: 'string', format: 'uuid' })
  @ApiResponse({ status: 200, description: 'Room messages history' })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  @ApiResponse({
    status: 403,
    description:
      'Forbidden - API key does not have required scope or does not have access to this room',
  })
  @ApiResponse({ status: 404, description: 'Room not found' })
  async getRoomMessages(
    @Param('id') id: string,
    @Query('limit') limit?: string,
    @Query('userId') filterUserId?: string, // Фильтр: показывать только сообщения от этого пользователя
    @Query('includeRecipients') includeRecipients?: string, // Если true, включает сообщения где userId или recipientId = filterUserId
    @GetUser() user?: { userId: string; username?: string },
    @GetApiKey() apiKey?: ApiKey,
    @Req() req?: any,
  ) {
    // Проверяем доступ к комнате
    const room = await this.roomsService.findOne(id);

    // Если это JWT пользователь, разрешаем доступ
    if (user?.userId && !apiKey) {
      // Продолжаем выполнение
    } else if (apiKey) {
      // Для API ключей проверяем доступ
      const userScopes: string[] = req?.user?.scopes || [];
      if (!this.hasAccessToRoom(room, apiKey, userScopes)) {
        throw new ForbiddenException(
          'Access denied. You do not have permission to access messages from this room.',
        );
      }
    }

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
  @RequireAnyScope(Scope.ALLOW_ALL_CHATS, Scope.ALLOW_CREATE_ROOMS)
  @ApiOperation({
    summary: 'Get room by ID',
    description:
      'Get room details by ID. Requires "allow-all-chats", "allow-create-rooms", or "allow-all" scope for API keys. API keys with "allow-create-rooms" can only access rooms they created. JWT users have full access.',
  })
  @ApiSecurity('api-key')
  @ApiSecurity('bearer')
  @ApiParam({ name: 'id', type: 'string', format: 'uuid' })
  @ApiResponse({ status: 200, description: 'Room details' })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  @ApiResponse({
    status: 403,
    description:
      'Forbidden - API key does not have required scope or does not have access to this room',
  })
  @ApiResponse({ status: 404, description: 'Room not found' })
  async findOne(
    @Param('id') id: string,
    @GetUser() user?: { userId: string; username?: string },
    @GetApiKey() apiKey?: ApiKey,
    @Req() req?: any,
  ) {
    const room = await this.roomsService.findOne(id);

    // Если это JWT пользователь, разрешаем доступ
    if (user?.userId && !apiKey) {
      return room;
    }

    // Для API ключей проверяем доступ
    if (apiKey) {
      const userScopes: string[] = req?.user?.scopes || [];
      if (!this.hasAccessToRoom(room, apiKey, userScopes)) {
        throw new ForbiddenException(
          'Access denied. You do not have permission to access this room.',
        );
      }
    }

    return room;
  }

  @Post(':id/messages')
  @RequireAnyScope(Scope.ALLOW_ALL_CHATS, Scope.ALLOW_CREATE_ROOMS)
  @HttpCode(HttpStatus.CREATED)
  @ApiOperation({
    summary: 'Send a message to a room',
    description:
      'Send a message to a room. Requires "allow-all-chats", "allow-create-rooms", or "allow-all" scope for API keys. API keys with "allow-create-rooms" can only send messages to rooms they created. JWT users have full access. For support chat: set recipientId to target a specific user, or leave null for broadcast to moderators. External application controls who can see messages.',
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
    description:
      'Forbidden - API key does not have required scope or does not have access to this room',
  })
  @ApiResponse({ status: 404, description: 'Room not found' })
  @UsePipes(new ZodValidationPipe(CreateMessageSchema))
  async sendMessage(
    @Param('id') roomId: string,
    @Body() body: z.infer<typeof CreateMessageSchema>,
    @GetUser() user?: { userId: string; username?: string },
    @GetApiKey() apiKey?: ApiKey,
    @Req() req?: any,
  ) {
    // Проверяем, что комната существует и доступна
    const room = await this.roomsService.findOne(roomId);

    // Если это JWT пользователь, разрешаем доступ
    if (user?.userId && !apiKey) {
      // Продолжаем выполнение
    } else if (apiKey) {
      // Для API ключей проверяем доступ
      const userScopes: string[] = req?.user?.scopes || [];
      if (!this.hasAccessToRoom(room, apiKey, userScopes)) {
        throw new ForbiddenException(
          'Access denied. You do not have permission to send messages to this room.',
        );
      }
    }

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

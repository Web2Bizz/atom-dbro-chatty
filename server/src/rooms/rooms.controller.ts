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

const CreateRoomSchema = z.object({
  name: z.string().min(3).max(150),
  description: z.string().max(2000).optional(),
  isPrivate: z.boolean().optional(),
});

@ApiTags('rooms')
@Controller('rooms')
export class RoomsController {
  constructor(private readonly roomsService: RoomsService) {}

  @Post()
  @HttpCode(HttpStatus.CREATED)
  @ApiOperation({ summary: 'Create a new room' })
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
      },
    },
  })
  @ApiResponse({ status: 201, description: 'Room created successfully' })
  @ApiResponse({ status: 400, description: 'Invalid input data' })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  async create(
    @Body(new ZodValidationPipe(CreateRoomSchema)) body: z.infer<typeof CreateRoomSchema>,
    @GetUser() user?: { userId: string; username?: string },
    @GetApiKey() apiKey?: ApiKey,
  ) {
    return this.roomsService.create({
      name: body.name,
      description: body.description ?? null,
      isPrivate: body.isPrivate ?? false,
      createdBy: user?.userId ?? apiKey?.userId ?? null,
    });
  }

  @Get()
  @ApiOperation({ summary: 'Get all rooms' })
  @ApiSecurity('api-key')
  @ApiSecurity('bearer')
  @ApiResponse({ status: 200, description: 'List of all rooms' })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  async findAll() {
    return this.roomsService.findAll();
  }

  @Get('my')
  @ApiOperation({ summary: 'Get rooms for the authenticated user' })
  @ApiSecurity('api-key')
  @ApiSecurity('bearer')
  @ApiResponse({ status: 200, description: 'List of user rooms' })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  async findMyRooms(@GetUser() user: { userId: string; username?: string }) {
    if (!user || !user.userId) {
      return this.roomsService.findAll(); // Если не авторизован, возвращаем все публичные комнаты
    }
    return this.roomsService.findByUserId(user.userId);
  }

  @Get(':id/messages')
  @ApiOperation({ summary: 'Get room messages history' })
  @ApiSecurity('api-key')
  @ApiSecurity('bearer')
  @ApiParam({ name: 'id', type: 'string', format: 'uuid' })
  @ApiResponse({ status: 200, description: 'Room messages history' })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  @ApiResponse({ status: 404, description: 'Room not found' })
  async getRoomMessages(@Param('id') id: string, @Query('limit') limit?: string) {
    const messageLimit = limit ? parseInt(limit, 10) : 100;
    const messages = await this.roomsService.getRoomMessages(id, messageLimit);
    // Возвращаем в обратном порядке (старые первыми)
    return messages.reverse();
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get room by ID' })
  @ApiSecurity('api-key')
  @ApiSecurity('bearer')
  @ApiParam({ name: 'id', type: 'string', format: 'uuid' })
  @ApiResponse({ status: 200, description: 'Room details' })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  @ApiResponse({ status: 404, description: 'Room not found' })
  async findOne(@Param('id') id: string) {
    return this.roomsService.findOne(id);
  }
}

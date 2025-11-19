import { Controller, Get, Post, Body, Param, UsePipes, HttpCode, HttpStatus } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse, ApiParam, ApiBody, ApiSecurity } from '@nestjs/swagger';
import { RoomsService } from './rooms.service';
import { z } from 'zod';
import { ZodValidationPipe } from '../common/zod-validation.pipe';
import { GetApiKey } from '../auth/decorators/api-key.decorator';
import { ApiKey } from '../database/schema/api-keys';

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
  @UsePipes(new ZodValidationPipe(CreateRoomSchema))
  async create(@Body() body: z.infer<typeof CreateRoomSchema>, @GetApiKey() apiKey?: ApiKey) {
    return this.roomsService.create({
      name: body.name,
      description: body.description ?? null,
      isPrivate: body.isPrivate ?? false,
      createdBy: apiKey?.userId ?? null,
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

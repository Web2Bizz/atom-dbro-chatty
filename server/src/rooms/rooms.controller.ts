import { Controller, Get, Post, Body, Param, UsePipes, HttpCode, HttpStatus } from '@nestjs/common';
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

@Controller('rooms')
export class RoomsController {
  constructor(private readonly roomsService: RoomsService) {}

  @Post()
  @HttpCode(HttpStatus.CREATED)
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
  async findAll() {
    return this.roomsService.findAll();
  }

  @Get(':id')
  async findOne(@Param('id') id: string) {
    return this.roomsService.findOne(id);
  }
}

import { Controller, Get, Param, UseGuards } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse, ApiBearerAuth } from '@nestjs/swagger';
import { AuthGuard } from '@nestjs/passport';
import { MessagesService } from './messages.service';
import { MessageListResponseSchema } from './schemas/messages.schemas';
import { zodToSwaggerSchema } from '../common/utils/zod-to-swagger.util';

@ApiTags('messages')
@Controller('room/:id/messages')
export class MessagesController {
  constructor(private messagesService: MessagesService) {}

  @Get()
  @UseGuards(AuthGuard('jwt'))
  @ApiBearerAuth('JWT-auth')
  @ApiOperation({ summary: 'Получить все сообщения чата' })
  @ApiResponse({
    status: 200,
    description: 'Список сообщений чата',
    schema: zodToSwaggerSchema(MessageListResponseSchema),
  })
  @ApiResponse({
    status: 401,
    description: 'Не авторизован',
  })
  @ApiResponse({
    status: 404,
    description: 'Комната не найдена',
  })
  async findAllByRoomId(@Param('id') roomId: string) {
    return this.messagesService.findAllByRoomId(roomId);
  }
}

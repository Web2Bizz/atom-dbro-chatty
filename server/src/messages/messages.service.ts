import {
  Injectable,
  Inject,
  NotFoundException,
  ForbiddenException,
  forwardRef,
} from '@nestjs/common'
import { eq, desc } from 'drizzle-orm'
import { DATABASE_CONNECTION } from '../database/database.module'
import { messages, rooms } from '../database/schema'
import { NodePgDatabase } from 'drizzle-orm/node-postgres'
import { RoomMembersService } from '../rooms/room-members.service'

@Injectable()
export class MessagesService {
  constructor(
    @Inject(DATABASE_CONNECTION)
    private db: NodePgDatabase<typeof import('../database/schema')>,
    @Inject(forwardRef(() => RoomMembersService))
    private roomMembersService: RoomMembersService,
  ) {}

  async findAllByRoomId(roomId: string) {
    // Проверяем, существует ли комната
    const [room] = await this.db
      .select()
      .from(rooms)
      .where(eq(rooms.id, roomId))
      .limit(1)

    if (!room) {
      throw new NotFoundException('Room not found')
    }

    // Получаем все сообщения для комнаты, отсортированные по дате создания (новые первыми)
    return this.db
      .select()
      .from(messages)
      .where(eq(messages.roomId, roomId))
      .orderBy(desc(messages.createdAt))
  }

  async create(roomId: string, userId: string, content: string) {
    // Check if room exists
    const [room] = await this.db
      .select()
      .from(rooms)
      .where(eq(rooms.id, roomId))
      .limit(1)
    if (!room) {
      throw new NotFoundException('Room not found')
    }

    // Validate user can send messages (must be ACTIVE member)
    const canSend = await this.roomMembersService.canSendMessage(roomId, userId)
    if (!canSend) {
      throw new ForbiddenException(
        'You cannot send messages to this room. You may be banned or not a member.',
      )
    }

    // Create message
    const [message] = await this.db
      .insert(messages)
      .values({
        roomId,
        userId,
        content,
      })
      .returning()

    return message
  }
}

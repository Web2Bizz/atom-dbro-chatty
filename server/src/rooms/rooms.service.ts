import { Injectable, Inject, NotFoundException, Logger } from '@nestjs/common';
import { DATABASE_CONNECTION, Database } from '../database/database.module';
import { rooms, Room, NewRoom } from '../database/schema/rooms';
import { messages, Message, NewMessage } from '../database/schema/messages';
import { eq, or, desc, and } from 'drizzle-orm';

@Injectable()
export class RoomsService {
  private readonly logger = new Logger(RoomsService.name);

  constructor(
    @Inject(DATABASE_CONNECTION)
    private readonly db: Database,
  ) {}

  async create(data: NewRoom): Promise<Room> {
    const [room] = await this.db
      .insert(rooms)
      .values({
        ...data,
        description: data.description ?? null,
        isPrivate: data.isPrivate ?? true, // По умолчанию приватные комнаты
        type: data.type ?? 'normal',
      })
      .returning();

    this.logger.log(`Room created: ${room.name} (${room.id})`);
    return room;
  }

  async findAll(includePrivate: boolean = false): Promise<Room[]> {
    if (includePrivate) {
      // Возвращаем все комнаты, включая приватные
      return this.db.select().from(rooms).orderBy(rooms.createdAt);
    }
    // Возвращаем только публичные комнаты
    return this.db.select().from(rooms).where(eq(rooms.isPrivate, false)).orderBy(rooms.createdAt);
  }

  async findOne(id: string): Promise<Room> {
    const [room] = await this.db.select().from(rooms).where(eq(rooms.id, id)).limit(1);

    if (!room) {
      this.logger.warn(`Attempt to access non-existent room: ${id}`);
      throw new NotFoundException(`Room with ID ${id} not found`);
    }

    return room;
  }

  async findByUserId(userId: string): Promise<Room[]> {
    // Получаем комнаты, созданные пользователем, и все публичные комнаты
    return this.db
      .select()
      .from(rooms)
      .where(or(eq(rooms.createdBy, userId), eq(rooms.isPrivate, false)))
      .orderBy(rooms.createdAt);
  }

  async findByUserIdOnly(userId: string): Promise<Room[]> {
    // Получаем только комнаты, созданные конкретным пользователем
    return this.db.select().from(rooms).where(eq(rooms.createdBy, userId)).orderBy(rooms.createdAt);
  }

  async createMessage(data: NewMessage): Promise<Message> {
    const [message] = await this.db
      .insert(messages)
      .values({
        ...data,
        userId: data.userId ?? null,
        recipientId: data.recipientId ?? null,
      })
      .returning();

    this.logger.log(`Message created in room ${data.roomId} by ${data.username}`);
    return message;
  }

  /**
   * Получает сообщения комнаты с опциональной фильтрацией
   * @param roomId ID комнаты
   * @param limit Лимит сообщений
   * @param userId Опциональный фильтр: показывать только сообщения для этого пользователя
   * @param includeRecipients Если true, включает сообщения где userId или recipientId = userId
   */
  async getRoomMessages(
    roomId: string,
    limit: number = 100,
    userId?: string,
    includeRecipients?: boolean,
  ): Promise<Message[]> {
    // Проверяем, что комната существует
    await this.findOne(roomId);

    let query = this.db.select().from(messages).where(eq(messages.roomId, roomId));

    // Если указан userId и includeRecipients, фильтруем сообщения
    if (userId && includeRecipients) {
      query = this.db
        .select()
        .from(messages)
        .where(
          and(
            eq(messages.roomId, roomId),
            or(
              eq(messages.userId, userId), // Свои сообщения
              eq(messages.recipientId, userId), // Сообщения адресованные ему
            ),
          ),
        ) as any;
    } else if (userId) {
      // Только сообщения от этого пользователя
      query = this.db
        .select()
        .from(messages)
        .where(and(eq(messages.roomId, roomId), eq(messages.userId, userId))) as any;
    }

    return query.orderBy(desc(messages.createdAt)).limit(limit);
  }
}

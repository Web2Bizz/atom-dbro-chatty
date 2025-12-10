import { Injectable, Inject, NotFoundException, Logger } from '@nestjs/common';
import { DATABASE_CONNECTION, Database } from '../database/database.module';
import { rooms, Room, NewRoom } from '../database/schema/rooms';
import { messages, Message, NewMessage } from '../database/schema/messages';
import { eq, or, desc, asc, and, sql } from 'drizzle-orm';

@Injectable()
export class RoomsService {
  private readonly logger = new Logger(RoomsService.name);

  constructor(
    @Inject(DATABASE_CONNECTION)
    private readonly db: Database,
  ) {}

  async create(data: NewRoom): Promise<Room> {
    const roomType = data.type ?? 'normal';

    // Создаем комнату без поля type, так как колонка может отсутствовать в БД
    const insertData: any = {
      name: data.name,
      description: data.description ?? null,
      isPrivate: data.isPrivate ?? true,
      createdBy: data.createdBy ?? null,
      // type исключено, так как колонки может не быть в БД
    };

    // Добавляем id только если он явно указан
    if (data.id) {
      insertData.id = data.id;
    }

    try {
      // Пытаемся создать комнату с полем type
      const [room] = await this.db
        .insert(rooms)
        .values({
          ...insertData,
          type: roomType,
        })
        .returning();

      this.logger.log(`Room created: ${room.name} (${room.id})`);
      return room;
    } catch (error: any) {
      // Логируем структуру ошибки для диагностики
      const errorMessage = error?.message || error?.cause?.message || '';
      const isTypeColumnError =
        (errorMessage.includes('column "type"') && errorMessage.includes('does not exist')) ||
        errorMessage.includes('column type does not exist') ||
        error?.cause?.code === '42703'; // PostgreSQL error code for undefined column

      // Если ошибка связана с отсутствием колонки type, создаем без неё
      if (isTypeColumnError) {
        this.logger.warn(
          'Column "type" does not exist in database, creating room without type field',
        );

        // Используем raw SQL для insert без поля type, так как Drizzle все равно пытается его вставить
        const result = await this.db.execute(sql`
          INSERT INTO rooms (name, description, is_private, created_by, created_at, updated_at)
          VALUES (${insertData.name}, ${insertData.description}, ${insertData.isPrivate}, ${insertData.createdBy}, DEFAULT, DEFAULT)
          RETURNING id, name, description, is_private, created_by, created_at, updated_at
        `);

        // Обрабатываем результат в зависимости от формата
        const resultArray = Array.isArray(result)
          ? result
          : (result as any).rows || [(result as any)[0]];
        const roomRow = resultArray[0] as any;

        if (!roomRow) {
          throw new Error('Failed to create room: no data returned');
        }

        const room = {
          id: roomRow.id,
          name: roomRow.name,
          description: roomRow.description,
          isPrivate: roomRow.is_private ?? roomRow.isPrivate,
          createdBy: roomRow.created_by ?? roomRow.createdBy,
          createdAt: roomRow.created_at ?? roomRow.createdAt,
          updatedAt: roomRow.updated_at ?? roomRow.updatedAt,
        };

        // Добавляем type в возвращаемый объект
        const roomWithType = {
          ...room,
          type: roomType as 'normal' | 'support',
        } as Room;

        this.logger.log(`Room created: ${roomWithType.name} (${roomWithType.id})`);
        return roomWithType;
      } else {
        // Если это другая ошибка, логируем и пробрасываем её дальше
        this.logger.error(`Error creating room: ${error.message}`, error.stack);
        this.logger.debug(
          `Error structure: ${JSON.stringify(
            {
              message: error?.message,
              causeMessage: error?.cause?.message,
              cause: error?.cause,
            },
            null,
            2,
          )}`,
        );
        throw error;
      }
    }
  }

  async findAll(includePrivate: boolean = false): Promise<Room[]> {
    try {
      this.logger.debug(`Finding all rooms, includePrivate: ${includePrivate}`);

      let result: Room[];
      if (includePrivate) {
        // Возвращаем все комнаты, включая приватные
        // Используем COALESCE для обработки случая, когда колонка type может отсутствовать
        try {
          result = await this.db.select().from(rooms);
        } catch (error: any) {
          // Если ошибка связана с отсутствием колонки type, используем частичный select
          if (error?.cause?.message?.includes('column "type" does not exist')) {
            this.logger.warn('Column "type" does not exist in database, using fallback select');
            const partialResult = await this.db
              .select({
                id: rooms.id,
                name: rooms.name,
                description: rooms.description,
                isPrivate: rooms.isPrivate,
                createdBy: rooms.createdBy,
                createdAt: rooms.createdAt,
                updatedAt: rooms.updatedAt,
                type: sql<'normal' | 'support'>`'normal'`.as('type'),
              })
              .from(rooms);
            result = partialResult as Room[];
          } else {
            throw error;
          }
        }
        this.logger.debug(`Found ${result.length} rooms (including private)`);
        // Сортируем в памяти по дате создания
        result.sort((a, b) => {
          const dateA = a.createdAt instanceof Date ? a.createdAt : new Date(a.createdAt);
          const dateB = b.createdAt instanceof Date ? b.createdAt : new Date(b.createdAt);
          return dateA.getTime() - dateB.getTime();
        });
      } else {
        // Возвращаем только публичные комнаты
        try {
          result = await this.db.select().from(rooms).where(eq(rooms.isPrivate, false));
        } catch (error: any) {
          // Если ошибка связана с отсутствием колонки type, используем частичный select
          if (error?.cause?.message?.includes('column "type" does not exist')) {
            this.logger.warn('Column "type" does not exist in database, using fallback select');
            const partialResult = await this.db
              .select({
                id: rooms.id,
                name: rooms.name,
                description: rooms.description,
                isPrivate: rooms.isPrivate,
                createdBy: rooms.createdBy,
                createdAt: rooms.createdAt,
                updatedAt: rooms.updatedAt,
                type: sql<'normal' | 'support'>`'normal'`.as('type'),
              })
              .from(rooms)
              .where(eq(rooms.isPrivate, false));
            result = partialResult as Room[];
          } else {
            throw error;
          }
        }
        this.logger.debug(`Found ${result.length} public rooms`);
        // Сортируем в памяти по дате создания
        result.sort((a, b) => {
          const dateA = a.createdAt instanceof Date ? a.createdAt : new Date(a.createdAt);
          const dateB = b.createdAt instanceof Date ? b.createdAt : new Date(b.createdAt);
          return dateA.getTime() - dateB.getTime();
        });
      }

      return result;
    } catch (error) {
      this.logger.error(`Error in findAll: ${error.message}`, error.stack);
      // Логируем полную информацию об ошибке для диагностики
      if (error instanceof Error) {
        this.logger.error(
          `Error details: ${JSON.stringify(error, Object.getOwnPropertyNames(error))}`,
        );
      }
      throw error;
    }
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
    try {
      this.logger.debug(`Finding rooms for userId: ${userId}`);
      // Получаем комнаты, созданные пользователем, и все публичные комнаты
      const result = await this.db
        .select()
        .from(rooms)
        .where(or(eq(rooms.createdBy, userId), eq(rooms.isPrivate, false)))
        .orderBy(asc(rooms.createdAt));
      this.logger.debug(`Found ${result.length} rooms for userId: ${userId}`);
      return result;
    } catch (error) {
      this.logger.error(`Error in findByUserId: ${error.message}`, error.stack);
      throw error;
    }
  }

  async findByUserIdOnly(userId: string): Promise<Room[]> {
    try {
      this.logger.debug(`Finding rooms created by userId: ${userId}`);
      // Получаем только комнаты, созданные конкретным пользователем
      const result = await this.db
        .select()
        .from(rooms)
        .where(eq(rooms.createdBy, userId))
        .orderBy(asc(rooms.createdAt));
      this.logger.debug(`Found ${result.length} rooms created by userId: ${userId}`);
      return result;
    } catch (error) {
      this.logger.error(`Error in findByUserIdOnly: ${error.message}`, error.stack);
      throw error;
    }
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
    try {
      this.logger.debug(
        `Getting messages for roomId: ${roomId}, limit: ${limit}, userId: ${userId}, includeRecipients: ${includeRecipients}`,
      );
      // Проверяем, что комната существует
      await this.findOne(roomId);

      let result: Message[];

      // Если указан userId и includeRecipients, фильтруем сообщения
      if (userId && includeRecipients) {
        result = await this.db
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
          )
          .orderBy(desc(messages.createdAt))
          .limit(limit);
      } else if (userId) {
        // Только сообщения от этого пользователя
        result = await this.db
          .select()
          .from(messages)
          .where(and(eq(messages.roomId, roomId), eq(messages.userId, userId)))
          .orderBy(desc(messages.createdAt))
          .limit(limit);
      } else {
        // Все сообщения комнаты
        result = await this.db
          .select()
          .from(messages)
          .where(eq(messages.roomId, roomId))
          .orderBy(desc(messages.createdAt))
          .limit(limit);
      }

      this.logger.debug(`Found ${result.length} messages for roomId: ${roomId}`);
      return result;
    } catch (error) {
      this.logger.error(`Error in getRoomMessages: ${error.message}`, error.stack);
      throw error;
    }
  }
}

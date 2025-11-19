import { Injectable, Inject, NotFoundException } from '@nestjs/common';
import { DATABASE_CONNECTION, Database } from '../database/database.module';
import { rooms, Room, NewRoom } from '../database/schema/rooms';
import { eq } from 'drizzle-orm';

@Injectable()
export class RoomsService {
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
        isPrivate: data.isPrivate ?? false,
      })
      .returning();

    return room;
  }

  async findAll(): Promise<Room[]> {
    return this.db.select().from(rooms).orderBy(rooms.createdAt);
  }

  async findOne(id: string): Promise<Room> {
    const [room] = await this.db
      .select()
      .from(rooms)
      .where(eq(rooms.id, id))
      .limit(1);

    if (!room) {
      throw new NotFoundException(`Room with ID ${id} not found`);
    }

    return room;
  }
}


import {
  Injectable,
  Inject,
  NotFoundException,
  ConflictException,
  forwardRef,
} from '@nestjs/common'
import { eq, desc } from 'drizzle-orm'
import { DATABASE_CONNECTION } from '../database/database.module'
import { rooms } from '../database/schema'
import { NodePgDatabase } from 'drizzle-orm/node-postgres'
import { RoomMembersService } from './room-members.service'

@Injectable()
export class RoomsService {
  constructor(
    @Inject(DATABASE_CONNECTION)
    private db: NodePgDatabase<typeof import('../database/schema')>,
    @Inject(forwardRef(() => RoomMembersService))
    private roomMembersService: RoomMembersService,
  ) {}

  async create(name: string, ownerId: string, description?: string) {
    // Проверяем, существует ли комната с таким именем
    const existingRoom = await this.db
      .select()
      .from(rooms)
      .where(eq(rooms.name, name))
      .limit(1)

    if (existingRoom.length > 0) {
      throw new ConflictException('Room with this name already exists')
    }

    const [room] = await this.db
      .insert(rooms)
      .values({
        name,
        description: description || null,
        ownerId,
        isActive: true,
      })
      .returning()

    // Automatically add owner as ACTIVE member
    await this.roomMembersService.joinRoom(room.id, ownerId)

    return room
  }

  async findAll() {
    return this.db
      .select()
      .from(rooms)
      .where(eq(rooms.isActive, true))
      .orderBy(desc(rooms.createdAt))
  }

  async findById(id: string) {
    const [room] = await this.db
      .select()
      .from(rooms)
      .where(eq(rooms.id, id))
      .limit(1)

    if (!room) {
      throw new NotFoundException('Room not found')
    }

    // Get room members
    const members = await this.roomMembersService.getRoomMembers(id)

    return {
      ...room,
      members: members.map((member) => ({
        id: member.id,
        user_id: member.user_id,
        status: member.status,
        joined_in: member.joined_in,
      })),
    }
  }

  async deactivate(id: string) {
    const existingRoom = await this.findById(id)

    if (!existingRoom.isActive) {
      throw new ConflictException('Room is already deactivated')
    }

    const [room] = await this.db
      .update(rooms)
      .set({ isActive: false })
      .where(eq(rooms.id, id))
      .returning()

    return room
  }

  async findUserRooms(userId: string) {
    return this.roomMembersService.getUserRooms(userId)
  }
}

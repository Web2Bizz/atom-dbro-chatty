import {
  Injectable,
  Inject,
  NotFoundException,
  ConflictException,
  ForbiddenException,
} from '@nestjs/common'
import { eq, and, or } from 'drizzle-orm'
import { DATABASE_CONNECTION } from '../database/database.module'
import { roomMembers, rooms, users } from '../database/schema'
import { NodePgDatabase } from 'drizzle-orm/node-postgres'

@Injectable()
export class RoomMembersService {
  constructor(
    @Inject(DATABASE_CONNECTION)
    private db: NodePgDatabase<typeof import('../database/schema')>,
  ) {}

  async joinRoom(roomId: string, userId: string) {
    // Check if room exists
    const [room] = await this.db
      .select()
      .from(rooms)
      .where(eq(rooms.id, roomId))
      .limit(1)
    if (!room) {
      throw new NotFoundException('Room not found')
    }

    // Check if user is already a member
    const [existingMember] = await this.db
      .select()
      .from(roomMembers)
      .where(
        and(eq(roomMembers.roomId, roomId), eq(roomMembers.userId, userId)),
      )
      .limit(1)

    if (existingMember) {
      // If banned, update to ACTIVE; otherwise return existing member
      if (existingMember.status === 'BAN') {
        const [updated] = await this.db
          .update(roomMembers)
          .set({ status: 'ACTIVE', joinedIn: new Date() })
          .where(eq(roomMembers.id, existingMember.id))
          .returning()
        return updated
      }
      return existingMember
    }

    // Add user as member with ACTIVE status
    const [member] = await this.db
      .insert(roomMembers)
      .values({
        roomId,
        userId,
        status: 'ACTIVE',
        joinedIn: new Date(),
      })
      .returning()

    return member
  }

  async leaveRoom(roomId: string, userId: string) {
    // Check if room exists
    const [room] = await this.db
      .select()
      .from(rooms)
      .where(eq(rooms.id, roomId))
      .limit(1)
    if (!room) {
      throw new NotFoundException('Room not found')
    }

    // Remove user from members (can leave even if banned)
    const [deleted] = await this.db
      .delete(roomMembers)
      .where(
        and(eq(roomMembers.roomId, roomId), eq(roomMembers.userId, userId)),
      )
      .returning()

    if (!deleted) {
      throw new NotFoundException('User is not a member of this room')
    }

    return deleted
  }

  async banUser(roomId: string, userId: string, bannedBy: string) {
    // Check if room exists
    const [room] = await this.db
      .select()
      .from(rooms)
      .where(eq(rooms.id, roomId))
      .limit(1)
    if (!room) {
      throw new NotFoundException('Room not found')
    }

    // Check if bannedBy is the owner
    if (room.ownerId !== bannedBy) {
      throw new ForbiddenException('Only room owner can ban users')
    }

    // Check if trying to ban owner
    if (userId === room.ownerId) {
      throw new ConflictException('Cannot ban room owner')
    }

    // Check if user is a member
    const [existingMember] = await this.db
      .select()
      .from(roomMembers)
      .where(
        and(eq(roomMembers.roomId, roomId), eq(roomMembers.userId, userId)),
      )
      .limit(1)

    if (!existingMember) {
      // If not a member, add as member with BAN status
      const [member] = await this.db
        .insert(roomMembers)
        .values({
          roomId,
          userId,
          status: 'BAN',
          joinedIn: new Date(),
        })
        .returning()
      return member
    }

    // Update status to BAN
    const [updated] = await this.db
      .update(roomMembers)
      .set({ status: 'BAN' })
      .where(eq(roomMembers.id, existingMember.id))
      .returning()

    return updated
  }

  async unbanUser(roomId: string, userId: string, unbannedBy: string) {
    // Check if room exists
    const [room] = await this.db
      .select()
      .from(rooms)
      .where(eq(rooms.id, roomId))
      .limit(1)
    if (!room) {
      throw new NotFoundException('Room not found')
    }

    // Check if unbannedBy is the owner
    if (room.ownerId !== unbannedBy) {
      throw new ForbiddenException('Only room owner can unban users')
    }

    // Check if user is a member
    const [existingMember] = await this.db
      .select()
      .from(roomMembers)
      .where(
        and(eq(roomMembers.roomId, roomId), eq(roomMembers.userId, userId)),
      )
      .limit(1)

    if (!existingMember) {
      throw new NotFoundException('User is not a member of this room')
    }

    if (existingMember.status !== 'BAN') {
      throw new ConflictException('User is not banned')
    }

    // Update status to ACTIVE
    const [updated] = await this.db
      .update(roomMembers)
      .set({ status: 'ACTIVE' })
      .where(eq(roomMembers.id, existingMember.id))
      .returning()

    return updated
  }

  async getMemberStatus(
    roomId: string,
    userId: string,
  ): Promise<'ACTIVE' | 'BAN' | null> {
    const [member] = await this.db
      .select()
      .from(roomMembers)
      .where(
        and(eq(roomMembers.roomId, roomId), eq(roomMembers.userId, userId)),
      )
      .limit(1)

    return member?.status || null
  }

  async canSendMessage(roomId: string, userId: string): Promise<boolean> {
    const status = await this.getMemberStatus(roomId, userId)
    return status === 'ACTIVE'
  }

  async getRoomMembers(roomId: string) {
    // Check if room exists
    const [room] = await this.db
      .select()
      .from(rooms)
      .where(eq(rooms.id, roomId))
      .limit(1)
    if (!room) {
      throw new NotFoundException('Room not found')
    }

    return this.db
      .select({
        id: roomMembers.id,
        user_id: roomMembers.userId,
        status: roomMembers.status,
        joined_in: roomMembers.joinedIn,
      })
      .from(roomMembers)
      .where(eq(roomMembers.roomId, roomId))
  }

  async getUserRooms(userId: string) {
    // Get rooms where user is owner or member (only active rooms)
    const ownedRooms = await this.db
      .select({
        id: rooms.id,
        name: rooms.name,
        description: rooms.description,
        ownerId: rooms.ownerId,
        createdAt: rooms.createdAt,
        updatedAt: rooms.updatedAt,
        isActive: rooms.isActive,
      })
      .from(rooms)
      .where(and(eq(rooms.ownerId, userId), eq(rooms.isActive, true)))

    const memberRooms = await this.db
      .select({
        id: rooms.id,
        name: rooms.name,
        description: rooms.description,
        ownerId: rooms.ownerId,
        createdAt: rooms.createdAt,
        updatedAt: rooms.updatedAt,
        isActive: rooms.isActive,
      })
      .from(rooms)
      .innerJoin(roomMembers, eq(rooms.id, roomMembers.roomId))
      .where(and(eq(roomMembers.userId, userId), eq(rooms.isActive, true)))

    // Combine and deduplicate (user might be both owner and member)
    const roomMap = new Map()
    ;[...ownedRooms, ...memberRooms].forEach((room) => {
      roomMap.set(room.id, room)
    })

    return Array.from(roomMap.values())
  }
}

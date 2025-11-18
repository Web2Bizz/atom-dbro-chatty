import { z } from 'zod'

export const CreateRoomSchema = z
  .object({
    name: z.string().min(1).max(255).describe('Название комнаты'),
    description: z.string().max(1000).optional().describe('Описание комнаты'),
  })
  .describe('Данные для создания комнаты')

export const RoomResponseSchema = z
  .object({
    id: z.string().uuid().describe('ID комнаты'),
    name: z.string().describe('Название комнаты'),
    description: z.string().nullable().describe('Описание комнаты'),
    ownerId: z.string().uuid().describe('ID владельца комнаты'),
    createdAt: z.string().datetime().describe('Дата создания комнаты'),
    updatedAt: z.string().datetime().describe('Дата обновления комнаты'),
    isActive: z.boolean().describe('Активна ли комната'),
  })
  .describe('Информация о комнате')

export const RoomListResponseSchema = z
  .array(RoomResponseSchema)
  .describe('Список комнат')

export const RoomMemberSchema = z
  .object({
    id: z.string().uuid().describe('ID записи'),
    user_id: z.string().uuid().describe('ID пользователя'),
    status: z.enum(['ACTIVE', 'BAN']).describe('Статус участника'),
    joined_in: z.string().datetime().describe('Дата присоединения'),
  })
  .describe('Участник комнаты')

export const JoinRoomResponseSchema = RoomMemberSchema.describe(
  'Результат присоединения к комнате',
)

export const RoomWithMembersSchema = RoomResponseSchema.extend({
  members: z.array(RoomMemberSchema).optional().describe('Список участников'),
}).describe('Комната с участниками')

export const UserRoomsResponseSchema = z
  .array(RoomResponseSchema)
  .describe('Список комнат пользователя')

import { apiClient } from './client'
import type { Room, RoomMember } from '../types'

export interface CreateRoomDto {
  name: string
  description?: string
}

export const roomsApi = {
  getAll: async (): Promise<Room[]> => {
    const response =
      await apiClient.get<Room[]>('/v1/rooms')
    return response.data
  },

  getById: async (id: string): Promise<Room> => {
    const response = await apiClient.get<Room>(
      `/v1/rooms/${id}`,
    )
    return response.data
  },

  create: async (
    data: CreateRoomDto,
  ): Promise<Room> => {
    const response = await apiClient.post<Room>(
      '/v1/rooms',
      data,
    )
    return response.data
  },

  delete: async (id: string): Promise<Room> => {
    const response = await apiClient.delete<Room>(
      `/v1/rooms/${id}`,
    )
    return response.data
  },

  joinRoom: async (
    id: string,
  ): Promise<RoomMember> => {
    const response =
      await apiClient.post<RoomMember>(
        `/v1/rooms/${id}/join`,
      )
    return response.data
  },

  leaveRoom: async (
    id: string,
  ): Promise<RoomMember> => {
    const response =
      await apiClient.post<RoomMember>(
        `/v1/rooms/${id}/leave`,
      )
    return response.data
  },

  banUser: async (
    roomId: string,
    userId: string,
  ): Promise<RoomMember> => {
    const response =
      await apiClient.post<RoomMember>(
        `/v1/rooms/${roomId}/ban/${userId}`,
      )
    return response.data
  },

  unbanUser: async (
    roomId: string,
    userId: string,
  ): Promise<RoomMember> => {
    const response =
      await apiClient.post<RoomMember>(
        `/v1/rooms/${roomId}/unban/${userId}`,
      )
    return response.data
  },

  getMyRooms: async (): Promise<Room[]> => {
    const response = await apiClient.get<Room[]>(
      '/v2/rooms/my',
    )
    return response.data
  },
}

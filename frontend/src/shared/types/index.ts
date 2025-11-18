export interface User {
  id: string
  email: string
  username: string
}

export interface AuthResponse {
  access_token: string
  refresh_token: string
  user: User
}

export interface LoginDto {
  email: string
  password: string
}

export interface RegisterDto {
  email: string
  username: string
  password: string
}

export interface RoomMember {
  id: string
  user_id: string
  status: 'ACTIVE' | 'BAN'
  joined_in: string
}

export interface Room {
  id: string
  name: string
  description?: string
  ownerId: string
  active: boolean
  createdAt: string
  members?: RoomMember[]
}

export interface Message {
  from: string
  data: any
  timestamp: string
}

export interface SocketMessage {
  text: string
  room?: string
  userId?: string
  username?: string
}

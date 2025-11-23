export interface User {
  id: string
  username: string
}

export interface Room {
  id: string
  name: string
  description?: string
  isPrivate?: boolean
  createdAt?: string
  updatedAt?: string
}

export interface Message {
  id: string | number
  username?: string
  message: string
  timestamp: string
  type: 'user' | 'system'
}

export interface LoginResponse {
  accessToken: string
  refreshToken: string
  user: User
}

export interface RegisterResponse {
  accessToken: string
  refreshToken: string
  user: User
}

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
  payload?: Record<string, unknown>
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

export interface ApiKey {
  id: string
  name?: string
  key?: string // Только при создании
  userId?: string
  lastUsedAt?: string
  createdAt: string
  expiresAt?: string
  isActive: boolean
  scopes?: string[]
}

export interface CreateApiKeyRequest {
  name?: string
  expiresInDays?: number
  scopes?: string[]
}

export interface CreateApiKeyResponse {
  id: string
  key: string
  name?: string
  createdAt: string
  expiresAt?: string
  scopes?: string[]
  userId?: string
}

import { apiClient } from './client'
import type {
  AuthResponse,
  LoginDto,
  RegisterDto,
} from '../types'

export const authApi = {
  login: async (
    data: LoginDto,
  ): Promise<AuthResponse> => {
    const response =
      await apiClient.post<AuthResponse>(
        '/v1/auth/login',
        data,
      )
    return response.data
  },

  register: async (
    data: RegisterDto,
  ): Promise<AuthResponse> => {
    const response =
      await apiClient.post<AuthResponse>(
        '/v1/auth/register',
        data,
      )
    return response.data
  },

  refresh: async (
    refreshToken: string,
  ): Promise<{ access_token: string }> => {
    const response = await apiClient.post<{
      access_token: string
    }>('/v1/auth/refresh', {
      refresh_token: refreshToken,
    })
    return response.data
  },

  logout: async (
    refreshToken: string,
  ): Promise<void> => {
    await apiClient.post('/v1/auth/logout', {
      refresh_token: refreshToken,
    })
  },
}

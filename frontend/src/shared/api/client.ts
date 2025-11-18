import axios from 'axios'

const API_URL =
  import.meta.env.VITE_API_URL ||
  'http://localhost:3000'

export const apiClient = axios.create({
  baseURL: `${API_URL}/api`,
  headers: {
    'Content-Type': 'application/json',
  },
})

// Добавляем токен к запросам
apiClient.interceptors.request.use((config) => {
  const token = localStorage.getItem(
    'access_token',
  )
  if (token) {
    config.headers.Authorization = `Bearer ${token}`
  }
  return config
})

// Обрабатываем ошибки авторизации
apiClient.interceptors.response.use(
  (response) => response,
  async (error) => {
    if (error.response?.status === 401) {
      const refreshToken = localStorage.getItem(
        'refresh_token',
      )
      if (refreshToken) {
        try {
          const response = await axios.post(
            `${API_URL}/api/v1/auth/refresh`,
            {
              refresh_token: refreshToken,
            },
          )
          const { access_token } = response.data
          localStorage.setItem(
            'access_token',
            access_token,
          )
          error.config.headers.Authorization = `Bearer ${access_token}`
          return apiClient.request(error.config)
        } catch (refreshError) {
          localStorage.removeItem('access_token')
          localStorage.removeItem('refresh_token')
          localStorage.removeItem('user')
          window.location.href = '/login'
        }
      }
    }
    return Promise.reject(error)
  },
)

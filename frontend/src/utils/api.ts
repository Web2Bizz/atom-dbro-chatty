const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:3000/api/v1'

// Функция для очистки данных авторизации
export function clearAuthData(): void {
  localStorage.removeItem('user')
  localStorage.removeItem('accessToken')
  localStorage.removeItem('refreshToken')
}

// Функция для перенаправления на страницу входа
export function redirectToLogin(): void {
  clearAuthData()
  // Используем window.location для полной перезагрузки страницы
  // Это гарантирует, что все состояние будет сброшено
  if (window.location.pathname !== '/login') {
    window.location.href = '/login'
  }
}

/**
 * Выполняет fetch запрос с автоматической обработкой ошибок авторизации
 */
export async function apiRequest(
  url: string,
  options: RequestInit = {},
): Promise<Response> {
  const token = localStorage.getItem('accessToken')

  const defaultHeaders: HeadersInit = {
    'Content-Type': 'application/json',
  }

  if (token) {
    defaultHeaders['Authorization'] = `Bearer ${token}`
  }

  const response = await fetch(`${API_URL}${url}`, {
    ...options,
    headers: {
      ...defaultHeaders,
      ...options.headers,
    },
  })

  // Если токен просрочен или невалидный, перенаправляем на страницу входа
  if (response.status === 401) {
    redirectToLogin()
    throw new Error('Unauthorized')
  }

  return response
}

/**
 * Выполняет fetch запрос и парсит JSON ответ
 */
export async function apiRequestJson<T = unknown>(
  url: string,
  options: RequestInit = {},
): Promise<T> {
  const response = await apiRequest(url, options)

  // Проверяем, что ответ успешный
  if (!response.ok) {
    const errorText = await response.text()
    let errorMessage = `HTTP error! status: ${response.status}`
    try {
      const errorJson = JSON.parse(errorText)
      errorMessage = errorJson.message || errorJson.error || errorMessage
    } catch {
      errorMessage = errorText || errorMessage
    }
    throw new Error(errorMessage)
  }

  // Проверяем, что есть контент для парсинга
  const contentType = response.headers.get('content-type')
  if (!contentType || !contentType.includes('application/json')) {
    const text = await response.text()
    throw new Error(
      `Expected JSON but got: ${contentType || 'no content-type'}. Response: ${text.substring(0, 100)}`,
    )
  }

  return response.json()
}

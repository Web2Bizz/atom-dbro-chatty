import { useState } from 'react'
import { useForm } from 'react-hook-form'
import './LoginForm.css'
import { User, LoginResponse, RegisterResponse } from '../types'

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:3000/api/v1'

interface LoginFormProps {
  onLogin: (user: User) => void
}

interface FormData {
  username: string
  password: string
}

function LoginForm({ onLogin }: LoginFormProps) {
  const [isRegister, setIsRegister] = useState(false)
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)

  const {
    register,
    handleSubmit,
    formState: { errors },
    reset,
  } = useForm<FormData>()

  const onSubmit = async (data: FormData) => {
    setError('')
    setLoading(true)

    const trimmedUsername = data.username.trim()
    const trimmedPassword = data.password.trim()

    if (isRegister) {
      // Регистрация
      try {
        const response = await fetch(`${API_URL}/auth/register`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            username: trimmedUsername,
            password: trimmedPassword,
          }),
        })

        const responseData: RegisterResponse & { message?: string } =
          await response.json()

        if (!response.ok) {
          setError(responseData.message || 'Ошибка регистрации')
          setLoading(false)
          return
        }

        // После успешной регистрации автоматически логинимся
        const loginResponse = await fetch(`${API_URL}/auth/login`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            username: trimmedUsername,
            password: trimmedPassword,
          }),
        })

        const loginData: LoginResponse & { message?: string } =
          await loginResponse.json()

        if (!loginResponse.ok) {
          setError(
            'Регистрация успешна, но не удалось войти. Попробуйте войти вручную.',
          )
          setLoading(false)
          setIsRegister(false)
          reset()
          return
        }

        // Сохраняем токены
        localStorage.setItem('accessToken', loginData.accessToken)
        localStorage.setItem('refreshToken', loginData.refreshToken)
        localStorage.setItem('user', JSON.stringify(loginData.user))

        setLoading(false)
        onLogin(loginData.user)
      } catch (err) {
        setError('Ошибка подключения к серверу')
        setLoading(false)
      }
    } else {
      // Вход
      try {
        const response = await fetch(`${API_URL}/auth/login`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            username: trimmedUsername,
            password: trimmedPassword,
          }),
        })

        const responseData: LoginResponse & { message?: string } =
          await response.json()

        if (!response.ok) {
          setError(
            responseData.message ||
              'Ошибка входа. Проверьте имя пользователя и пароль.',
          )
          setLoading(false)
          return
        }

        // Сохраняем токены
        localStorage.setItem('accessToken', responseData.accessToken)
        localStorage.setItem('refreshToken', responseData.refreshToken)
        localStorage.setItem('user', JSON.stringify(responseData.user))

        setLoading(false)
        onLogin(responseData.user)
      } catch (err) {
        setError('Ошибка подключения к серверу')
        setLoading(false)
      }
    }
  }

  return (
    <div className='login-container'>
      <div className='login-card'>
        <h1>Chatty</h1>
        <p className='subtitle'>
          {isRegister ? 'Создайте аккаунт' : 'Добро пожаловать в чат!'}
        </p>
        <form onSubmit={handleSubmit(onSubmit)} className='login-form'>
          {isRegister ? (
            <>
              <div className='input-group'>
                <input
                  type='text'
                  placeholder='Введите имя пользователя'
                  {...register('username', {
                    required: 'Пожалуйста, введите имя пользователя',
                    minLength: {
                      value: 3,
                      message:
                        'Имя пользователя должно быть не менее 3 символов',
                    },
                    maxLength: {
                      value: 100,
                      message:
                        'Имя пользователя должно быть не более 100 символов',
                    },
                  })}
                  className={errors.username || error ? 'input-error' : ''}
                  autoFocus
                  disabled={loading}
                />
                {errors.username && (
                  <span className='error-message'>
                    {errors.username.message}
                  </span>
                )}
              </div>
              <div className='input-group'>
                <input
                  type='password'
                  placeholder='Введите пароль (минимум 6 символов)'
                  {...register('password', {
                    required: 'Пожалуйста, введите пароль',
                    minLength: {
                      value: 6,
                      message: 'Пароль должен быть не менее 6 символов',
                    },
                  })}
                  className={errors.password || error ? 'input-error' : ''}
                  disabled={loading}
                />
                {errors.password && (
                  <span className='error-message'>
                    {errors.password.message}
                  </span>
                )}
                {error && !errors.password && (
                  <span className='error-message'>{error}</span>
                )}
              </div>
              <button type='submit' className='login-button' disabled={loading}>
                {loading ? 'Регистрация...' : 'Зарегистрироваться'}
              </button>
              <button
                type='button'
                onClick={() => {
                  setIsRegister(false)
                  setError('')
                  reset()
                }}
                className='switch-button'
                disabled={loading}
              >
                Уже есть аккаунт? Войти
              </button>
            </>
          ) : (
            <>
              <div className='input-group'>
                <input
                  type='text'
                  placeholder='Введите имя пользователя'
                  {...register('username', {
                    required: 'Пожалуйста, введите имя пользователя',
                    minLength: {
                      value: 3,
                      message:
                        'Имя пользователя должно быть не менее 3 символов',
                    },
                    maxLength: {
                      value: 100,
                      message:
                        'Имя пользователя должно быть не более 100 символов',
                    },
                  })}
                  className={errors.username || error ? 'input-error' : ''}
                  autoFocus
                  disabled={loading}
                />
                {errors.username && (
                  <span className='error-message'>
                    {errors.username.message}
                  </span>
                )}
              </div>
              <div className='input-group'>
                <input
                  type='password'
                  placeholder='Введите пароль'
                  {...register('password', {
                    required: 'Пожалуйста, введите пароль',
                    minLength: {
                      value: 6,
                      message: 'Пароль должен быть не менее 6 символов',
                    },
                  })}
                  className={errors.password || error ? 'input-error' : ''}
                  disabled={loading}
                />
                {errors.password && (
                  <span className='error-message'>
                    {errors.password.message}
                  </span>
                )}
                {error && !errors.password && (
                  <span className='error-message'>{error}</span>
                )}
              </div>
              <button type='submit' className='login-button' disabled={loading}>
                {loading ? 'Вход...' : 'Войти в чат'}
              </button>
              <button
                type='button'
                onClick={() => {
                  setIsRegister(true)
                  setError('')
                  reset()
                }}
                className='switch-button'
                disabled={loading}
              >
                Нет аккаунта? Зарегистрироваться
              </button>
            </>
          )}
        </form>
      </div>
    </div>
  )
}

export default LoginForm

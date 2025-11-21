import { useState } from 'react'
import './LoginForm.css'

function LoginForm({ onLogin }) {
  const [username, setUsername] = useState('')
  const [error, setError] = useState('')

  const handleSubmit = (e) => {
    e.preventDefault()
    const trimmedUsername = username.trim()

    if (!trimmedUsername) {
      setError('Пожалуйста, введите имя пользователя')
      return
    }

    if (trimmedUsername.length < 3) {
      setError('Имя пользователя должно быть не менее 3 символов')
      return
    }

    setError('')
    onLogin(trimmedUsername)
  }

  return (
    <div className='login-container'>
      <div className='login-card'>
        <h1>Chatty</h1>
        <p className='subtitle'>Добро пожаловать в чат!</p>
        <form onSubmit={handleSubmit} className='login-form'>
          <div className='input-group'>
            <input
              type='text'
              placeholder='Введите ваше имя'
              value={username}
              onChange={(e) => {
                setUsername(e.target.value)
                setError('')
              }}
              className={error ? 'input-error' : ''}
              autoFocus
            />
            {error && <span className='error-message'>{error}</span>}
          </div>
          <button type='submit' className='login-button'>
            Войти в чат
          </button>
        </form>
      </div>
    </div>
  )
}

export default LoginForm

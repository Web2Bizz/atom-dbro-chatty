import { useState, useRef, useEffect } from 'react'
import './MessageInput.css'

function MessageInput({ onSendMessage, disabled }) {
  const [message, setMessage] = useState('')
  const inputRef = useRef(null)

  useEffect(() => {
    // Фокус на инпут при загрузке
    inputRef.current?.focus()
  }, [])

  const handleSubmit = (e) => {
    e.preventDefault()
    if (message.trim() && !disabled) {
      onSendMessage(message)
      setMessage('')
      inputRef.current?.focus()
    }
  }

  const handleKeyPress = (e) => {
    // Отправка по Enter, но не Shift+Enter
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault()
      handleSubmit(e)
    }
  }

  return (
    <div className='message-input-container'>
      <form onSubmit={handleSubmit} className='message-input-form'>
        <input
          ref={inputRef}
          type='text'
          value={message}
          onChange={(e) => setMessage(e.target.value)}
          onKeyPress={handleKeyPress}
          placeholder={disabled ? 'Подключение...' : 'Введите сообщение...'}
          disabled={disabled}
          className='message-input'
        />
        <button
          type='submit'
          disabled={disabled || !message.trim()}
          className='send-button'
        >
          <svg
            width='20'
            height='20'
            viewBox='0 0 24 24'
            fill='none'
            stroke='currentColor'
            strokeWidth='2'
            strokeLinecap='round'
            strokeLinejoin='round'
          >
            <line x1='22' y1='2' x2='11' y2='13'></line>
            <polygon points='22 2 15 22 11 13 2 9 22 2'></polygon>
          </svg>
        </button>
      </form>
    </div>
  )
}

export default MessageInput

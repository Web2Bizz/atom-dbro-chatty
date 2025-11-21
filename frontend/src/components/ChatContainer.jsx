import { useState, useEffect, useRef } from 'react'
import MessageList from './MessageList'
import MessageInput from './MessageInput'
import ChatHeader from './ChatHeader'
import './ChatContainer.css'

function ChatContainer({ socket, username, isConnected, onLogout }) {
  const [messages, setMessages] = useState([])
  const [users, setUsers] = useState([])
  const messagesEndRef = useRef(null)

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }

  useEffect(() => {
    scrollToBottom()
  }, [messages])

  useEffect(() => {
    if (!socket) return

    // Получение новых сообщений
    socket.on('message', (data) => {
      setMessages((prev) => [
        ...prev,
        {
          id: Date.now() + Math.random(),
          username: data.username,
          message: data.message,
          timestamp: data.timestamp || new Date().toISOString(),
          type: 'user',
        },
      ])
    })

    // Получение системных сообщений
    socket.on('system', (data) => {
      setMessages((prev) => [
        ...prev,
        {
          id: Date.now() + Math.random(),
          message: data.message,
          timestamp: data.timestamp || new Date().toISOString(),
          type: 'system',
        },
      ])
    })

    // Получение списка пользователей
    socket.on('users', (data) => {
      setUsers(data.users || [])
    })

    // Получение истории сообщений при подключении
    socket.on('messageHistory', (data) => {
      if (data.messages && Array.isArray(data.messages)) {
        setMessages(data.messages)
      }
    })

    return () => {
      socket.off('message')
      socket.off('system')
      socket.off('users')
      socket.off('messageHistory')
    }
  }, [socket])

  const handleSendMessage = (message) => {
    if (socket && message.trim()) {
      socket.emit('message', {
        username,
        message: message.trim(),
        timestamp: new Date().toISOString(),
      })
    }
  }

  return (
    <div className='chat-container'>
      <ChatHeader
        username={username}
        users={users}
        isConnected={isConnected}
        onLogout={onLogout}
      />
      <MessageList messages={messages} currentUsername={username} />
      <div ref={messagesEndRef} />
      <MessageInput onSendMessage={handleSendMessage} disabled={!isConnected} />
    </div>
  )
}

export default ChatContainer

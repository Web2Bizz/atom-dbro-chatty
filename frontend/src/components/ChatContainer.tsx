import { useState, useEffect, useRef } from 'react'
import { Socket } from 'socket.io-client'
import MessageList from './MessageList'
import MessageInput from './MessageInput'
import ChatHeader from './ChatHeader'
import { apiRequestJson } from '../utils/api'
import './ChatContainer.css'
import { Room, Message } from '../types'

interface ChatContainerProps {
  socket: Socket | null
  username: string
  isConnected: boolean
  onLogout: () => void
  room: Room | null
  onBack: () => void
}

interface MessageHistoryItem {
  id: string
  username: string
  content: string
  createdAt: string
}

function ChatContainer({
  socket,
  username,
  isConnected,
  onLogout,
  room,
  onBack,
}: ChatContainerProps) {
  const [messages, setMessages] = useState<Message[]>([])
  const [users, setUsers] = useState<string[]>([])
  const messagesEndRef = useRef<HTMLDivElement>(null)

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }

  useEffect(() => {
    scrollToBottom()
  }, [messages])

  // Загружаем историю сообщений при входе в комнату
  useEffect(() => {
    if (!room?.id) return

    const loadMessageHistory = async () => {
      try {
        const history = await apiRequestJson<MessageHistoryItem[]>(
          `/rooms/${room.id}/messages`,
        )
        // Преобразуем формат сообщений из БД в формат для UI
        const formattedMessages: Message[] = history.map((msg) => ({
          id: msg.id,
          username: msg.username,
          message: msg.content,
          timestamp: msg.createdAt,
          type: 'user' as const,
        }))
        setMessages(formattedMessages)
      } catch (error) {
        console.error('Failed to load message history:', error)
        // Не показываем ошибку пользователю, просто продолжаем без истории
      }
    }

    loadMessageHistory()
  }, [room?.id])

  useEffect(() => {
    if (!socket) return

    // Получение новых сообщений
    socket.on(
      'message',
      (data: { username: string; message: string; timestamp?: string }) => {
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
      },
    )

    // Получение системных сообщений
    socket.on('system', (data: { message: string; timestamp?: string }) => {
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
    socket.on('users', (data: { users?: string[] }) => {
      setUsers(data.users || [])
    })

    // Получение истории сообщений при подключении
    socket.on('messageHistory', (data: { messages?: Message[] }) => {
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

  const handleSendMessage = (message: string) => {
    if (socket && message.trim() && room?.id) {
      socket.emit('message', {
        username,
        message: message.trim(),
        room: room.id,
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
        room={room}
        onBack={onBack}
      />
      <MessageList messages={messages} currentUsername={username} />
      <div ref={messagesEndRef} />
      <MessageInput onSendMessage={handleSendMessage} disabled={!isConnected} />
    </div>
  )
}

export default ChatContainer

import { useState, useEffect } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { io, Socket } from 'socket.io-client'
import ChatContainer from '../components/ChatContainer'
import { apiRequestJson } from '../utils/api'
import './RoomPage.css'
import { User, Room } from '../types'

const SOCKET_URL = import.meta.env.VITE_SERVER_URL || 'http://localhost:4000'

function RoomPage() {
  const navigate = useNavigate()
  const { roomId } = useParams<{ roomId: string }>()
  const [socket, setSocket] = useState<Socket | null>(null)
  const [user, setUser] = useState<User | null>(null)
  const [room, setRoom] = useState<Room | null>(null)
  const [isConnected, setIsConnected] = useState(false)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    // Проверяем, есть ли сохраненный пользователь
    const savedUser = localStorage.getItem('user')
    if (savedUser) {
      try {
        setUser(JSON.parse(savedUser))
      } catch (e) {
        localStorage.removeItem('user')
        localStorage.removeItem('accessToken')
        localStorage.removeItem('refreshToken')
        navigate('/login')
        return
      }
    }

    // Загружаем информацию о комнате
    const loadRoom = async () => {
      if (!roomId) {
        setLoading(false)
        navigate('/')
        return
      }

      try {
        const roomData = await apiRequestJson<Room>(`/rooms/${roomId}`)
        setRoom(roomData)
      } catch (err) {
        if (err instanceof Error && err.message === 'Unauthorized') {
          // Перенаправление уже выполнено в apiRequest
          return
        }
        console.error('Failed to load room:', err)
        navigate('/')
      } finally {
        setLoading(false)
      }
    }

    loadRoom()

    // Инициализация socket
    const newSocket = io(SOCKET_URL, {
      transports: ['websocket', 'polling'],
      reconnection: true,
      reconnectionDelay: 1000,
      reconnectionAttempts: 5,
    })

    newSocket.on('connect', () => {
      console.log('Connected to server')
      setIsConnected(true)
    })

    newSocket.on('disconnect', () => {
      console.log('Disconnected from server')
      setIsConnected(false)
    })

    setSocket(newSocket)

    return () => {
      if (roomId) {
        newSocket.emit('leave-room', { room: roomId })
      }
      newSocket.close()
    }
  }, [roomId, navigate])

  // Присоединяемся к комнате когда socket подключен и room загружен
  useEffect(() => {
    if (socket && isConnected && roomId) {
      socket.emit('join-room', { room: roomId })
    }
  }, [socket, isConnected, roomId])

  const handleLogout = () => {
    if (socket) {
      socket.emit('leave', { username: user?.username })
      socket.disconnect()
    }
    localStorage.removeItem('user')
    localStorage.removeItem('accessToken')
    localStorage.removeItem('refreshToken')
    navigate('/login')
  }

  const handleBack = () => {
    navigate('/')
  }

  if (loading || !user || !room) {
    return (
      <div className='room-page-loading'>
        <div>Загрузка...</div>
      </div>
    )
  }

  return (
    <div className='room-page'>
      <div className='app'>
        <ChatContainer
          socket={socket}
          username={user.username}
          isConnected={isConnected}
          onLogout={handleLogout}
          room={room}
          onBack={handleBack}
        />
      </div>
    </div>
  )
}

export default RoomPage

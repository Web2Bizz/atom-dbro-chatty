import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import './ChatList.css'
import CreateRoomModal from './CreateRoomModal'
import { apiRequestJson } from '../utils/api'
import { User, Room } from '../types'
import { getSocket } from '../utils/socket'

interface ChatListProps {
  user: User
  onSelectRoom: (room: Room) => void
  onLogout: () => void
}

function ChatList({ user, onSelectRoom, onLogout }: ChatListProps) {
  const navigate = useNavigate()
  const [rooms, setRooms] = useState<Room[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false)

  useEffect(() => {
    fetchRooms()
  }, [user])

  useEffect(() => {
    // Подписываемся на события создания комнат через WebSocket
    const socket = getSocket()

    const handleRoomCreated = (data: { room: Room; timestamp: string }) => {
      console.log('Room created event received:', data.room)
      // Добавляем новую комнату в список независимо от типа (normal/support) и приватности
      // Внешнее приложение само решает, показывать ли комнату пользователю
      setRooms((prevRooms) => {
        const exists = prevRooms.some((r) => r.id === data.room.id)
        if (exists) {
          return prevRooms
        }
        // Добавляем новую комнату в начало списка
        return [data.room, ...prevRooms]
      })
    }

    const handleRoomsUpdated = async () => {
      console.log('Rooms updated event received, refreshing list...')
      // Обновляем список комнат
      try {
        const data = await apiRequestJson<Room[]>('/rooms/my')
        if (Array.isArray(data)) {
          setRooms(data)
          setError('')
        } else {
          console.error('Expected array but got:', data)
          setRooms([])
          setError('Неверный формат данных от сервера')
        }
      } catch (err) {
        if (err instanceof Error && err.message === 'Unauthorized') {
          return
        }
        console.error('Error fetching rooms:', err)
      }
    }

    socket.on('room-created', handleRoomCreated)
    socket.on('rooms-updated', handleRoomsUpdated)

    return () => {
      socket.off('room-created', handleRoomCreated)
      socket.off('rooms-updated', handleRoomsUpdated)
    }
  }, [])

  const fetchRooms = async () => {
    setError('')
    setLoading(true)
    try {
      const data = await apiRequestJson<Room[]>('/rooms/my')
      // Убеждаемся, что data - это массив
      if (Array.isArray(data)) {
        setRooms(data)
        setError('')
      } else {
        console.error('Expected array but got:', data)
        setRooms([])
        setError('Неверный формат данных от сервера')
      }
    } catch (err) {
      if (err instanceof Error && err.message === 'Unauthorized') {
        // Перенаправление уже выполнено в apiRequest
        return
      }
      console.error('Error fetching rooms:', err)
      const errorMessage =
        err instanceof Error ? err.message : 'Неизвестная ошибка'
      setError(`Не удалось загрузить список чатов: ${errorMessage}`)
      setRooms([])
    } finally {
      setLoading(false)
    }
  }

  const handleRoomCreated = (newRoom: Room) => {
    setRooms((prevRooms) => [newRoom, ...prevRooms])
    setLoading(false)
  }

  if (loading) {
    return (
      <div className='chat-list-container'>
        <div className='chat-list-header'>
          <h2>Мои чаты</h2>
          <button onClick={onLogout} className='logout-button'>
            Выйти
          </button>
        </div>
        <div className='loading'>Загрузка...</div>
      </div>
    )
  }

  if (error) {
    return (
      <div className='chat-list-container'>
        <div className='chat-list-header'>
          <h2>Мои чаты</h2>
          <button onClick={onLogout} className='logout-button'>
            Выйти
          </button>
        </div>
        <div className='error'>{error}</div>
      </div>
    )
  }

  return (
    <>
      <div className='chat-list-container'>
        <div className='chat-list-header'>
          <h2>Мои чаты</h2>
          <button onClick={onLogout} className='logout-button'>
            Выйти
          </button>
        </div>
        <div className='user-info'>
          <p>Пользователь: {user?.username}</p>
        </div>
        <div className='create-room-section'>
          <button
            onClick={() => setIsCreateModalOpen(true)}
            className='create-room-button'
          >
            + Создать чат
          </button>
          <button
            onClick={() => navigate('/api-keys')}
            className='api-keys-button'
          >
            🔑 API Токены
          </button>
        </div>
        <div className='rooms-list'>
          {!Array.isArray(rooms) || rooms.length === 0 ? (
            <div className='no-rooms'>У вас пока нет чатов</div>
          ) : (
            rooms.map((room) => (
              <div
                key={room.id}
                className='room-item'
                onClick={() => onSelectRoom(room)}
              >
                <div className='room-name'>{room.name}</div>
                {room.description && (
                  <div className='room-description'>{room.description}</div>
                )}
                <div className='room-meta'>
                  {room.isPrivate ? '🔒 Приватный' : '🌐 Публичный'}
                </div>
              </div>
            ))
          )}
        </div>
      </div>
      <CreateRoomModal
        isOpen={isCreateModalOpen}
        onClose={() => setIsCreateModalOpen(false)}
        onRoomCreated={handleRoomCreated}
      />
    </>
  )
}

export default ChatList

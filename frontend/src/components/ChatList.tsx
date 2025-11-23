import { useState, useEffect } from 'react'
import './ChatList.css'
import CreateRoomModal from './CreateRoomModal'
import { apiRequestJson } from '../utils/api'
import { User, Room } from '../types'

interface ChatListProps {
  user: User
  onSelectRoom: (room: Room) => void
  onLogout: () => void
}

function ChatList({ user, onSelectRoom, onLogout }: ChatListProps) {
  const [rooms, setRooms] = useState<Room[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false)

  useEffect(() => {
    fetchRooms()
  }, [user])

  const fetchRooms = async () => {
    try {
      const data = await apiRequestJson<Room[]>('/rooms/my')
      setRooms(data)
      setLoading(false)
    } catch (err) {
      if (err instanceof Error && err.message === 'Unauthorized') {
        // Перенаправление уже выполнено в apiRequest
        return
      }
      setError('Не удалось загрузить список чатов')
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
        </div>
        <div className='rooms-list'>
          {rooms.length === 0 ? (
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

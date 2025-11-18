import { useEffect, useState } from 'react'
import { roomsApi } from '../../../shared/api/rooms'
import type { Room } from '../../../shared/types'

interface RoomListProps {
  onSelectRoom: (room: Room) => void
  selectedRoomId?: string
}

export const RoomList = ({
  onSelectRoom,
  selectedRoomId,
}: RoomListProps) => {
  const [rooms, setRooms] = useState<Room[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState('')
  const [showCreateForm, setShowCreateForm] =
    useState(false)
  const [roomName, setRoomName] = useState('')
  const [roomDescription, setRoomDescription] =
    useState('')

  useEffect(() => {
    loadRooms()
  }, [])

  const loadRooms = async () => {
    try {
      setIsLoading(true)
      const data = await roomsApi.getMyRooms()
      setRooms(data)
      setError('')
    } catch (err: any) {
      setError('Ошибка загрузки комнат')
      console.error('Error loading rooms:', err)
    } finally {
      setIsLoading(false)
    }
  }

  const handleCreateRoom = async (
    e: React.FormEvent,
  ) => {
    e.preventDefault()
    try {
      const newRoom = await roomsApi.create({
        name: roomName,
        description: roomDescription || undefined,
      })
      // Перезагружаем список комнат, чтобы получить актуальные данные
      await loadRooms()
      setRoomName('')
      setRoomDescription('')
      setShowCreateForm(false)
      // Перенаправляем на созданную комнату
      // handleSelectRoom автоматически обновит URL и загрузит комнату
      onSelectRoom(newRoom)
    } catch (err: any) {
      setError(
        err.response?.data?.message ||
          'Ошибка создания комнаты',
      )
    }
  }

  return (
    <div style={styles.container}>
      <div style={styles.header}>
        <h3 style={styles.title}>Комнаты</h3>
        <button
          onClick={() =>
            setShowCreateForm(!showCreateForm)
          }
          style={styles.createButton}
        >
          {showCreateForm ? 'Отмена' : '+'}
        </button>
      </div>

      {showCreateForm && (
        <form
          onSubmit={handleCreateRoom}
          style={styles.createForm}
        >
          <input
            type='text'
            value={roomName}
            onChange={(e) =>
              setRoomName(e.target.value)
            }
            placeholder='Название комнаты'
            required
            style={styles.input}
          />
          <textarea
            value={roomDescription}
            onChange={(e) =>
              setRoomDescription(e.target.value)
            }
            placeholder='Описание (необязательно)'
            style={styles.textarea}
          />
          <button
            type='submit'
            style={styles.submitButton}
          >
            Создать
          </button>
        </form>
      )}

      {error && (
        <div style={styles.error}>{error}</div>
      )}

      {isLoading ? (
        <div style={styles.loading}>
          Загрузка...
        </div>
      ) : (
        <div style={styles.list}>
          {rooms.length === 0 ? (
            <div style={styles.empty}>
              Нет доступных комнат
            </div>
          ) : (
            rooms.map((room) => (
              <div
                key={room.id}
                onClick={() => onSelectRoom(room)}
                style={{
                  ...styles.roomItem,
                  ...(selectedRoomId === room.id
                    ? styles.selectedRoom
                    : {}),
                }}
              >
                <div style={styles.roomName}>
                  {room.name}
                </div>
                {room.description && (
                  <div
                    style={styles.roomDescription}
                  >
                    {room.description}
                  </div>
                )}
              </div>
            ))
          )}
        </div>
      )}
    </div>
  )
}

const styles: {
  [key: string]: React.CSSProperties
} = {
  container: {
    width: '300px',
    backgroundColor: '#f8f9fa',
    borderRight: '1px solid #dee2e6',
    display: 'flex',
    flexDirection: 'column',
    height: '100vh',
  },
  header: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: '20px',
    borderBottom: '1px solid #dee2e6',
  },
  title: {
    margin: 0,
    fontSize: '18px',
    color: '#333',
  },
  createButton: {
    width: '32px',
    height: '32px',
    borderRadius: '50%',
    border: 'none',
    backgroundColor: '#007bff',
    color: 'white',
    fontSize: '20px',
    cursor: 'pointer',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
  },
  createForm: {
    padding: '15px',
    borderBottom: '1px solid #dee2e6',
    display: 'flex',
    flexDirection: 'column',
    gap: '10px',
  },
  input: {
    padding: '8px',
    border: '1px solid #ddd',
    borderRadius: '4px',
    fontSize: '14px',
  },
  textarea: {
    padding: '8px',
    border: '1px solid #ddd',
    borderRadius: '4px',
    fontSize: '14px',
    resize: 'vertical',
    minHeight: '60px',
  },
  submitButton: {
    padding: '8px',
    backgroundColor: '#28a745',
    color: 'white',
    border: 'none',
    borderRadius: '4px',
    cursor: 'pointer',
    fontSize: '14px',
  },
  error: {
    padding: '10px 15px',
    backgroundColor: '#fee',
    color: '#c33',
    fontSize: '14px',
  },
  loading: {
    padding: '20px',
    textAlign: 'center',
    color: '#666',
  },
  list: {
    flex: 1,
    overflowY: 'auto',
  },
  roomItem: {
    padding: '15px 20px',
    borderBottom: '1px solid #dee2e6',
    cursor: 'pointer',
    transition: 'background-color 0.2s',
  },
  selectedRoom: {
    backgroundColor: '#e7f3ff',
    borderLeft: '3px solid #007bff',
  },
  roomName: {
    fontSize: '16px',
    color: '#333',
    fontWeight: '500',
    marginBottom: '4px',
  },
  roomDescription: {
    fontSize: '14px',
    color: '#666',
  },
  empty: {
    padding: '20px',
    textAlign: 'center',
    color: '#999',
  },
}

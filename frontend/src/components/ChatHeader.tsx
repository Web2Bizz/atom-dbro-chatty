import './ChatHeader.css'
import { Room } from '../types'

interface ChatHeaderProps {
  username: string
  users: string[]
  isConnected: boolean
  onLogout: () => void
  room: Room | null
  onBack?: () => void
}

function ChatHeader({
  username,
  users,
  isConnected,
  onLogout,
  room,
  onBack,
}: ChatHeaderProps) {
  return (
    <div className='chat-header'>
      <div className='header-left'>
        {onBack && (
          <button onClick={onBack} className='back-button'>
            ← Назад
          </button>
        )}
        <h2>{room ? room.name : 'Chatty'}</h2>
        <div className='connection-status'>
          <span
            className={`status-dot ${isConnected ? 'connected' : 'disconnected'}`}
          ></span>
          <span>{isConnected ? 'Подключено' : 'Отключено'}</span>
        </div>
      </div>
      <div className='header-right'>
        <div className='user-info'>
          <span className='username'>{username}</span>
          <span className='users-count'>
            {users.length > 0 ? `${users.length} в сети` : ''}
          </span>
        </div>
        <button onClick={onLogout} className='logout-button'>
          Выйти
        </button>
      </div>
    </div>
  )
}

export default ChatHeader

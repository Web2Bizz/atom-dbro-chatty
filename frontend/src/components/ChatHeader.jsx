import './ChatHeader.css'

function ChatHeader({ username, users, isConnected, onLogout }) {
  return (
    <div className='chat-header'>
      <div className='header-left'>
        <h2>Chatty</h2>
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

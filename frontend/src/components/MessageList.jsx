import './MessageList.css'

function MessageList({ messages, currentUsername }) {
  const formatTime = (timestamp) => {
    if (!timestamp) return ''
    const date = new Date(timestamp)
    return date.toLocaleTimeString('ru-RU', {
      hour: '2-digit',
      minute: '2-digit',
    })
  }

  return (
    <div className='message-list'>
      {messages.length === 0 ? (
        <div className='empty-state'>
          <p>Нет сообщений. Начните общение!</p>
        </div>
      ) : (
        messages.map((msg) => {
          if (msg.type === 'system') {
            return (
              <div key={msg.id} className='message system-message'>
                <span className='system-text'>{msg.message}</span>
                <span className='message-time'>
                  {formatTime(msg.timestamp)}
                </span>
              </div>
            )
          }

          const isOwn = msg.username === currentUsername

          return (
            <div
              key={msg.id}
              className={`message ${isOwn ? 'own-message' : 'other-message'}`}
            >
              {!isOwn && <div className='message-username'>{msg.username}</div>}
              <div className='message-content'>
                <div className='message-text'>{msg.message}</div>
                <div className='message-time'>{formatTime(msg.timestamp)}</div>
              </div>
            </div>
          )
        })
      )}
    </div>
  )
}

export default MessageList

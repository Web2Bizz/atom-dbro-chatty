import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import ChatList from '../components/ChatList'
import './ChatsPage.css'
import { User } from '../types'

function ChatsPage() {
  const navigate = useNavigate()
  const [user, setUser] = useState<User | null>(null)

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
      }
    }
  }, [navigate])

  const handleSelectRoom = (room: { id: string }) => {
    navigate(`/room/${room.id}`)
  }

  const handleLogout = () => {
    localStorage.removeItem('user')
    localStorage.removeItem('accessToken')
    localStorage.removeItem('refreshToken')
    navigate('/login')
  }

  if (!user) {
    return null
  }

  return (
    <div className='chats-page'>
      <div className='chats-layout'>
        <ChatList
          user={user}
          onSelectRoom={handleSelectRoom}
          onLogout={handleLogout}
        />
        <div className='welcome-message'>
          <h2>Добро пожаловать, {user.username}!</h2>
          <p>Выберите чат из списка слева, чтобы начать общение.</p>
        </div>
      </div>
    </div>
  )
}

export default ChatsPage

import { useState, useEffect } from 'react'
import { io } from 'socket.io-client'
import './App.css'
import ChatContainer from './components/ChatContainer'
import LoginForm from './components/LoginForm'

const SOCKET_URL = import.meta.env.VITE_SOCKET_URL || 'http://localhost:4000'

function App() {
  const [socket, setSocket] = useState(null)
  const [username, setUsername] = useState('')
  const [isConnected, setIsConnected] = useState(false)

  useEffect(() => {
    // Инициализация socket при монтировании
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
      newSocket.close()
    }
  }, [])

  const handleLogin = (user) => {
    setUsername(user)
    if (socket) {
      socket.emit('join', { username: user })
    }
  }

  const handleLogout = () => {
    if (socket) {
      socket.emit('leave', { username })
      socket.disconnect()
    }
    setUsername('')
    setIsConnected(false)
    // Переподключение
    const newSocket = io(SOCKET_URL, {
      transports: ['websocket', 'polling'],
      reconnection: true,
    })
    setSocket(newSocket)
  }

  if (!username) {
    return <LoginForm onLogin={handleLogin} />
  }

  return (
    <div className='app'>
      <ChatContainer
        socket={socket}
        username={username}
        isConnected={isConnected}
        onLogout={handleLogout}
      />
    </div>
  )
}

export default App

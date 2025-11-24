import { io, Socket } from 'socket.io-client'

// Socket подключается к тому же серверу, что и REST API
const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:3000/api/v1'
const SOCKET_URL = import.meta.env.VITE_SOCKET_URL || import.meta.env.VITE_SERVER_URL || API_URL.replace('/api/v1', '')

let socketInstance: Socket | null = null

export function getSocket(): Socket {
  if (!socketInstance) {
    const token = localStorage.getItem('accessToken')
    
    socketInstance = io(SOCKET_URL, {
      transports: ['websocket', 'polling'],
      reconnection: true,
      reconnectionDelay: 1000,
      reconnectionAttempts: 5,
      auth: token ? { token } : {},
      query: token ? { token } : {},
    })

    socketInstance.on('connect', () => {
      console.log('Socket connected for room updates')
    })

    socketInstance.on('disconnect', () => {
      console.log('Socket disconnected')
    })
  }
  
  return socketInstance
}

export function disconnectSocket() {
  if (socketInstance) {
    socketInstance.disconnect()
    socketInstance = null
  }
}

export function reconnectSocket() {
  disconnectSocket()
  return getSocket()
}


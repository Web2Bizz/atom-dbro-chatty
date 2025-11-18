import {
  useEffect,
  useRef,
  useState,
  useCallback,
} from 'react'
import { io, Socket } from 'socket.io-client'
import type { Message } from '../../types'

const SOCKET_URL =
  import.meta.env.VITE_SOCKET_URL ||
  'http://localhost:3000'

export const useSocket = (token?: string) => {
  const socketRef = useRef<Socket | null>(null)
  const [isConnected, setIsConnected] =
    useState(false)
  const [messages, setMessages] = useState<
    Message[]
  >([])

  useEffect(() => {
    if (!token) return

    const socket = io(SOCKET_URL, {
      auth: {
        token,
      },
      transports: ['websocket', 'polling'],
    })

    socketRef.current = socket

    socket.on('connect', () => {
      setIsConnected(true)
      console.log('Connected to server')
    })

    socket.on('disconnect', () => {
      setIsConnected(false)
      console.log('Disconnected from server')
    })

    socket.on('message', (data: Message) => {
      setMessages((prev) => [...prev, data])
    })

    socket.on(
      'user-joined',
      (data: { clientId: string }) => {
        console.log('User joined:', data)
      },
    )

    socket.on(
      'user-left',
      (data: { clientId: string }) => {
        console.log('User left:', data)
      },
    )

    socket.on(
      'user-joined-room',
      (data: {
        userId: string
        clientId: string
        roomId: string
      }) => {
        console.log('User joined room:', data)
      },
    )

    socket.on(
      'user-left-room',
      (data: {
        userId: string
        clientId: string
        roomId: string
      }) => {
        console.log('User left room:', data)
      },
    )

    socket.on(
      'user-banned',
      (data: {
        userId: string
        roomId: string
      }) => {
        console.log('User banned:', data)
      },
    )

    socket.on(
      'room-joined',
      (data: { roomId: string }) => {
        console.log('Room joined:', data)
      },
    )

    socket.on(
      'error',
      (data: { message: string }) => {
        console.error('Socket error:', data)
      },
    )

    return () => {
      socket.disconnect()
    }
  }, [token])

  const sendMessage = useCallback(
    (data: {
      roomId: string
      content: string
      [key: string]: any
    }) => {
      if (socketRef.current && isConnected) {
        socketRef.current.emit('message', {
          ...data,
          roomId: data.roomId,
        })
      }
    },
    [isConnected],
  )

  const joinRoom = useCallback(
    (room: string) => {
      if (socketRef.current && isConnected) {
        socketRef.current.emit('join-room', room)
      }
    },
    [isConnected],
  )

  const leaveRoom = useCallback(
    (room: string) => {
      if (socketRef.current && isConnected) {
        socketRef.current.emit('leave-room', room)
      }
    },
    [isConnected],
  )

  const joinRoomMember = useCallback(
    (roomId: string) => {
      if (socketRef.current && isConnected) {
        socketRef.current.emit(
          'join-room-member',
          { roomId },
        )
      }
    },
    [isConnected],
  )

  const clearMessages = useCallback(() => {
    setMessages([])
  }, [])

  return {
    isConnected,
    messages,
    sendMessage,
    joinRoom,
    leaveRoom,
    joinRoomMember,
    clearMessages,
  }
}

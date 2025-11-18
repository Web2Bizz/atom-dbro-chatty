import {
  useLayoutEffect,
  useRef,
  useState,
} from 'react'
import { RouterApp } from '@routes'
import {
  SocketContext,
  ConnectionStatus,
} from '@contexts'
import { io, Socket } from 'socket.io-client'
import { ThemeWrapper } from '@layouts'
import { library } from '@fortawesome/fontawesome-svg-core'
import { fas } from '@fortawesome/free-solid-svg-icons'
import './../themes/default/main.css'

library.add(fas)

function App() {
  const socketRef = useRef<Socket>()
  const [status, setStatus] =
    useState<ConnectionStatus>(
      ConnectionStatus.CLOSED,
    )

  const data = {
    socket: null,
    status,
    setStatus,
  }

  useLayoutEffect(() => {
    socketRef.current = io(
      import.meta.env.VITE_CHAT_DOMAIN,
    )

    if (socketRef.current === undefined) return

    socketRef.current?.on('connection', () => {
      setStatus(ConnectionStatus.WAITING)
    })

    socketRef.current?.on('connect', () => {
      setStatus(ConnectionStatus.CONNECTED)
    })

    socketRef.current?.on('connect_error', () => {
      setStatus(ConnectionStatus.ERROR)
    })

    socketRef.current?.on('disconnect', () => {
      setStatus(ConnectionStatus.CLOSED)
    })
  }, [])

  return (
    <SocketContext.Provider value={data}>
      <ThemeWrapper>
        <RouterApp />
      </ThemeWrapper>
    </SocketContext.Provider>
  )
}

export default App

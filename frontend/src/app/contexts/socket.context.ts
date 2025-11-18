import { createContext } from 'react'
import { Socket } from 'socket.io-client'

export type TSocketContext = {
  status: ConnectionStatus
  socket?: Socket
  setStatus: (value: ConnectionStatus) => null
}

export enum ConnectionStatus {
  CONNECTED,
  RECONNECT,
  CLOSED,
  ERROR,
  WAITING,
}

const SocketContext =
  createContext<TSocketContext>({
    status: ConnectionStatus.CLOSED,
    socket: null,
    setStatus: () => null,
  })

export default SocketContext

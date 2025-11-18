import {
  WebSocketGateway,
  WebSocketServer,
  SubscribeMessage,
  OnGatewayConnection,
  OnGatewayDisconnect,
  ConnectedSocket,
  MessageBody,
} from '@nestjs/websockets'
import {
  Logger,
  UnauthorizedException,
  ForbiddenException,
} from '@nestjs/common'
import { Server, Socket } from 'socket.io'
import { JwtService } from '@nestjs/jwt'
import { ConfigService } from '../config/config.service'
import { RoomMembersService } from '../rooms/room-members.service'

@WebSocketGateway({
  cors: {
    origin: '*',
    credentials: true,
  },
  namespace: '/',
})
export class SocketGateway implements OnGatewayConnection, OnGatewayDisconnect {
  @WebSocketServer()
  server: Server

  private readonly logger = new Logger(SocketGateway.name)

  constructor(
    private jwtService: JwtService,
    private configService: ConfigService,
    private roomMembersService: RoomMembersService,
  ) {}

  async handleConnection(client: Socket) {
    try {
      const token =
        client.handshake.auth?.token ||
        client.handshake.headers?.authorization?.split(' ')[1]

      if (token) {
        const payload = await this.jwtService.verifyAsync(token, {
          secret: this.configService.jwt.secret,
        })
        client.data.userId = payload.sub
        client.data.email = payload.email
        this.logger.log(
          `Client connected: ${client.id} (User: ${payload.email})`,
        )
      } else {
        this.logger.log(`Client connected: ${client.id} (Unauthenticated)`)
      }
    } catch (error) {
      const errorMessage = error.message?.toLowerCase() || ''
      if (
        errorMessage.includes('jwt expired') ||
        errorMessage.includes('token expired')
      ) {
        this.logger.warn(
          `Client connection error: ${client.id} - ${error.message}`,
        )
      } else {
        this.logger.error(
          `Client connection error: ${client.id}`,
          error.message,
        )
      }
    }
  }

  handleDisconnect(client: Socket) {
    this.logger.log(`Client disconnected: ${client.id}`)
  }

  @SubscribeMessage('message')
  async handleMessage(
    @ConnectedSocket() client: Socket,
    @MessageBody() data: any,
  ) {
    if (!client.data.userId) {
      throw new UnauthorizedException('User not authenticated')
    }

    const { roomId } = data
    if (!roomId) {
      this.logger.warn(`Message from ${client.id} missing roomId`)
      return
    }

    // Validate user can send messages (must be ACTIVE member)
    const canSend = await this.roomMembersService.canSendMessage(
      roomId,
      client.data.userId,
    )
    if (!canSend) {
      this.logger.warn(
        `User ${client.data.userId} cannot send message to room ${roomId} - not an ACTIVE member`,
      )
      client.emit('error', {
        message:
          'You cannot send messages to this room. You may be banned or not a member.',
      })
      return
    }

    this.logger.log(
      `Message from ${client.id} to room ${roomId}: ${JSON.stringify(data)}`,
    )
    this.server.to(roomId).emit('message', {
      from: client.id,
      userId: client.data.userId,
      data,
      timestamp: new Date().toISOString(),
    })
  }

  @SubscribeMessage('join-room')
  handleJoinRoom(
    @ConnectedSocket() client: Socket,
    @MessageBody() room: string,
  ) {
    client.join(room)
    this.logger.log(`Client ${client.id} joined room: ${room}`)
    client.to(room).emit('user-joined', { clientId: client.id })
  }

  @SubscribeMessage('leave-room')
  handleLeaveRoom(
    @ConnectedSocket() client: Socket,
    @MessageBody() room: string,
  ) {
    client.leave(room)
    this.logger.log(`Client ${client.id} left room: ${room}`)
    client.to(room).emit('user-left', { clientId: client.id })
  }

  @SubscribeMessage('join-room-member')
  async handleJoinRoomMember(
    @ConnectedSocket() client: Socket,
    @MessageBody() data: { roomId: string },
  ) {
    if (!client.data.userId) {
      throw new UnauthorizedException('User not authenticated')
    }

    const { roomId } = data
    if (!roomId) {
      this.logger.warn(`join-room-member from ${client.id} missing roomId`)
      return
    }

    try {
      // Join room as member (becomes participant)
      await this.roomMembersService.joinRoom(roomId, client.data.userId)

      // Join socket room for real-time updates
      client.join(roomId)

      this.logger.log(
        `Client ${client.id} (User: ${client.data.userId}) joined room as member: ${roomId}`,
      )

      // Emit to others in the room
      client.to(roomId).emit('user-joined-room', {
        userId: client.data.userId,
        clientId: client.id,
        roomId,
      })

      // Confirm to client
      client.emit('room-joined', { roomId })
    } catch (error) {
      this.logger.error(
        `Error joining room ${roomId} as member: ${error.message}`,
      )
      client.emit('error', { message: error.message || 'Failed to join room' })
    }
  }
}

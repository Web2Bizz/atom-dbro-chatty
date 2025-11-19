import {
  WebSocketGateway,
  WebSocketServer,
  SubscribeMessage,
  OnGatewayConnection,
  OnGatewayDisconnect,
  MessageBody,
  ConnectedSocket,
} from '@nestjs/websockets';
import { Server, Socket } from 'socket.io';
import { Logger } from '@nestjs/common';
import { z } from 'zod';

const MessageSchema = z.object({
  content: z.string().min(1).max(1000),
  room: z.string().optional(),
});

@WebSocketGateway({
  cors: {
    origin: '*',
    credentials: true,
  },
  namespace: '/',
})
export class SocketGateway implements OnGatewayConnection, OnGatewayDisconnect {
  @WebSocketServer()
  server: Server;

  private logger: Logger = new Logger('SocketGateway');

  handleConnection(client: Socket) {
    this.logger.log(`Client connected: ${client.id}`);
  }

  handleDisconnect(client: Socket) {
    this.logger.log(`Client disconnected: ${client.id}`);
  }

  @SubscribeMessage('message')
  handleMessage(@MessageBody() data: unknown, @ConnectedSocket() client: Socket) {
    try {
      const parsed = MessageSchema.parse(data);
      this.logger.log(`Message received from ${client.id}: ${parsed.content}`);

      // Broadcast to all clients or specific room
      if (parsed.room) {
        this.server.to(parsed.room).emit('message', {
          content: parsed.content,
          from: client.id,
          timestamp: new Date().toISOString(),
        });
      } else {
        this.server.emit('message', {
          content: parsed.content,
          from: client.id,
          timestamp: new Date().toISOString(),
        });
      }
    } catch (error) {
      this.logger.error('Invalid message format', error);
      client.emit('error', { message: 'Invalid message format' });
    }
  }

  @SubscribeMessage('join-room')
  handleJoinRoom(@MessageBody() data: { room: string }, @ConnectedSocket() client: Socket) {
    const roomSchema = z.object({ room: z.string() });
    try {
      const parsed = roomSchema.parse(data);
      client.join(parsed.room);
      this.logger.log(`Client ${client.id} joined room: ${parsed.room}`);
      client.emit('joined-room', { room: parsed.room });
    } catch (error) {
      this.logger.error('Invalid room data', error);
      client.emit('error', { message: 'Invalid room data' });
    }
  }

  @SubscribeMessage('leave-room')
  handleLeaveRoom(@MessageBody() data: { room: string }, @ConnectedSocket() client: Socket) {
    const roomSchema = z.object({ room: z.string() });
    try {
      const parsed = roomSchema.parse(data);
      client.leave(parsed.room);
      this.logger.log(`Client ${client.id} left room: ${parsed.room}`);
      client.emit('left-room', { room: parsed.room });
    } catch (error) {
      this.logger.error('Invalid room data', error);
      client.emit('error', { message: 'Invalid room data' });
    }
  }
}

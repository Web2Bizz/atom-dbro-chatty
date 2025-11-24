import {
  WebSocketGateway,
  WebSocketServer,
  SubscribeMessage,
  OnGatewayConnection,
  OnGatewayDisconnect,
  MessageBody,
  ConnectedSocket,
  OnGatewayInit,
} from '@nestjs/websockets';
import { Server, Socket } from 'socket.io';
import { Logger, Injectable, Inject, forwardRef } from '@nestjs/common';
import { z } from 'zod';
import { AuthService } from '../auth/auth.service';
import { JwtService } from '@nestjs/jwt';
import { ConfigService } from '@nestjs/config';
import { RoomsService } from '../rooms/rooms.service';

const MessageSchema = z.object({
  content: z.string().min(1).max(1000),
  room: z.string().optional(),
});

interface AuthenticatedSocket extends Socket {
  userId?: string;
  apiKeyId?: string;
  authType?: 'user' | 'api-key';
  username?: string;
}

@WebSocketGateway({
  cors: {
    origin: '*',
    credentials: true,
  },
  namespace: '/',
})
@Injectable()
export class SocketGateway implements OnGatewayConnection, OnGatewayDisconnect, OnGatewayInit {
  @WebSocketServer()
  server: Server;

  private logger: Logger = new Logger('SocketGateway');
  private connectedClients = new Map<
    string,
    {
      userId?: string;
      apiKeyId?: string;
      username?: string;
      authType?: 'user' | 'api-key';
    }
  >();

  constructor(
    private authService: AuthService,
    private jwtService: JwtService,
    private configService: ConfigService,
    @Inject(forwardRef(() => RoomsService))
    private roomsService: RoomsService,
  ) {}

  afterInit(server: Server) {
    // Middleware для аутентификации при подключении
    server.use(async (socket: AuthenticatedSocket, next) => {
      try {
        // Проверяем токен в query параметрах или auth объекте
        const token = socket.handshake.auth?.token || (socket.handshake.query?.token as string);
        const apiKey = socket.handshake.auth?.apiKey || (socket.handshake.query?.apiKey as string);

        if (token) {
          // Проверяем JWT токен пользователя
          try {
            const payload = this.jwtService.verify(token, {
              secret: this.configService.get<string>('JWT_SECRET') || 'your-secret-key',
            });

            if (payload.type === 'access' && payload.sub) {
              socket.userId = payload.sub;
              socket.username = payload.username;
              socket.authType = 'user';
              this.logger.log(
                `User authenticated via JWT: ${payload.username || payload.sub} (${socket.id})`,
              );
              return next();
            }
          } catch (error) {
            this.logger.warn(`Invalid JWT token for socket ${socket.id}: ${error.message}`);
          }
        }

        if (apiKey) {
          // Проверяем API ключ
          const validatedKey = await this.authService.validateApiKey(apiKey);
          if (validatedKey) {
            socket.apiKeyId = validatedKey.id;
            socket.userId = validatedKey.userId || undefined;
            socket.authType = 'api-key';
            this.logger.log(`API key authenticated: ${validatedKey.id} (${socket.id})`);
            return next();
          }
        }

        // Если нет токена, разрешаем подключение без аутентификации (для обратной совместимости)
        this.logger.log(`Client connected without authentication: ${socket.id}`);
        return next();
      } catch (error) {
        this.logger.error(`Authentication error for socket ${socket.id}:`, error);
        return next();
      }
    });
  }

  handleConnection(client: AuthenticatedSocket) {
    const clientInfo = {
      userId: client.userId,
      apiKeyId: client.apiKeyId,
      username: client.username,
      authType: client.authType,
    };

    this.connectedClients.set(client.id, clientInfo);

    if (client.authType === 'user') {
      this.logger.log(
        `Authenticated user connected: ${client.username || client.userId} (${client.id})`,
      );
      client.emit('authenticated', {
        type: 'user',
        userId: client.userId,
        username: client.username,
      });
    } else if (client.authType === 'api-key') {
      this.logger.log(`Authenticated API key connected: ${client.apiKeyId} (${client.id})`);
      client.emit('authenticated', {
        type: 'api-key',
        apiKeyId: client.apiKeyId,
        userId: client.userId,
      });
    } else {
      this.logger.log(`Client connected: ${client.id} (unauthenticated)`);
      client.emit('warning', {
        message: 'Connection established without authentication. Some features may be limited.',
      });
    }
  }

  handleDisconnect(client: AuthenticatedSocket) {
    const clientInfo = this.connectedClients.get(client.id);
    if (clientInfo?.authType === 'user') {
      this.logger.log(
        `Authenticated user disconnected: ${clientInfo.username || clientInfo.userId} (${client.id})`,
      );
    } else if (clientInfo?.authType === 'api-key') {
      this.logger.log(`Authenticated API key disconnected: ${clientInfo.apiKeyId} (${client.id})`);
    } else {
      this.logger.log(`Client disconnected: ${client.id}`);
    }
    this.connectedClients.delete(client.id);
  }

  @SubscribeMessage('message')
  async handleMessage(
    @MessageBody() data: unknown,
    @ConnectedSocket() client: AuthenticatedSocket,
  ) {
    try {
      // Поддерживаем оба формата для обратной совместимости
      const messageData = typeof data === 'object' && data !== null ? data : {};

      // Новый формат (из фронтенда)
      if ('message' in messageData && typeof (messageData as any).message === 'string') {
        const parsed = z
          .object({
            message: z.string().min(1).max(1000),
            username: z.string().optional(),
            room: z.string().optional(),
            recipientId: z.string().uuid().optional().nullable(), // ID получателя (передается от внешнего приложения)
          })
          .parse(messageData);

        const clientInfo = this.connectedClients.get(client.id);
        const username =
          parsed.username || clientInfo?.username || clientInfo?.apiKeyId || client.id;

        // Сохраняем сообщение в БД, если указана комната
        if (parsed.room) {
          try {
            // Внешнее приложение само решает, кому адресовать сообщение
            // Микросервис просто сохраняет recipientId как есть
            const savedMessage = await this.roomsService.createMessage({
              roomId: parsed.room,
              userId: clientInfo?.userId || null,
              recipientId: parsed.recipientId || null,
              username,
              content: parsed.message,
            });

            const messagePayload = {
              id: savedMessage.id,
              username,
              message: parsed.message,
              timestamp: savedMessage.createdAt.toISOString(),
              recipientId: savedMessage.recipientId,
              userId: savedMessage.userId,
              authType: clientInfo?.authType,
            };

            // Отправляем сообщение всем в комнате
            // Внешнее приложение само фильтрует, кто должен видеть сообщение
            this.server.to(parsed.room).emit('message', messagePayload);

            this.logger.log(
              `Message in room "${parsed.room}" from ${username} (${client.id}) to ${parsed.recipientId || 'all'}: ${parsed.message}`,
            );
          } catch (error) {
            this.logger.error(`Failed to save message to database: ${error.message}`, error.stack);
            client.emit('error', { message: 'Failed to send message' });
          }
        } else {
          const messagePayload = {
            username,
            message: parsed.message,
            timestamp: new Date().toISOString(),
            authType: clientInfo?.authType,
          };
          this.server.emit('message', messagePayload);
          this.logger.log(`Message from ${username} (${client.id}): ${parsed.message}`);
        }
        return;
      }

      // Старый формат (для обратной совместимости)
      const parsed = MessageSchema.parse(messageData);
      const clientInfo = this.connectedClients.get(client.id);
      const from = clientInfo?.username || clientInfo?.apiKeyId || client.id;

      // Сохраняем сообщение в БД, если указана комната
      if (parsed.room) {
        try {
          const savedMessage = await this.roomsService.createMessage({
            roomId: parsed.room,
            userId: clientInfo?.userId || null,
            recipientId: null, // Старый формат не поддерживает recipientId
            username: from,
            content: parsed.content,
          });

          const messagePayload = {
            id: savedMessage.id,
            content: parsed.content,
            from,
            timestamp: savedMessage.createdAt.toISOString(),
            recipientId: savedMessage.recipientId,
            userId: savedMessage.userId,
            authType: clientInfo?.authType,
          };

          this.server.to(parsed.room).emit('message', messagePayload);
          this.logger.log(
            `Message in room "${parsed.room}" from ${from} (${client.id}): ${parsed.content}`,
          );
        } catch (error) {
          this.logger.error(`Failed to save message to database: ${error.message}`, error.stack);
          client.emit('error', { message: 'Failed to send message' });
        }
      } else {
        const messagePayload = {
          content: parsed.content,
          from,
          timestamp: new Date().toISOString(),
          authType: clientInfo?.authType,
        };
        this.server.emit('message', messagePayload);
        this.logger.log(`Message from ${from} (${client.id}): ${parsed.content}`);
      }
    } catch (error) {
      this.logger.error('Invalid message format', error);
      client.emit('error', { message: 'Invalid message format' });
    }
  }

  @SubscribeMessage('join')
  handleJoin(
    @MessageBody() data: { username?: string },
    @ConnectedSocket() client: AuthenticatedSocket,
  ) {
    try {
      const clientInfo = this.connectedClients.get(client.id);
      const username = data?.username || clientInfo?.username || clientInfo?.apiKeyId || client.id;

      // Обновляем информацию о клиенте
      if (username && !clientInfo?.username) {
        this.connectedClients.set(client.id, { ...clientInfo, username });
      }

      this.server.emit('system', {
        message: `${username} присоединился к чату`,
        timestamp: new Date().toISOString(),
      });

      this.logger.log(`User joined: ${username} (${client.id})`);
      client.emit('joined', { username });
    } catch (error) {
      this.logger.error('Invalid join data', error);
      client.emit('error', { message: 'Invalid join data' });
    }
  }

  @SubscribeMessage('leave')
  handleLeave(
    @MessageBody() data: { username?: string },
    @ConnectedSocket() client: AuthenticatedSocket,
  ) {
    try {
      const clientInfo = this.connectedClients.get(client.id);
      const username = data?.username || clientInfo?.username || clientInfo?.apiKeyId || client.id;

      this.server.emit('system', {
        message: `${username} покинул чат`,
        timestamp: new Date().toISOString(),
      });

      this.logger.log(`User left: ${username} (${client.id})`);
    } catch (error) {
      this.logger.error('Invalid leave data', error);
      client.emit('error', { message: 'Invalid leave data' });
    }
  }

  @SubscribeMessage('join-room')
  handleJoinRoom(
    @MessageBody() data: { room: string },
    @ConnectedSocket() client: AuthenticatedSocket,
  ) {
    const roomSchema = z.object({ room: z.string() });
    try {
      const parsed = roomSchema.parse(data);
      const clientInfo = this.connectedClients.get(client.id);
      const username = clientInfo?.username || clientInfo?.apiKeyId || client.id;

      client.join(parsed.room);
      this.logger.log(`Client ${username} (${client.id}) joined room: ${parsed.room}`);

      this.server.to(parsed.room).emit('system', {
        message: `${username} присоединился к комнате "${parsed.room}"`,
        timestamp: new Date().toISOString(),
      });

      client.emit('joined-room', { room: parsed.room });
    } catch (error) {
      this.logger.error('Invalid room data', error);
      client.emit('error', { message: 'Invalid room data' });
    }
  }

  @SubscribeMessage('leave-room')
  handleLeaveRoom(
    @MessageBody() data: { room: string },
    @ConnectedSocket() client: AuthenticatedSocket,
  ) {
    const roomSchema = z.object({ room: z.string() });
    try {
      const parsed = roomSchema.parse(data);
      const clientInfo = this.connectedClients.get(client.id);
      const username = clientInfo?.username || clientInfo?.apiKeyId || client.id;

      client.leave(parsed.room);
      this.logger.log(`Client ${username} (${client.id}) left room: ${parsed.room}`);

      this.server.to(parsed.room).emit('system', {
        message: `${username} покинул комнату "${parsed.room}"`,
        timestamp: new Date().toISOString(),
      });

      client.emit('left-room', { room: parsed.room });
    } catch (error) {
      this.logger.error('Invalid room data', error);
      client.emit('error', { message: 'Invalid room data' });
    }
  }

  // Метод для получения списка подключенных пользователей
  @SubscribeMessage('get-users')
  handleGetUsers(@ConnectedSocket() client: AuthenticatedSocket) {
    const users = Array.from(this.connectedClients.values())
      .filter((info) => info.username || info.userId || info.apiKeyId)
      .map((info) => ({
        username: info.username || info.userId || info.apiKeyId,
        authType: info.authType,
      }));

    client.emit('users', { users });
  }

  /**
   * Отправляет событие о создании новой комнаты всем подключенным клиентам
   * Работает для всех типов комнат (normal, support) независимо от приватности
   */
  emitRoomCreated(room: any) {
    this.server.emit('room-created', {
      room,
      timestamp: new Date().toISOString(),
    });
    this.logger.log(
      `Room created event emitted: ${room.name} (${room.id}) [type: ${room.type || 'normal'}, private: ${room.isPrivate || false}]`,
    );
  }

  /**
   * Отправляет событие об обновлении списка комнат всем подключенным клиентам
   */
  emitRoomsUpdated() {
    this.server.emit('rooms-updated', {
      timestamp: new Date().toISOString(),
    });
    this.logger.log('Rooms updated event emitted');
  }
}

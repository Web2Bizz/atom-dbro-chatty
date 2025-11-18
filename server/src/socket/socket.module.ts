import { Module } from '@nestjs/common'
import { SocketGateway } from './socket.gateway'
import { ConfigModule } from '../config/config.module'
import { JwtModule } from '@nestjs/jwt'
import { ConfigService } from '../config/config.service'
import { RoomsModule } from '../rooms/rooms.module'

@Module({
  imports: [
    ConfigModule,
    RoomsModule,
    JwtModule.registerAsync({
      imports: [ConfigModule],
      inject: [ConfigService],
      useFactory: (configService: ConfigService) => ({
        secret: configService.jwt.secret,
        signOptions: {
          expiresIn: configService.jwt.accessTokenLife,
        },
      }),
    }),
  ],
  providers: [SocketGateway],
  exports: [SocketGateway],
})
export class SocketModule {}

import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { DatabaseModule } from '../database/database.module';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { SocketModule } from '../socket/socket.module';
import { UsersModule } from '../users/users.module';
import { AuthModule } from '../auth/auth.module';
import { RoomsModule } from '../rooms/rooms.module';

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
      envFilePath: '.env',
    }),
    DatabaseModule,
    SocketModule,
    UsersModule,
    AuthModule,
    RoomsModule,
  ],
  controllers: [AppController],
  providers: [AppService],
})
export class AppModule {}


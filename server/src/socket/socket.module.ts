import { Module, forwardRef } from '@nestjs/common';
import { SocketGateway } from './socket.gateway';
import { AuthModule } from '../auth/auth.module';
import { RoomsModule } from '../rooms/rooms.module';

@Module({
  imports: [AuthModule, forwardRef(() => RoomsModule)],
  providers: [SocketGateway],
  exports: [SocketGateway],
})
export class SocketModule {}

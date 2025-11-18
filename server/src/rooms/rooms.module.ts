import { Module } from '@nestjs/common'
import { RoomsService } from './rooms.service'
import { RoomsController } from './rooms.controller'
import { RoomMembersService } from './room-members.service'
import { DatabaseModule } from '../database/database.module'
import { AuthModule } from '../auth/auth.module'

@Module({
  imports: [DatabaseModule, AuthModule],
  providers: [RoomsService, RoomMembersService],
  controllers: [RoomsController],
  exports: [RoomsService, RoomMembersService],
})
export class RoomsModule {}

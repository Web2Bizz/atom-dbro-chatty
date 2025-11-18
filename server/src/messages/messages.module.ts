import { Module, forwardRef } from '@nestjs/common'
import { MessagesService } from './messages.service'
import { MessagesController } from './messages.controller'
import { DatabaseModule } from '../database/database.module'
import { AuthModule } from '../auth/auth.module'
import { RoomsModule } from '../rooms/rooms.module'

@Module({
  imports: [DatabaseModule, AuthModule, forwardRef(() => RoomsModule)],
  providers: [MessagesService],
  controllers: [MessagesController],
  exports: [MessagesService],
})
export class MessagesModule {}

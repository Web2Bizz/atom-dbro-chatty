import {
  Controller,
  Post,
  Body,
  HttpCode,
  HttpStatus,
  Get,
  Delete,
  Param,
  UseGuards,
  Request,
  Version,
} from '@nestjs/common'
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiBody,
  ApiBearerAuth,
} from '@nestjs/swagger'
import { AuthGuard } from '@nestjs/passport'
import { RoomsService } from './rooms.service'
import { RoomMembersService } from './room-members.service'
import { CreateRoomDto } from './dto/create-room.dto'
import {
  CreateRoomSchema,
  RoomResponseSchema,
  RoomListResponseSchema,
  JoinRoomResponseSchema,
  UserRoomsResponseSchema,
} from './schemas/rooms.schemas'
import { zodToSwaggerSchema } from '../common/utils/zod-to-swagger.util'

@ApiTags('rooms')
@Controller('rooms')
export class RoomsController {
  constructor(
    private roomsService: RoomsService,
    private roomMembersService: RoomMembersService,
  ) {}

  @Post()
  @UseGuards(AuthGuard('jwt'))
  @HttpCode(HttpStatus.CREATED)
  @ApiBearerAuth('JWT-auth')
  @ApiOperation({ summary: 'Создать новую комнату' })
  @ApiBody({
    schema: zodToSwaggerSchema(CreateRoomSchema),
  })
  @ApiResponse({
    status: 201,
    description: 'Комната успешно создана',
    schema: zodToSwaggerSchema(RoomResponseSchema),
  })
  @ApiResponse({
    status: 400,
    description: 'Неверные данные для создания комнаты',
  })
  @ApiResponse({
    status: 401,
    description: 'Не авторизован',
  })
  @ApiResponse({
    status: 409,
    description: 'Комната с таким именем уже существует',
  })
  async create(@Body() createRoomDto: CreateRoomDto, @Request() req) {
    const ownerId = req.user.userId
    const room = await this.roomsService.create(
      createRoomDto.name,
      ownerId,
      createRoomDto.description,
    )
    return room
  }

  @Get()
  @ApiOperation({ summary: 'Получить список всех активных комнат' })
  @ApiResponse({
    status: 200,
    description: 'Список комнат',
    schema: zodToSwaggerSchema(RoomListResponseSchema),
  })
  async findAll() {
    return this.roomsService.findAll()
  }

  @Get(':id')
  @ApiOperation({ summary: 'Получить комнату по ID' })
  @ApiResponse({
    status: 200,
    description: 'Информация о комнате',
    schema: zodToSwaggerSchema(RoomResponseSchema),
  })
  @ApiResponse({
    status: 404,
    description: 'Комната не найдена',
  })
  async findOne(@Param('id') id: string) {
    return this.roomsService.findById(id)
  }

  @Delete(':id')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Деактивировать комнату' })
  @ApiResponse({
    status: 200,
    description: 'Комната успешно деактивирована',
    schema: zodToSwaggerSchema(RoomResponseSchema),
  })
  @ApiResponse({
    status: 404,
    description: 'Комната не найдена',
  })
  @ApiResponse({
    status: 409,
    description: 'Комната уже деактивирована',
  })
  async deactivate(@Param('id') id: string) {
    return this.roomsService.deactivate(id)
  }

  @Post(':id/join')
  @UseGuards(AuthGuard('jwt'))
  @HttpCode(HttpStatus.OK)
  @ApiBearerAuth('JWT-auth')
  @ApiOperation({ summary: 'Присоединиться к комнате' })
  @ApiResponse({
    status: 200,
    description: 'Успешно присоединен к комнате',
    schema: zodToSwaggerSchema(JoinRoomResponseSchema),
  })
  @ApiResponse({
    status: 401,
    description: 'Не авторизован',
  })
  @ApiResponse({
    status: 404,
    description: 'Комната не найдена',
  })
  async joinRoom(@Param('id') id: string, @Request() req) {
    const userId = req.user.userId
    return this.roomMembersService.joinRoom(id, userId)
  }

  @Post(':id/leave')
  @UseGuards(AuthGuard('jwt'))
  @HttpCode(HttpStatus.OK)
  @ApiBearerAuth('JWT-auth')
  @ApiOperation({ summary: 'Покинуть комнату' })
  @ApiResponse({
    status: 200,
    description: 'Успешно покинул комнату',
    schema: zodToSwaggerSchema(JoinRoomResponseSchema),
  })
  @ApiResponse({
    status: 401,
    description: 'Не авторизован',
  })
  @ApiResponse({
    status: 404,
    description: 'Комната не найдена или пользователь не является участником',
  })
  async leaveRoom(@Param('id') id: string, @Request() req) {
    const userId = req.user.userId
    return this.roomMembersService.leaveRoom(id, userId)
  }

  @Post(':id/ban/:userId')
  @UseGuards(AuthGuard('jwt'))
  @HttpCode(HttpStatus.OK)
  @ApiBearerAuth('JWT-auth')
  @ApiOperation({
    summary: 'Забанить пользователя в комнате (только владелец)',
  })
  @ApiResponse({
    status: 200,
    description: 'Пользователь успешно забанен',
    schema: zodToSwaggerSchema(JoinRoomResponseSchema),
  })
  @ApiResponse({
    status: 401,
    description: 'Не авторизован',
  })
  @ApiResponse({
    status: 403,
    description: 'Только владелец комнаты может банить пользователей',
  })
  @ApiResponse({
    status: 404,
    description: 'Комната не найдена',
  })
  @ApiResponse({
    status: 409,
    description: 'Нельзя забанить владельца комнаты',
  })
  async banUser(
    @Param('id') id: string,
    @Param('userId') userId: string,
    @Request() req,
  ) {
    const bannedBy = req.user.userId
    return this.roomMembersService.banUser(id, userId, bannedBy)
  }

  @Post(':id/unban/:userId')
  @UseGuards(AuthGuard('jwt'))
  @HttpCode(HttpStatus.OK)
  @ApiBearerAuth('JWT-auth')
  @ApiOperation({
    summary: 'Разбанить пользователя в комнате (только владелец)',
  })
  @ApiResponse({
    status: 200,
    description: 'Пользователь успешно разбанен',
    schema: zodToSwaggerSchema(JoinRoomResponseSchema),
  })
  @ApiResponse({
    status: 401,
    description: 'Не авторизован',
  })
  @ApiResponse({
    status: 403,
    description: 'Только владелец комнаты может разбанивать пользователей',
  })
  @ApiResponse({
    status: 404,
    description: 'Комната не найдена или пользователь не является участником',
  })
  @ApiResponse({
    status: 409,
    description: 'Пользователь не забанен',
  })
  async unbanUser(
    @Param('id') id: string,
    @Param('userId') userId: string,
    @Request() req,
  ) {
    const unbannedBy = req.user.userId
    return this.roomMembersService.unbanUser(id, userId, unbannedBy)
  }

  @Get('my')
  @Version('2')
  @UseGuards(AuthGuard('jwt'))
  @ApiBearerAuth('JWT-auth')
  @ApiOperation({
    summary: 'Получить все комнаты пользователя (владелец или участник)',
  })
  @ApiResponse({
    status: 200,
    description: 'Список комнат пользователя',
    schema: zodToSwaggerSchema(UserRoomsResponseSchema),
  })
  @ApiResponse({
    status: 401,
    description: 'Не авторизован',
  })
  async getMyRooms(@Request() req) {
    const userId = req.user.userId
    return this.roomsService.findUserRooms(userId)
  }
}

import {
  Controller,
  Get,
  Post,
  Body,
  Patch,
  Param,
  Delete,
  UsePipes,
} from '@nestjs/common';
import { UsersService } from './users.service';
import { z } from 'zod';
import { ZodValidationPipe } from '../common/zod-validation.pipe';

// Zod схемы для валидации
const CreateUserSchema = z.object({
  email: z.string().email(),
  username: z.string().min(3).max(100),
  password: z.string().min(6),
});

const UpdateUserSchema = CreateUserSchema.partial();

@Controller('users')
export class UsersController {
  constructor(private readonly usersService: UsersService) {}

  @Post()
  @UsePipes(new ZodValidationPipe(CreateUserSchema))
  async create(@Body() createUserDto: z.infer<typeof CreateUserSchema>) {
    return this.usersService.create(createUserDto);
  }

  @Get()
  async findAll() {
    return this.usersService.findAll();
  }

  @Get(':id')
  async findOne(@Param('id') id: string) {
    return this.usersService.findOne(id);
  }

  @Patch(':id')
  @UsePipes(new ZodValidationPipe(UpdateUserSchema))
  async update(
    @Param('id') id: string,
    @Body() updateUserDto: z.infer<typeof UpdateUserSchema>,
  ) {
    return this.usersService.update(id, updateUserDto);
  }

  @Delete(':id')
  async remove(@Param('id') id: string) {
    await this.usersService.remove(id);
    return { message: 'User deleted successfully' };
  }
}


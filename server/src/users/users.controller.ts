import { Controller, Get, Post, Body, Patch, Param, Delete, UsePipes } from '@nestjs/common';
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiParam,
  ApiBody,
  ApiSecurity,
} from '@nestjs/swagger';
import { UsersService } from './users.service';
import { z } from 'zod';
import { ZodValidationPipe } from '../common/zod-validation.pipe';
import { NewUser } from '../database/schema/users';
import { RequireScope } from '../auth/scopes/scopes.decorator';
import { Scope } from '../auth/scopes/scopes.constants';

// Zod схемы для валидации
const CreateUserSchema = z.object({
  username: z.string().min(3).max(100),
  password: z.string().min(6),
});

const UpdateUserSchema = CreateUserSchema.partial();

@ApiTags('users')
@Controller('users')
export class UsersController {
  constructor(private readonly usersService: UsersService) {}

  @Post()
  @ApiOperation({ summary: 'Create a new user' })
  @ApiSecurity('api-key')
  @ApiSecurity('bearer')
  @ApiBody({
    schema: {
      type: 'object',
      required: ['username', 'password'],
      properties: {
        username: { type: 'string', minLength: 3, maxLength: 100, description: 'Username' },
        password: { type: 'string', minLength: 6, description: 'User password' },
      },
    },
  })
  @ApiResponse({ status: 201, description: 'User created successfully' })
  @ApiResponse({ status: 400, description: 'Invalid input data' })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  @UsePipes(new ZodValidationPipe(CreateUserSchema))
  async create(@Body() createUserDto: z.infer<typeof CreateUserSchema>) {
    return this.usersService.create(createUserDto as NewUser);
  }

  @Get()
  @RequireScope(Scope.ALLOW_ALL_USERS)
  @ApiOperation({
    summary: 'Get all users',
    description:
      'Get all users in the system. Requires "allow-all-users" or "allow-all" scope for API keys. JWT users have full access.',
  })
  @ApiSecurity('api-key')
  @ApiSecurity('bearer')
  @ApiResponse({ status: 200, description: 'List of all users' })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  @ApiResponse({
    status: 403,
    description: 'Forbidden - API key does not have required scope (allow-all-users or allow-all)',
  })
  async findAll() {
    return this.usersService.findAll();
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get user by ID' })
  @ApiSecurity('api-key')
  @ApiSecurity('bearer')
  @ApiParam({ name: 'id', type: 'string', format: 'uuid' })
  @ApiResponse({ status: 200, description: 'User details' })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  @ApiResponse({ status: 404, description: 'User not found' })
  async findOne(@Param('id') id: string) {
    return this.usersService.findOne(id);
  }

  @Patch(':id')
  @ApiOperation({ summary: 'Update user' })
  @ApiSecurity('api-key')
  @ApiSecurity('bearer')
  @ApiParam({ name: 'id', type: 'string', format: 'uuid' })
  @ApiBody({
    schema: {
      type: 'object',
      properties: {
        username: { type: 'string', minLength: 3, maxLength: 100 },
        password: { type: 'string', minLength: 6 },
      },
    },
  })
  @ApiResponse({ status: 200, description: 'User updated successfully' })
  @ApiResponse({ status: 400, description: 'Invalid input data' })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  @ApiResponse({ status: 404, description: 'User not found' })
  @UsePipes(new ZodValidationPipe(UpdateUserSchema))
  async update(@Param('id') id: string, @Body() updateUserDto: z.infer<typeof UpdateUserSchema>) {
    return this.usersService.update(id, updateUserDto);
  }

  @Delete(':id')
  @ApiOperation({ summary: 'Delete user' })
  @ApiSecurity('api-key')
  @ApiSecurity('bearer')
  @ApiParam({ name: 'id', type: 'string', format: 'uuid' })
  @ApiResponse({ status: 200, description: 'User deleted successfully' })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  @ApiResponse({ status: 404, description: 'User not found' })
  async remove(@Param('id') id: string) {
    await this.usersService.remove(id);
    return { message: 'User deleted successfully' };
  }
}

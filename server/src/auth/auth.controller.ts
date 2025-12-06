import {
  Controller,
  Post,
  Get,
  Delete,
  Body,
  Param,
  UsePipes,
  HttpCode,
  HttpStatus,
  Req,
  UnauthorizedException,
} from '@nestjs/common';
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiParam,
  ApiBody,
  ApiBearerAuth,
} from '@nestjs/swagger';
import { AuthService } from './auth.service';
import { z } from 'zod';
import { ZodValidationPipe } from '../common/zod-validation.pipe';
import { Public } from './decorators/public.decorator';
import { GetUser } from './decorators/get-user.decorator';
import { Scope, validateScopes } from './scopes/scopes.constants';
import { Request } from 'express';

const LoginSchema = z.object({
  username: z.string().min(3).max(100),
  password: z.string().min(6),
});

const RefreshTokenSchema = z.object({
  refreshToken: z.string(),
});

const GenerateApiKeySchema = z.object({
  name: z.string().optional(),
  expiresInDays: z.number().int().positive().optional(),
  scopes: z
    .array(z.string())
    .optional()
    .refine(
      (scopes) => {
        if (!scopes || scopes.length === 0) return true;
        const validScopes = validateScopes(scopes);
        return validScopes.length === scopes.length;
      },
      {
        message: 'Invalid scopes. Valid scopes are: allow-all, allow-all-chats, allow-all-users',
      },
    ),
});

const RegisterSchema = z.object({
  username: z.string().min(3).max(100),
  password: z.string().min(6),
});

@ApiTags('auth')
@Controller('auth')
export class AuthController {
  constructor(private readonly authService: AuthService) {}

  // ========== Registration ==========

  @Public()
  @Post('register')
  @HttpCode(HttpStatus.CREATED)
  @ApiOperation({ summary: 'Register a new user' })
  @ApiBody({
    schema: {
      type: 'object',
      required: ['username', 'password'],
      properties: {
        username: {
          type: 'string',
          minLength: 3,
          maxLength: 100,
          description: 'Username (must be unique)',
        },
        password: { type: 'string', minLength: 6, description: 'User password' },
      },
    },
  })
  @ApiResponse({
    status: 201,
    description: 'User registered successfully',
    schema: {
      type: 'object',
      properties: {
        id: { type: 'string' },
        username: { type: 'string' },
      },
    },
  })
  @ApiResponse({ status: 409, description: 'Username already exists' })
  @ApiResponse({ status: 400, description: 'Invalid input data' })
  @UsePipes(new ZodValidationPipe(RegisterSchema))
  async register(@Body() data: z.infer<typeof RegisterSchema>) {
    // Логируем полученные данные для отладки
    console.log('Register request received:', {
      username: data.username,
      hasPassword: !!data.password,
    });

    if (!data.username) {
      throw new UnauthorizedException('Username is required');
    }

    if (!data.password) {
      throw new UnauthorizedException('Password is required');
    }

    const user = await this.authService.register(data.username, data.password);

    return {
      id: user.id,
      username: user.username,
    };
  }

  // ========== JWT Authentication ==========

  @Public()
  @Post('login')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Login with username and password' })
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
  @ApiResponse({
    status: 200,
    description: 'Login successful',
    schema: {
      type: 'object',
      properties: {
        accessToken: { type: 'string' },
        refreshToken: { type: 'string' },
        user: {
          type: 'object',
          properties: {
            id: { type: 'string' },
            username: { type: 'string' },
          },
        },
      },
    },
  })
  @ApiResponse({ status: 401, description: 'Invalid credentials' })
  @UsePipes(new ZodValidationPipe(LoginSchema))
  async login(@Body() data: z.infer<typeof LoginSchema>) {
    const user = await this.authService.validateUser(data.username, data.password);

    if (!user) {
      throw new UnauthorizedException('Invalid credentials');
    }

    const tokens = await this.authService.generateTokens(user);

    return {
      ...tokens,
      user: {
        id: user.id,
        username: user.username,
      },
    };
  }

  @Post('refresh')
  @HttpCode(HttpStatus.OK)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Refresh access token (requires access token)' })
  @ApiBody({
    schema: {
      type: 'object',
      required: ['refreshToken'],
      properties: {
        refreshToken: { type: 'string', description: 'Refresh token' },
      },
    },
  })
  @ApiResponse({
    status: 200,
    description: 'Token refreshed successfully',
    schema: {
      type: 'object',
      properties: {
        accessToken: { type: 'string' },
      },
    },
  })
  @ApiResponse({
    status: 401,
    description: 'Unauthorized - access token required or invalid refresh token',
  })
  @UsePipes(new ZodValidationPipe(RefreshTokenSchema))
  async refresh(@Body() data: z.infer<typeof RefreshTokenSchema>) {
    return this.authService.refreshAccessToken(data.refreshToken);
  }

  @Post('logout')
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Logout and revoke refresh token' })
  @ApiResponse({ status: 204, description: 'Logout successful' })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  async logout(@Body() data: { refreshToken?: string }, @Req() req: Request) {
    // Получаем refresh token из body или из заголовка
    const refreshToken = data.refreshToken || (req.headers['x-refresh-token'] as string);

    if (refreshToken) {
      await this.authService.revokeRefreshToken(refreshToken);
    }
  }

  // ========== API Key Management ==========

  @Post('api-keys')
  @HttpCode(HttpStatus.CREATED)
  @ApiBearerAuth()
  @ApiOperation({
    summary: 'Generate a new API key (requires authentication)',
    description:
      'Create a new API key with optional scopes/permissions. Scopes define what actions the API key can perform.',
  })
  @ApiBody({
    schema: {
      type: 'object',
      properties: {
        name: { type: 'string', description: 'Optional name for the API key' },
        expiresInDays: {
          type: 'number',
          description: 'Optional expiration in days (default: never expires)',
        },
        scopes: {
          type: 'array',
          items: {
            type: 'string',
            enum: Object.values(Scope),
            description: 'Scope/permission for the API key',
          },
          description: `Optional scopes/permissions. Available scopes:
- **allow-all**: Full access to all system functions (super permission)
- **allow-all-chats**: Access to all chats/rooms in the system, including private ones
- **allow-all-users**: Access to all users in the system, including their profiles and data

If no scopes are provided, the API key will have no special permissions (only basic access).
Multiple scopes can be specified.`,
          example: ['allow-all-chats', 'allow-all-users'],
        },
      },
    },
  })
  @ApiResponse({ status: 201, description: 'API key created successfully' })
  @ApiResponse({ status: 400, description: 'Invalid input data or invalid scopes' })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  @UsePipes(new ZodValidationPipe(GenerateApiKeySchema))
  async generateApiKey(
    @Body() data: z.infer<typeof GenerateApiKeySchema>,
    @GetUser() user: { userId: string; username?: string },
    @Req() req: Request,
  ) {
    // Проверяем, что пользователь авторизован
    if (!user || !user.userId) {
      throw new UnauthorizedException('User not authenticated');
    }

    // Валидируем и нормализуем scopes
    const validatedScopes = data.scopes ? validateScopes(data.scopes) : [];

    const ipAddress =
      req.ip || (req.headers['x-forwarded-for'] as string) || req.socket.remoteAddress;
    const userAgent = req.headers['user-agent'];

    // API ключ автоматически привязывается к авторизованному пользователю
    const result = await this.authService.generateApiKey(
      data.name,
      user.userId, // Автоматически берётся из авторизованного пользователя
      data.expiresInDays,
      validatedScopes.length > 0 ? validatedScopes : undefined,
      ipAddress,
      userAgent,
    );

    // Возвращаем ключ только при создании
    return {
      id: result.apiKey.id,
      key: result.token, // JWT токен
      name: result.apiKey.name,
      createdAt: result.apiKey.createdAt,
      expiresAt: result.apiKey.expiresAt,
      scopes: data.scopes || [],
      userId: result.apiKey.userId,
    };
  }

  @Get('api-keys')
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Get all API keys for the authenticated user' })
  @ApiResponse({ status: 200, description: 'List of API keys' })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  async getUserApiKeys(@GetUser() user: { userId: string; username?: string }) {
    // Проверяем, что пользователь авторизован
    if (!user || !user.userId) {
      throw new UnauthorizedException('User not authenticated');
    }

    // Получаем ключи только для авторизованного пользователя
    const keys = await this.authService.getUserApiKeys(user.userId);
    // Не возвращаем сами ключи, только метаданные
    return keys.map((key) => ({
      id: key.id,
      name: key.name,
      lastUsedAt: key.lastUsedAt,
      createdAt: key.createdAt,
      expiresAt: key.expiresAt,
      isActive: key.isActive,
      scopes: key.scopes ? JSON.parse(key.scopes) : [],
    }));
  }

  @Delete('api-keys/:id')
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Revoke an API key (only your own)' })
  @ApiParam({ name: 'id', type: 'string', format: 'uuid' })
  @ApiResponse({ status: 204, description: 'API key revoked successfully' })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  @ApiResponse({ status: 403, description: 'Forbidden - can only revoke your own keys' })
  @ApiResponse({ status: 404, description: 'API key not found' })
  async revokeApiKey(
    @Param('id') id: string,
    @GetUser() user: { userId: string; username?: string },
  ) {
    // Проверяем, что пользователь авторизован
    if (!user || !user.userId) {
      throw new UnauthorizedException('User not authenticated');
    }

    // Отзываем ключ только если он принадлежит пользователю
    await this.authService.revokeApiKey(id, user.userId);
  }

  @Delete('api-keys/:id/delete')
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Permanently delete an API key (only your own)' })
  @ApiParam({ name: 'id', type: 'string', format: 'uuid' })
  @ApiResponse({ status: 204, description: 'API key deleted successfully' })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  @ApiResponse({ status: 403, description: 'Forbidden - can only delete your own keys' })
  @ApiResponse({ status: 404, description: 'API key not found' })
  async deleteApiKey(
    @Param('id') id: string,
    @GetUser() user: { userId: string; username?: string },
  ) {
    // Проверяем, что пользователь авторизован
    if (!user || !user.userId) {
      throw new UnauthorizedException('User not authenticated');
    }

    // Удаляем ключ только если он принадлежит пользователю
    await this.authService.deleteApiKey(id, user.userId);
  }
}

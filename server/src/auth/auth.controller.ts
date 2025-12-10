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
  username: z
    .string({
      required_error: 'Username is required',
      invalid_type_error: 'Username must be a string',
    })
    .min(3, { message: 'Username must be at least 3 characters long' })
    .max(100, { message: 'Username must not exceed 100 characters' })
    .trim()
    .refine((val) => val.length >= 3, {
      message: 'Username must be at least 3 characters long after trimming',
    }),
  email: z.preprocess(
    (val) => {
      if (val === '' || val === null || val === undefined) return undefined;
      return typeof val === 'string' ? val.trim().toLowerCase() : val;
    },
    z
      .string({ invalid_type_error: 'Email must be a string' })
      .email({ message: 'Invalid email format' })
      .optional(),
  ),
  password: z
    .string({
      required_error: 'Password is required',
      invalid_type_error: 'Password must be a string',
    })
    .min(6, { message: 'Password must be at least 6 characters long' })
    .max(255, { message: 'Password must not exceed 255 characters' }),
});

@ApiTags('auth')
@Controller('auth')
export class AuthController {
  constructor(private readonly authService: AuthService) {}

  // ========== Registration ==========

  @Public()
  @Post('register')
  @HttpCode(HttpStatus.CREATED)
  @ApiOperation({
    summary: 'Register a new user',
    description:
      'Creates a new user account. Username must be unique and between 3-100 characters. Password must be at least 6 characters long. Email is optional but must be a valid email format if provided.',
  })
  @ApiBody({
    schema: {
      type: 'object',
      required: ['username', 'password'],
      properties: {
        username: {
          type: 'string',
          minLength: 3,
          maxLength: 100,
          description:
            'Unique username for the account. Must be between 3 and 100 characters. Alphanumeric characters and common symbols are allowed.',
          example: 'johndoe',
        },
        email: {
          type: 'string',
          format: 'email',
          description: 'Optional email address for the account. Must be a valid email format.',
          example: 'john.doe@example.com',
        },
        password: {
          type: 'string',
          minLength: 6,
          format: 'password',
          description:
            'User password. Must be at least 6 characters long. It is recommended to use a strong password with a mix of letters, numbers, and symbols.',
          example: 'MySecurePassword123!',
        },
      },
      additionalProperties: false,
      example: {
        username: 'johndoe',
        email: 'john.doe@example.com',
        password: 'MySecurePassword123!',
      },
    },
    description:
      'Registration request body. Username and password are required fields. Email is optional.',
  })
  @ApiResponse({
    status: 201,
    description: 'User registered successfully. Returns the created user information.',
    schema: {
      type: 'object',
      properties: {
        id: {
          type: 'string',
          format: 'uuid',
          description: 'Unique user identifier',
          example: '123e4567-e89b-12d3-a456-426614174000',
        },
        username: {
          type: 'string',
          description: 'Username of the registered user',
          example: 'johndoe',
        },
        email: {
          type: 'string',
          format: 'email',
          nullable: true,
          description: 'Email address of the registered user (if provided)',
          example: 'john.doe@example.com',
        },
      },
      example: {
        id: '123e4567-e89b-12d3-a456-426614174000',
        username: 'johndoe',
        email: 'john.doe@example.com',
      },
    },
  })
  @ApiResponse({
    status: 409,
    description: 'Username already exists. The provided username is already taken by another user.',
  })
  @ApiResponse({
    status: 400,
    description:
      'Invalid input data. Check that username is 3-100 characters, password is at least 6 characters, and email (if provided) is a valid email format.',
  })
  @UsePipes(new ZodValidationPipe(RegisterSchema))
  async register(@Body() data: z.infer<typeof RegisterSchema>) {
    // Данные уже валидированы через ZodValidationPipe
    // Username и password гарантированно присутствуют и валидны
    const user = await this.authService.register(data.username, data.password, data.email);

    return {
      id: user.id,
      username: user.username,
      email: user.email,
    };
  }

  // ========== JWT Authentication ==========

  @Public()
  @Post('login')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary: 'Login with username and password',
    description:
      'Authenticates a user with username and password. Returns access token and refresh token for API authentication.',
  })
  @ApiBody({
    schema: {
      type: 'object',
      required: ['username', 'password'],
      properties: {
        username: {
          type: 'string',
          minLength: 3,
          maxLength: 100,
          description: 'Username of the registered user account',
          example: 'johndoe',
        },
        password: {
          type: 'string',
          minLength: 6,
          format: 'password',
          description: 'Password for the user account',
          example: 'MySecurePassword123!',
        },
      },
      additionalProperties: false,
      example: {
        username: 'johndoe',
        password: 'MySecurePassword123!',
      },
    },
    description: 'Login credentials. Both username and password are required.',
  })
  @ApiResponse({
    status: 200,
    description: 'Login successful. Returns JWT tokens and user information.',
    schema: {
      type: 'object',
      properties: {
        accessToken: {
          type: 'string',
          description:
            'JWT access token. Use this token in the Authorization header as "Bearer {accessToken}" for authenticated requests. Expires in 15 minutes by default.',
          example: 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...',
        },
        refreshToken: {
          type: 'string',
          description:
            'JWT refresh token. Use this token to obtain a new access token when it expires. Expires in 7 days by default.',
          example: 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...',
        },
        user: {
          type: 'object',
          properties: {
            id: {
              type: 'string',
              format: 'uuid',
              description: 'User unique identifier',
              example: '123e4567-e89b-12d3-a456-426614174000',
            },
            username: { type: 'string', description: 'Username', example: 'johndoe' },
          },
        },
      },
      example: {
        accessToken:
          'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJzdWIiOiIxMjM0NTY3OCIsIm5hbWUiOiJKb2huIERvZSIsImlhdCI6MTUxNjIzOTAyMn0...',
        refreshToken:
          'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJzdWIiOiIxMjM0NTY3OCIsIm5hbWUiOiJKb2huIERvZSIsImlhdCI6MTUxNjIzOTAyMn0...',
        user: {
          id: '123e4567-e89b-12d3-a456-426614174000',
          username: 'johndoe',
        },
      },
    },
  })
  @ApiResponse({
    status: 401,
    description: 'Invalid credentials. Username or password is incorrect.',
  })
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
  @ApiOperation({
    summary: 'Refresh access token',
    description:
      'Obtains a new access token using a valid refresh token. Requires a valid access token in the Authorization header.',
  })
  @ApiBody({
    schema: {
      type: 'object',
      required: ['refreshToken'],
      properties: {
        refreshToken: {
          type: 'string',
          description:
            'The refresh token received from the login endpoint. This token is used to obtain a new access token when the current one expires.',
          example:
            'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJzdWIiOiIxMjM0NTY3OCIsInR5cGUiOiJyZWZyZXNoIiwiaWF0IjoxNTE2MjM5MDIyfQ...',
        },
      },
      additionalProperties: false,
      example: {
        refreshToken:
          'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJzdWIiOiIxMjM0NTY3OCIsInR5cGUiOiJyZWZyZXNoIiwiaWF0IjoxNTE2MjM5MDIyfQ...',
      },
    },
    description:
      'Refresh token request body. The refresh token from the login response is required.',
  })
  @ApiResponse({
    status: 200,
    description: 'Token refreshed successfully. Returns a new access token.',
    schema: {
      type: 'object',
      properties: {
        accessToken: {
          type: 'string',
          description:
            'New JWT access token. Use this token in the Authorization header as "Bearer {accessToken}" for authenticated requests.',
          example:
            'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJzdWIiOiIxMjM0NTY3OCIsInR5cGUiOiJhY2Nlc3MiLCJpYXQiOjE1MTYyMzkwMjJ9...',
        },
      },
      example: {
        accessToken:
          'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJzdWIiOiIxMjM0NTY3OCIsInR5cGUiOiJhY2Nlc3MiLCJpYXQiOjE1MTYyMzkwMjJ9...',
      },
    },
  })
  @ApiResponse({
    status: 401,
    description:
      'Unauthorized. Either the access token is missing/invalid, or the refresh token is expired/revoked/invalid.',
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
    // Используем req.user напрямую, так как декоратор может не работать правильно
    // Декоратор используется для типизации, но данные берем из req.user
    const authenticatedUser = (req.user || user) as { userId: string; username?: string };

    // Проверяем, что пользователь авторизован
    if (!authenticatedUser || !authenticatedUser.userId) {
      throw new UnauthorizedException('User not authenticated');
    }

    // Валидируем и нормализуем scopes
    const validatedScopes = data.scopes ? validateScopes(data.scopes) : [];

    // Нормализуем IP адрес
    let ipAddress: string | undefined;
    const rawIp = req.ip || (req.headers['x-forwarded-for'] as string) || req.socket.remoteAddress;

    if (rawIp) {
      // Если x-forwarded-for содержит несколько IP (через запятую), берем первый
      const firstIp = rawIp.split(',')[0].trim();

      // Конвертируем IPv6-маппированный IPv4 (::ffff:127.0.0.1) в обычный IPv4
      if (firstIp.startsWith('::ffff:')) {
        ipAddress = firstIp.substring(7); // Убираем ::ffff: префикс
      } else if (firstIp.startsWith('::1')) {
        // Локальный IPv6 адрес, конвертируем в IPv4 localhost
        ipAddress = '127.0.0.1';
      } else {
        ipAddress = firstIp;
      }

      // Проверяем длину (максимум 45 символов для IPv6)
      // IPv4: максимум 15 символов (255.255.255.255)
      // IPv6: максимум 45 символов (полный формат с портом)
      if (ipAddress && ipAddress.length > 45) {
        // Обрезаем до 45 символов, но это не должно происходить для валидных IP
        // Логируем предупреждение, если IP слишком длинный
        console.warn(`IP address too long (${ipAddress.length} chars), truncating: ${ipAddress}`);
        ipAddress = ipAddress.substring(0, 45);
      }
    }

    const userAgent = req.headers['user-agent'];

    // API ключ автоматически привязывается к авторизованному пользователю
    const result = await this.authService.generateApiKey(
      data.name,
      authenticatedUser.userId, // Используем authenticatedUser вместо user
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
  async getUserApiKeys(
    @GetUser() user: { userId: string; username?: string },
    @Req() req: Request,
  ) {
    // Используем req.user напрямую
    const authenticatedUser = (req.user || user) as { userId: string; username?: string };

    // Проверяем, что пользователь авторизован
    if (!authenticatedUser || !authenticatedUser.userId) {
      throw new UnauthorizedException('User not authenticated');
    }

    // Получаем ключи только для авторизованного пользователя
    const keys = await this.authService.getUserApiKeys(authenticatedUser.userId);
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
    @Req() req: Request,
  ) {
    // Используем req.user напрямую
    const authenticatedUser = (req.user || user) as { userId: string; username?: string };

    // Проверяем, что пользователь авторизован
    if (!authenticatedUser || !authenticatedUser.userId) {
      throw new UnauthorizedException('User not authenticated');
    }

    // Отзываем ключ только если он принадлежит пользователю
    await this.authService.revokeApiKey(id, authenticatedUser.userId);
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
    @Req() req: Request,
  ) {
    // Используем req.user напрямую
    const authenticatedUser = (req.user || user) as { userId: string; username?: string };

    // Проверяем, что пользователь авторизован
    if (!authenticatedUser || !authenticatedUser.userId) {
      throw new UnauthorizedException('User not authenticated');
    }

    // Удаляем ключ только если он принадлежит пользователю
    await this.authService.deleteApiKey(id, authenticatedUser.userId);
  }
}

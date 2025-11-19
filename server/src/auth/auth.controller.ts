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
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse, ApiParam, ApiBody } from '@nestjs/swagger';
import { AuthService } from './auth.service';
import { z } from 'zod';
import { ZodValidationPipe } from '../common/zod-validation.pipe';
import { Public } from './decorators/public.decorator';

const GenerateApiKeySchema = z.object({
  name: z.string().optional(),
  userId: z.string().uuid().optional(),
  expiresInDays: z.number().int().positive().optional(),
});

@ApiTags('auth')
@Controller('auth')
export class AuthController {
  constructor(private readonly authService: AuthService) {}

  @Public()
  @Post('api-keys')
  @HttpCode(HttpStatus.CREATED)
  @ApiOperation({ summary: 'Generate a new API key' })
  @ApiBody({
    schema: {
      type: 'object',
      properties: {
        name: { type: 'string', description: 'Optional name for the API key' },
        userId: { type: 'string', format: 'uuid', description: 'Optional user ID' },
        expiresInDays: { type: 'number', description: 'Optional expiration in days' },
      },
    },
  })
  @ApiResponse({ status: 201, description: 'API key created successfully' })
  @ApiResponse({ status: 400, description: 'Invalid input data' })
  @UsePipes(new ZodValidationPipe(GenerateApiKeySchema))
  async generateApiKey(@Body() data: z.infer<typeof GenerateApiKeySchema>) {
    const apiKey = await this.authService.generateApiKey(
      data.name,
      data.userId,
      data.expiresInDays,
    );

    // Возвращаем ключ только при создании
    return {
      id: apiKey.id,
      key: apiKey.key,
      name: apiKey.name,
      createdAt: apiKey.createdAt,
      expiresAt: apiKey.expiresAt,
    };
  }

  @Get('api-keys/:userId')
  @ApiOperation({ summary: 'Get all API keys for a user' })
  @ApiParam({ name: 'userId', type: 'string', format: 'uuid' })
  @ApiResponse({ status: 200, description: 'List of API keys' })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  async getUserApiKeys(@Param('userId') userId: string) {
    const keys = await this.authService.getUserApiKeys(userId);
    // Не возвращаем сами ключи, только метаданные
    return keys.map((key) => ({
      id: key.id,
      name: key.name,
      lastUsedAt: key.lastUsedAt,
      createdAt: key.createdAt,
      expiresAt: key.expiresAt,
      isActive: key.isActive,
    }));
  }

  @Delete('api-keys/:id')
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({ summary: 'Revoke an API key' })
  @ApiParam({ name: 'id', type: 'string', format: 'uuid' })
  @ApiResponse({ status: 204, description: 'API key revoked successfully' })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  @ApiResponse({ status: 404, description: 'API key not found' })
  async revokeApiKey(@Param('id') id: string) {
    await this.authService.revokeApiKey(id);
  }

  @Delete('api-keys/:id/delete')
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({ summary: 'Permanently delete an API key' })
  @ApiParam({ name: 'id', type: 'string', format: 'uuid' })
  @ApiResponse({ status: 204, description: 'API key deleted successfully' })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  @ApiResponse({ status: 404, description: 'API key not found' })
  async deleteApiKey(@Param('id') id: string) {
    await this.authService.deleteApiKey(id);
  }
}

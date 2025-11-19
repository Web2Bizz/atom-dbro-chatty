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
import { AuthService } from './auth.service';
import { z } from 'zod';
import { ZodValidationPipe } from '../common/zod-validation.pipe';
import { Public } from './decorators/public.decorator';

const GenerateApiKeySchema = z.object({
  name: z.string().optional(),
  userId: z.string().uuid().optional(),
  expiresInDays: z.number().int().positive().optional(),
});

@Controller('auth')
export class AuthController {
  constructor(private readonly authService: AuthService) {}

  @Public()
  @Post('api-keys')
  @HttpCode(HttpStatus.CREATED)
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
  async revokeApiKey(@Param('id') id: string) {
    await this.authService.revokeApiKey(id);
  }

  @Delete('api-keys/:id/delete')
  @HttpCode(HttpStatus.NO_CONTENT)
  async deleteApiKey(@Param('id') id: string) {
    await this.authService.deleteApiKey(id);
  }
}


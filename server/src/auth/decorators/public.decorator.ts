import { SetMetadata } from '@nestjs/common';

/**
 * Декоратор для пометки эндпоинтов как публичных (без проверки API ключа)
 * Использование: @Public() @Get('public-endpoint')
 */
export const IS_PUBLIC_KEY = 'isPublic';
export const Public = () => SetMetadata(IS_PUBLIC_KEY, true);


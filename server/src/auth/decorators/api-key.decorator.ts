import { createParamDecorator, ExecutionContext } from '@nestjs/common';
import { ApiKey } from '../../database/schema/api-keys';

/**
 * Декоратор для получения информации об API ключе из request
 * Использование: @GetApiKey() apiKey: ApiKey
 */
export const GetApiKey = createParamDecorator(
  (data: unknown, ctx: ExecutionContext): ApiKey => {
    const request = ctx.switchToHttp().getRequest();
    return request.apiKey;
  },
);


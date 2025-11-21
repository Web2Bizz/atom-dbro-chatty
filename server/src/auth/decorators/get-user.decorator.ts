import { createParamDecorator, ExecutionContext } from '@nestjs/common';

/**
 * Декоратор для получения информации о пользователе из JWT токена
 * Использование: @GetUser() user: { userId: string, email?: string, username?: string }
 */
export const GetUser = createParamDecorator((data: unknown, ctx: ExecutionContext) => {
  const request = ctx.switchToHttp().getRequest();
  return request.user;
});

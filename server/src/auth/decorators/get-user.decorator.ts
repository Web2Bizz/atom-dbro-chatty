import { createParamDecorator, ExecutionContext, Logger } from '@nestjs/common';

const logger = new Logger('GetUserDecorator');

/**
 * Декоратор для получения информации о пользователе из JWT токена
 * Использование: @GetUser() user: { userId: string, username?: string }
 */
export const GetUser = createParamDecorator((data: unknown, ctx: ExecutionContext) => {
  const request = ctx.switchToHttp().getRequest();
  const user = request.user;
  logger.debug(`GetUser decorator - request.user: ${JSON.stringify(user)}`);
  logger.debug(`GetUser decorator - request.user type: ${typeof user}, isObject: ${user && typeof user === 'object'}`);
  
  // Возвращаем user напрямую из request
  // Если user не существует, возвращаем null
  if (!user) {
    logger.warn('GetUser decorator - request.user is null or undefined');
    return null;
  }
  
  // Проверяем, что user имеет необходимые поля
  if (!user.userId && !user.apiKeyId) {
    logger.warn(`GetUser decorator - user exists but missing userId/apiKeyId: ${JSON.stringify(user)}`);
  }
  
  logger.debug(`GetUser decorator - returning user directly: ${JSON.stringify(user)}`);
  // Возвращаем user напрямую - NestJS должен правильно обработать это
  return user;
});

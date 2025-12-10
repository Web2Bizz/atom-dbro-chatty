import {
  Injectable,
  ExecutionContext,
  BadRequestException,
  UnauthorizedException,
  Logger,
  CanActivate,
} from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { IS_PUBLIC_KEY } from '../decorators/public.decorator';

// Используем require для CommonJS модуля passport
const passport = require('passport');

/**
 * Комбинированный guard, который поддерживает оба типа аутентификации:
 * - JWT (access token) через Authorization: Bearer
 * - API Key (JWT-based) через X-API-Key
 *
 * Важно: оба заголовка не могут использоваться одновременно
 */
@Injectable()
export class CombinedAuthGuard implements CanActivate {
  private readonly logger = new Logger(CombinedAuthGuard.name);

  constructor(private reflector: Reflector) {}

  /**
   * Выполняет аутентификацию через Passport стратегию
   */
  private authenticate(strategy: string, context: ExecutionContext): Promise<boolean> {
    const request = context.switchToHttp().getRequest();
    const response = context.switchToHttp().getResponse();

    return new Promise((resolve, reject) => {
      let callbackCalled = false;

      // Таймаут для предотвращения зависания Promise, если passport.authenticate
      // не вызывает callback (может произойти при отсутствии токена или ошибках в стратегии)
      const timeout = setTimeout(() => {
        if (!callbackCalled) {
          callbackCalled = true;
          this.logger.error(`Authentication timeout for strategy ${strategy}`);
          reject(new UnauthorizedException('Authentication timeout'));
        }
      }, 5000); // 5 секунд - достаточно для аутентификации, но предотвращает зависание

      // Используем правильный способ вызова passport.authenticate с callback
      this.logger.debug(`Starting authentication for strategy ${strategy}`);
      const authenticateMiddleware = passport.authenticate(
        strategy,
        { session: false },
        (err: any, user: any, info: any) => {
          this.logger.debug(
            `Passport callback called for strategy ${strategy}, err: ${!!err}, user: ${!!user}`,
          );

          if (callbackCalled) {
            this.logger.warn(
              `Callback already called for strategy ${strategy}, ignoring duplicate call`,
            );
            return; // Уже обработано через таймаут или другой путь
          }
          callbackCalled = true;
          clearTimeout(timeout);

          if (err) {
            this.logger.error(`Authentication error for strategy ${strategy}: ${err.message}`);
            reject(
              err instanceof UnauthorizedException ? err : new UnauthorizedException(err.message),
            );
            return;
          }

          if (!user) {
            const errorMessage = info?.message || 'Authentication failed';
            this.logger.warn(
              `Authentication failed for strategy ${strategy}: ${errorMessage}, info: ${JSON.stringify(info)}`,
            );
            reject(new UnauthorizedException(errorMessage));
            return;
          }

          // Устанавливаем пользователя в request
          request.user = user;
          // Убеждаемся, что user установлен в request
          if (!request.user) {
            this.logger.error(`Failed to set request.user for strategy ${strategy}`);
            reject(new UnauthorizedException('Failed to set user in request'));
            return;
          }
          this.logger.debug(`User authenticated via ${strategy} callback: ${JSON.stringify(user)}`);
          this.logger.debug(`request.user after setting: ${JSON.stringify(request.user)}`);
          resolve(true);
        },
      );

      // Вызываем middleware как Express middleware
      try {
        authenticateMiddleware(request, response, (error: any) => {
          // Этот callback вызывается Express после завершения middleware
          // Используем setImmediate для проверки request.user, так как passport может установить его асинхронно
          setImmediate(() => {
            // Если callback из passport.authenticate уже был вызван, ничего не делаем
            if (callbackCalled) {
              return;
            }

            // Если есть ошибка, обрабатываем её
            if (error) {
              callbackCalled = true;
              clearTimeout(timeout);
              this.logger.error(`Middleware error for strategy ${strategy}: ${error.message}`);
              reject(
                error instanceof UnauthorizedException
                  ? error
                  : new UnauthorizedException(error.message),
              );
              return;
            }

            // Проверяем, установлен ли user в request (может быть установлен стратегией напрямую)
            // Это может произойти, если passport установил user, но не вызвал наш callback
            if (request.user) {
              callbackCalled = true;
              clearTimeout(timeout);
              const user = request.user;
              // Проверяем, что user имеет необходимые поля
              if (user.userId || user.apiKeyId) {
                this.logger.debug(
                  `User set directly in request via ${strategy}: ${JSON.stringify(user)}`,
                );
                resolve(true);
                return;
              } else {
                this.logger.warn(
                  `User set in request but missing required fields: ${JSON.stringify(user)}`,
                );
                // Продолжаем ждать callback или таймаут
              }
            }

            // Если user не установлен и callback не вызван, ждем таймаут
            // Это может произойти, если токен отсутствует или невалидный
            // Таймаут обработает это через 5 секунд
          });
        });
      } catch (error: any) {
        if (!callbackCalled) {
          callbackCalled = true;
          clearTimeout(timeout);
          this.logger.error(
            `Authentication exception for strategy ${strategy}: ${error?.message || 'Unknown error'}`,
          );
          reject(
            error instanceof UnauthorizedException
              ? error
              : new UnauthorizedException(error?.message || 'Authentication failed'),
          );
        }
      }
    });
  }

  async canActivate(context: ExecutionContext): Promise<boolean> {
    // Проверяем, является ли эндпоинт публичным
    const isPublic = this.reflector.getAllAndOverride<boolean>(IS_PUBLIC_KEY, [
      context.getHandler(),
      context.getClass(),
    ]);

    if (isPublic) {
      return true;
    }

    const request = context.switchToHttp().getRequest();

    // Проверяем наличие обоих заголовков одновременно
    // Express нормализует заголовки в нижний регистр, но проверяем оба варианта для надежности
    const authHeader = request.headers.authorization || request.headers['authorization'];
    const hasAuthorization =
      authHeader && typeof authHeader === 'string' && authHeader.startsWith('Bearer ');

    // Проверяем API ключ в заголовке (разные варианты регистра) и в query параметре
    const apiKeyHeader =
      request.headers['x-api-key'] || request.headers['X-API-Key'] || request.headers['X-Api-Key'];
    const hasApiKey = (apiKeyHeader && typeof apiKeyHeader === 'string') || request.query?.apiKey;

    // Проверяем взаимное исключение методов аутентификации
    if (hasAuthorization && hasApiKey) {
      this.logger.warn(`Attempt to use both Authorization and X-API-Key headers: ${request.ip}`);
      throw new BadRequestException(
        'Cannot use both Authorization and X-API-Key headers simultaneously. Use only one authentication method.',
      );
    }

    // Если есть Bearer токен, используем JWT стратегию
    if (hasAuthorization) {
      try {
        await this.authenticate('jwt', context);

        // Проверяем, что request.user установлен корректно после аутентификации
        const user = request.user;
        if (!user) {
          this.logger.error(
            `JWT authentication completed but request.user is not set - ${request.method} ${request.url}`,
          );
          throw new UnauthorizedException('Authentication failed: user not found');
        }

        if (!user.userId) {
          this.logger.error(
            `JWT authentication succeeded but request.user.userId is missing - ${request.method} ${request.url}. User: ${JSON.stringify(user)}`,
          );
          throw new UnauthorizedException('Authentication failed: user ID not found');
        }

        this.logger.debug(
          `JWT user authenticated: ${user.userId} - ${request.method} ${request.url}`,
        );
        // Дополнительная проверка, что user действительно установлен в request
        if (!request.user || !request.user.userId) {
          this.logger.error(
            `JWT authentication succeeded but request.user lost - ${request.method} ${request.url}. User was: ${JSON.stringify(user)}`,
          );
          throw new UnauthorizedException('Authentication failed: user not found in request');
        }
        this.logger.debug(
          `JWT authentication verified - request.user: ${JSON.stringify(request.user)}`,
        );
        return true;
      } catch (error) {
        this.logger.error(
          `JWT authentication failed: ${error.message} - ${request.method} ${request.url}`,
        );
        throw error;
      }
    }

    // Если есть API ключ, используем API Key стратегию
    if (hasApiKey) {
      try {
        this.logger.debug(`Attempting API Key authentication - ${request.method} ${request.url}`);
        await this.authenticate('api-key-jwt', context);

        // Проверяем, что request.user установлен корректно
        const user = request.user;
        if (!user || (!user.userId && !user.apiKeyId)) {
          this.logger.error(
            `API Key authentication succeeded but request.user is not set correctly - ${request.method} ${request.url}. User: ${JSON.stringify(user)}`,
          );
          throw new UnauthorizedException('Authentication failed: user not found');
        }

        this.logger.debug(
          `API Key user authenticated: ${user.userId || user.apiKeyId} - ${request.method} ${request.url}`,
        );
        return true;
      } catch (error) {
        this.logger.error(
          `API Key authentication failed: ${error.message} - ${request.method} ${request.url}`,
        );
        throw error;
      }
    }

    // Если нет ни одного токена, требуем аутентификацию
    this.logger.warn(
      `Authentication required but not provided: ${request.method} ${request.url} from ${request.ip}`,
    );
    throw new UnauthorizedException(
      'Authentication required. Provide either Authorization Bearer token or X-API-Key header.',
    );
  }
}

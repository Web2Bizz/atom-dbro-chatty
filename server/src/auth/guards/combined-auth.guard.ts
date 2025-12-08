import {
  Injectable,
  ExecutionContext,
  BadRequestException,
  UnauthorizedException,
  Logger,
} from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { firstValueFrom, isObservable } from 'rxjs';
import { IS_PUBLIC_KEY } from '../decorators/public.decorator';
import { JwtAuthGuard } from './jwt-auth.guard';
import { ApiKeyJwtGuard } from './api-key-jwt.guard';

/**
 * Комбинированный guard, который поддерживает оба типа аутентификации:
 * - JWT (access token) через Authorization: Bearer
 * - API Key (JWT-based) через X-API-Key
 *
 * Важно: оба заголовка не могут использоваться одновременно
 */
@Injectable()
export class CombinedAuthGuard {
  private readonly logger = new Logger(CombinedAuthGuard.name);
  private jwtGuard: JwtAuthGuard;
  private apiKeyGuard: ApiKeyJwtGuard;

  constructor(
    private reflector: Reflector,
    jwtGuard: JwtAuthGuard,
    apiKeyGuard: ApiKeyJwtGuard,
  ) {
    this.jwtGuard = jwtGuard;
    this.apiKeyGuard = apiKeyGuard;
  }

  /**
   * Нормализует результат canActivate в Promise<boolean>
   * Обрабатывает случаи: boolean, Promise<boolean>, Observable<boolean>
   */
  private async normalizeGuardResult(
    result: boolean | Promise<boolean> | import('rxjs').Observable<boolean>,
  ): Promise<boolean> {
    if (isObservable(result)) {
      return firstValueFrom(result);
    }
    return Promise.resolve(result);
  }

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const isPublic = this.reflector.getAllAndOverride<boolean>(IS_PUBLIC_KEY, [
      context.getHandler(),
      context.getClass(),
    ]);

    if (isPublic) {
      return true;
    }

    const request = context.switchToHttp().getRequest();

    // Проверяем наличие обоих заголовков одновременно
    const hasAuthorization =
      request.headers.authorization && request.headers.authorization.startsWith('Bearer ');
    const hasApiKey = request.headers['x-api-key'] || request.query?.apiKey;

    if (hasAuthorization && hasApiKey) {
      this.logger.warn(`Attempt to use both Authorization and X-API-Key headers: ${request.ip}`);
      throw new BadRequestException(
        'Cannot use both Authorization and X-API-Key headers simultaneously. Use only one authentication method.',
      );
    }

    // Если есть Bearer токен, используем только JWT guard
    if (hasAuthorization) {
      try {
        const result = this.jwtGuard.canActivate(context);
        const normalizedResult = await this.normalizeGuardResult(result);
        if (normalizedResult) {
          // Убеждаемся, что request.user установлен
          const user = (request as any).user;
          if (user) {
            this.logger.debug(
              `JWT user authenticated: ${user.userId} - ${request.method} ${request.url}. User object: ${JSON.stringify(user)}`,
            );
          } else {
            this.logger.warn(
              `JWT authentication succeeded but request.user is not set - ${request.method} ${request.url}`,
            );
          }
        }
        return normalizedResult;
      } catch (error) {
        this.logger.error(
          `JWT authentication failed: ${error.message} - ${request.method} ${request.url}`,
        );
        throw error;
      }
    }

    // Если есть API ключ, используем только API Key guard
    if (hasApiKey) {
      try {
        const result = this.apiKeyGuard.canActivate(context);
        const normalizedResult = await this.normalizeGuardResult(result);
        if (normalizedResult) {
          // Убеждаемся, что request.user установлен
          const user = (request as any).user;
          if (user) {
            this.logger.debug(
              `API Key user authenticated: ${user.userId || user.apiKeyId} - ${request.method} ${request.url}. User object: ${JSON.stringify(user)}`,
            );
          } else {
            this.logger.warn(
              `API Key authentication succeeded but request.user is not set - ${request.method} ${request.url}`,
            );
          }
        }
        return normalizedResult;
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

import {
  Injectable,
  CanActivate,
  ExecutionContext,
  ForbiddenException,
  Logger,
} from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import {
  REQUIRE_SCOPE_KEY,
  REQUIRE_ANY_SCOPE_KEY,
  REQUIRE_ALL_SCOPES_KEY,
} from '../scopes/scopes.decorator';
import { hasScope, hasAnyScope, hasAllScopes } from '../scopes/scopes.constants';

/**
 * Guard для проверки прав доступа (scopes) пользователя/API ключа
 * 
 * Этот guard проверяет, имеет ли пользователь/API ключ необходимые scopes
 * для доступа к защищенному эндпоинту.
 * 
 * Использование:
 * - Для JWT токенов (обычные пользователи) - scopes не требуются (всегда доступ)
 * - Для API ключей - проверяются scopes из токена
 */
@Injectable()
export class ScopeGuard implements CanActivate {
  private readonly logger = new Logger(ScopeGuard.name);

  constructor(private reflector: Reflector) {}

  canActivate(context: ExecutionContext): boolean {
    const request = context.switchToHttp().getRequest();
    const user = request.user;

    // Если пользователь не аутентифицирован, guard не блокирует доступ
    // (это сделает CombinedAuthGuard)
    if (!user) {
      return true;
    }

    // Если это обычный JWT пользователь (не API ключ), разрешаем доступ
    // JWT пользователи имеют полный доступ и не требуют проверки scopes
    if (user.type === 'jwt') {
      return true;
    }

    // Получаем scopes из пользователя (для API ключей)
    // Для API ключей scopes хранятся в user.scopes
    const userScopes: string[] = user.scopes || [];

    // Проверяем требуемый scope (один)
    const requiredScope = this.reflector.getAllAndOverride<string | null>(REQUIRE_SCOPE_KEY, [
      context.getHandler(),
      context.getClass(),
    ]);

    if (requiredScope) {
      if (!hasScope(userScopes, requiredScope)) {
        this.logger.warn(
          `Access denied: user ${user.userId || user.apiKeyId} does not have required scope '${requiredScope}'. User scopes: [${userScopes.join(', ')}]`,
        );
        throw new ForbiddenException(
          `Access denied. Required scope: '${requiredScope}'. Your scopes: ${userScopes.length > 0 ? `[${userScopes.join(', ')}]` : 'none'}`,
        );
      }
      return true;
    }

    // Проверяем требуемые scopes (хотя бы один)
    const requiredAnyScopes = this.reflector.getAllAndOverride<(string | null)[] | null>(
      REQUIRE_ANY_SCOPE_KEY,
      [context.getHandler(), context.getClass()],
    );

    if (requiredAnyScopes && requiredAnyScopes.length > 0) {
      if (!hasAnyScope(userScopes, requiredAnyScopes)) {
        this.logger.warn(
          `Access denied: user ${user.userId || user.apiKeyId} does not have any of required scopes [${requiredAnyScopes.join(', ')}]. User scopes: [${userScopes.join(', ')}]`,
        );
        throw new ForbiddenException(
          `Access denied. Required at least one scope: [${requiredAnyScopes.join(', ')}]. Your scopes: ${userScopes.length > 0 ? `[${userScopes.join(', ')}]` : 'none'}`,
        );
      }
      return true;
    }

    // Проверяем требуемые scopes (все)
    const requiredAllScopes = this.reflector.getAllAndOverride<(string | null)[] | null>(
      REQUIRE_ALL_SCOPES_KEY,
      [context.getHandler(), context.getClass()],
    );

    if (requiredAllScopes && requiredAllScopes.length > 0) {
      if (!hasAllScopes(userScopes, requiredAllScopes)) {
        this.logger.warn(
          `Access denied: user ${user.userId || user.apiKeyId} does not have all required scopes [${requiredAllScopes.join(', ')}]. User scopes: [${userScopes.join(', ')}]`,
        );
        throw new ForbiddenException(
          `Access denied. Required all scopes: [${requiredAllScopes.join(', ')}]. Your scopes: ${userScopes.length > 0 ? `[${userScopes.join(', ')}]` : 'none'}`,
        );
      }
      return true;
    }

    // Если нет требований к scopes, разрешаем доступ
    return true;
  }
}


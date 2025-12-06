import { SetMetadata } from '@nestjs/common';
import { Scope } from './scopes.constants';

/**
 * Ключ метаданных для хранения требуемых scopes
 */
export const REQUIRE_SCOPE_KEY = 'requireScope';
export const REQUIRE_ANY_SCOPE_KEY = 'requireAnyScope';
export const REQUIRE_ALL_SCOPES_KEY = 'requireAllScopes';

/**
 * Декоратор для указания требуемого scope для доступа к эндпоинту
 * 
 * @example
 * ```typescript
 * @RequireScope(Scope.ALLOW_ALL_CHATS)
 * @Get('rooms')
 * async getAllRooms() {
 *   // Только пользователи/API ключи с scope 'allow-all-chats' или 'allow-all' могут получить доступ
 * }
 * ```
 * 
 * @param scope - требуемый scope
 */
export const RequireScope = (scope: Scope | string) => SetMetadata(REQUIRE_SCOPE_KEY, scope);

/**
 * Декоратор для указания, что требуется хотя бы один из перечисленных scopes
 * 
 * @example
 * ```typescript
 * @RequireAnyScope([Scope.ALLOW_ALL_CHATS, Scope.ALLOW_ALL_USERS])
 * @Get('data')
 * async getData() {
 *   // Пользователь должен иметь хотя бы один из указанных scopes или 'allow-all'
 * }
 * ```
 * 
 * @param scopes - массив требуемых scopes (достаточно одного)
 */
export const RequireAnyScope = (...scopes: (Scope | string)[]) =>
  SetMetadata(REQUIRE_ANY_SCOPE_KEY, scopes);

/**
 * Декоратор для указания, что требуются все перечисленные scopes
 * 
 * @example
 * ```typescript
 * @RequireAllScopes([Scope.ALLOW_ALL_CHATS, Scope.ALLOW_ALL_USERS])
 * @Get('combined')
 * async getCombined() {
 *   // Пользователь должен иметь все указанные scopes или 'allow-all'
 * }
 * ```
 * 
 * @param scopes - массив требуемых scopes (нужны все)
 */
export const RequireAllScopes = (...scopes: (Scope | string)[]) =>
  SetMetadata(REQUIRE_ALL_SCOPES_KEY, scopes);


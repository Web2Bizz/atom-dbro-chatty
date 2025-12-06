/**
 * Система прав доступа (scopes) для API ключей
 * 
 * Scopes определяют, какие действия может выполнять API ключ.
 * Используются для контроля доступа к различным ресурсам системы.
 */

/**
 * Доступные scopes в системе
 */
export enum Scope {
  /**
   * Разрешить все действия (супер-право)
   * Обладатель этого scope имеет доступ ко всем функциям системы
   */
  ALLOW_ALL = 'allow-all',

  /**
   * Доступ ко всем чатам системы
   * Позволяет просматривать все комнаты/чаты, включая приватные
   */
  ALLOW_ALL_CHATS = 'allow-all-chats',

  /**
   * Доступ ко всем пользователям системы
   * Позволяет просматривать список всех пользователей и их данные
   */
  ALLOW_ALL_USERS = 'allow-all-users',
}

/**
 * Метаданные для каждого scope
 * Используется для документации и валидации
 */
export const SCOPE_METADATA: Record<Scope, { description: string; requiredScopes?: Scope[] }> = {
  [Scope.ALLOW_ALL]: {
    description: 'Полный доступ ко всем функциям системы. Обладатель этого scope может выполнять любые действия.',
  },
  [Scope.ALLOW_ALL_CHATS]: {
    description: 'Доступ ко всем операциям с чатами/комнатами системы. Позволяет создавать комнаты, просматривать все комнаты (включая приватные), получать историю сообщений и отправлять сообщения в любые комнаты.',
  },
  [Scope.ALLOW_ALL_USERS]: {
    description: 'Доступ ко всем пользователям системы. Позволяет просматривать список всех пользователей, их профили и данные.',
  },
};

/**
 * Проверяет, есть ли у пользователя/API ключа необходимый scope
 * @param userScopes - массив scopes пользователя/API ключа
 * @param requiredScope - требуемый scope
 * @returns true, если пользователь имеет требуемый scope или ALLOW_ALL
 */
export function hasScope(userScopes: string[], requiredScope: Scope | string): boolean {
  if (!userScopes || userScopes.length === 0) {
    return false;
  }

  // ALLOW_ALL дает доступ ко всему
  if (userScopes.includes(Scope.ALLOW_ALL)) {
    return true;
  }

  return userScopes.includes(requiredScope);
}

/**
 * Проверяет, есть ли у пользователя/API ключа хотя бы один из требуемых scopes
 * @param userScopes - массив scopes пользователя/API ключа
 * @param requiredScopes - массив требуемых scopes (достаточно одного)
 * @returns true, если пользователь имеет хотя бы один из требуемых scopes или ALLOW_ALL
 */
export function hasAnyScope(userScopes: string[], requiredScopes: (Scope | string)[]): boolean {
  if (!userScopes || userScopes.length === 0) {
    return false;
  }

  // ALLOW_ALL дает доступ ко всему
  if (userScopes.includes(Scope.ALLOW_ALL)) {
    return true;
  }

  return requiredScopes.some((scope) => userScopes.includes(scope));
}

/**
 * Проверяет, есть ли у пользователя/API ключа все требуемые scopes
 * @param userScopes - массив scopes пользователя/API ключа
 * @param requiredScopes - массив требуемых scopes (нужны все)
 * @returns true, если пользователь имеет все требуемые scopes или ALLOW_ALL
 */
export function hasAllScopes(userScopes: string[], requiredScopes: (Scope | string)[]): boolean {
  if (!userScopes || userScopes.length === 0) {
    return false;
  }

  // ALLOW_ALL дает доступ ко всему
  if (userScopes.includes(Scope.ALLOW_ALL)) {
    return true;
  }

  return requiredScopes.every((scope) => userScopes.includes(scope));
}

/**
 * Валидирует список scopes
 * @param scopes - массив scopes для валидации
 * @returns массив валидных scopes
 */
export function validateScopes(scopes: string[]): string[] {
  if (!scopes || !Array.isArray(scopes)) {
    return [];
  }

  const validScopes = Object.values(Scope);
  return scopes.filter((scope) => validScopes.includes(scope as Scope));
}

/**
 * Получает все доступные scopes
 * @returns массив всех доступных scopes
 */
export function getAllScopes(): Scope[] {
  return Object.values(Scope);
}


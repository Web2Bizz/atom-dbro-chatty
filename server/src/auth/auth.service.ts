import { Injectable, Inject, NotFoundException } from '@nestjs/common';
import { DATABASE_CONNECTION, Database } from '../database/database.module';
import { apiKeys, ApiKey, NewApiKey } from '../database/schema/api-keys';
import { eq, and } from 'drizzle-orm';
import { randomBytes } from 'crypto';

@Injectable()
export class AuthService {
  constructor(
    @Inject(DATABASE_CONNECTION)
    private db: Database,
  ) {}

  /**
   * Генерирует новый API ключ
   */
  async generateApiKey(name?: string, userId?: string, expiresInDays?: number): Promise<ApiKey> {
    // Генерируем случайный ключ
    const key = `sk_${randomBytes(32).toString('hex')}`;

    const expiresAt = expiresInDays
      ? new Date(Date.now() + expiresInDays * 24 * 60 * 60 * 1000)
      : null;

    const [apiKey] = await this.db
      .insert(apiKeys)
      .values({
        key,
        name: name || null,
        userId: userId || null,
        expiresAt,
        isActive: true,
      })
      .returning();

    return apiKey;
  }

  /**
   * Проверяет валидность API ключа
   */
  async validateApiKey(key: string): Promise<ApiKey | null> {
    const [apiKey] = await this.db
      .select()
      .from(apiKeys)
      .where(and(eq(apiKeys.key, key), eq(apiKeys.isActive, true)))
      .limit(1);

    if (!apiKey) {
      return null;
    }

    // Проверяем срок действия
    if (apiKey.expiresAt && new Date(apiKey.expiresAt) < new Date()) {
      return null;
    }

    // Обновляем время последнего использования
    await this.db.update(apiKeys).set({ lastUsedAt: new Date() }).where(eq(apiKeys.id, apiKey.id));

    return apiKey;
  }

  /**
   * Получает все API ключи пользователя
   */
  async getUserApiKeys(userId: string): Promise<ApiKey[]> {
    return this.db.select().from(apiKeys).where(eq(apiKeys.userId, userId));
  }

  /**
   * Отзывает API ключ
   */
  async revokeApiKey(keyId: string): Promise<void> {
    const [apiKey] = await this.db
      .update(apiKeys)
      .set({ isActive: false })
      .where(eq(apiKeys.id, keyId))
      .returning();

    if (!apiKey) {
      throw new NotFoundException(`API key with ID ${keyId} not found`);
    }
  }

  /**
   * Удаляет API ключ
   */
  async deleteApiKey(keyId: string): Promise<void> {
    const [deletedKey] = await this.db.delete(apiKeys).where(eq(apiKeys.id, keyId)).returning();

    if (!deletedKey) {
      throw new NotFoundException(`API key with ID ${keyId} not found`);
    }
  }
}

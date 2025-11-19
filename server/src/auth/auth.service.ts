import {
  Injectable,
  Inject,
  NotFoundException,
  UnauthorizedException,
  ConflictException,
  Logger,
} from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { ConfigService } from '@nestjs/config';
import { DATABASE_CONNECTION, Database } from '../database/database.module';
import { apiKeys, ApiKey, NewApiKey } from '../database/schema/api-keys';
import { refreshTokens, RefreshToken, NewRefreshToken } from '../database/schema/refresh-tokens';
import { users, User } from '../database/schema/users';
import { eq, and } from 'drizzle-orm';
import * as bcrypt from 'bcryptjs';
import { JwtPayload } from './strategies/jwt.strategy';
import { ApiKeyJwtPayload } from './strategies/api-key-jwt.strategy';

@Injectable()
export class AuthService {
  private readonly logger = new Logger(AuthService.name);

  constructor(
    @Inject(DATABASE_CONNECTION)
    private db: Database,
    private jwtService: JwtService,
    private configService: ConfigService,
  ) {}

  // ========== JWT Authentication (Access/Refresh) ==========

  /**
   * Генерирует пару access и refresh токенов
   */
  async generateTokens(user: User) {
    const payload: JwtPayload = {
      sub: user.id,
      email: user.email,
      username: user.username,
      type: 'access',
    };

    const refreshPayload: JwtPayload = {
      sub: user.id,
      email: user.email,
      username: user.username,
      type: 'refresh',
    };

    const accessToken = this.jwtService.sign(payload, {
      secret: this.configService.get<string>('JWT_SECRET') || 'your-secret-key',
      expiresIn: this.configService.get<string>('JWT_EXPIRES_IN') || '15m',
    });

    const refreshToken = this.jwtService.sign(refreshPayload, {
      secret:
        this.configService.get<string>('JWT_REFRESH_SECRET') ||
        this.configService.get<string>('JWT_SECRET') ||
        'your-refresh-secret-key',
      expiresIn: this.configService.get<string>('JWT_REFRESH_EXPIRES_IN') || '7d',
    });

    // Сохраняем refresh токен в базу данных
    const expiresAt = new Date();
    expiresAt.setDate(expiresAt.getDate() + 7); // 7 дней

    await this.db.insert(refreshTokens).values({
      token: refreshToken,
      userId: user.id,
      expiresAt,
      isRevoked: false,
    });

    this.logger.log(`Tokens generated for user: ${user.email} (${user.id})`);

    return {
      accessToken,
      refreshToken,
    };
  }

  /**
   * Обновляет access токен используя refresh токен
   */
  async refreshAccessToken(refreshToken: string) {
    try {
      const payload = this.jwtService.verify<JwtPayload>(refreshToken, {
        secret:
          this.configService.get<string>('JWT_REFRESH_SECRET') ||
          this.configService.get<string>('JWT_SECRET') ||
          'your-refresh-secret-key',
      });

      if (payload.type !== 'refresh') {
        throw new UnauthorizedException('Invalid token type');
      }

      // Проверяем, что токен не отозван
      const [storedToken] = await this.db
        .select()
        .from(refreshTokens)
        .where(and(eq(refreshTokens.token, refreshToken), eq(refreshTokens.isRevoked, false)))
        .limit(1);

      if (!storedToken || new Date(storedToken.expiresAt) < new Date()) {
        throw new UnauthorizedException('Refresh token expired or revoked');
      }

      // Получаем пользователя
      const [user] = await this.db.select().from(users).where(eq(users.id, payload.sub)).limit(1);

      if (!user) {
        throw new UnauthorizedException('User not found');
      }

      // Генерируем новый access токен
      const accessPayload: JwtPayload = {
        sub: user.id,
        email: user.email,
        username: user.username,
        type: 'access',
      };

      const accessToken = this.jwtService.sign(accessPayload, {
        secret: this.configService.get<string>('JWT_SECRET') || 'your-secret-key',
        expiresIn: this.configService.get<string>('JWT_EXPIRES_IN') || '15m',
      });

      this.logger.log(`Access token refreshed for user: ${user.email} (${user.id})`);
      return { accessToken };
    } catch (error) {
      this.logger.warn(
        `Failed to refresh token: ${error instanceof Error ? error.message : 'Unknown error'}`,
      );
      throw new UnauthorizedException('Invalid refresh token');
    }
  }

  /**
   * Отзывает refresh токен
   */
  async revokeRefreshToken(refreshToken: string): Promise<void> {
    await this.db
      .update(refreshTokens)
      .set({ isRevoked: true })
      .where(eq(refreshTokens.token, refreshToken));
    this.logger.log('Refresh token revoked');
  }

  /**
   * Регистрация нового пользователя
   */
  async register(username: string, password: string): Promise<User> {
    // Проверяем, существует ли пользователь с таким username
    const [existingUser] = await this.db
      .select()
      .from(users)
      .where(eq(users.username, username))
      .limit(1);

    if (existingUser) {
      this.logger.warn(`Registration attempt with existing username: ${username}`);
      throw new ConflictException('Username already exists');
    }

    // Генерируем email из username для совместимости с существующей схемой
    let email = `${username}@chatty.local`;

    // Проверяем, существует ли пользователь с таким email (на случай, если кто-то уже зарегистрировался с таким email)
    const [existingEmail] = await this.db
      .select()
      .from(users)
      .where(eq(users.email, email))
      .limit(1);

    if (existingEmail) {
      // Если email уже существует, добавляем случайный суффикс
      email = `${username}_${Date.now()}@chatty.local`;
    }

    // Хешируем пароль
    const hashedPassword = await bcrypt.hash(password, 10);

    // Создаем пользователя
    const [user] = await this.db
      .insert(users)
      .values({
        username,
        email,
        password: hashedPassword,
      })
      .returning();

    this.logger.log(`User registered: ${username} (${user.id})`);
    return user;
  }

  /**
   * Валидация пользователя по email и password
   */
  async validateUser(email: string, password: string): Promise<User | null> {
    const [user] = await this.db.select().from(users).where(eq(users.email, email)).limit(1);

    if (!user) {
      this.logger.warn(`Login attempt failed: user not found - ${email}`);
      return null;
    }

    const isPasswordValid = await bcrypt.compare(password, user.password);
    if (!isPasswordValid) {
      this.logger.warn(`Login attempt failed: invalid password - ${email}`);
      return null;
    }

    this.logger.log(`User validated successfully: ${email} (${user.id})`);
    return user;
  }

  // ========== API Key (JWT-based) ==========

  /**
   * Генерирует новый API ключ как JWT токен
   */
  async generateApiKey(
    name?: string,
    userId?: string,
    expiresInDays?: number,
    scopes?: string[],
    ipAddress?: string,
    userAgent?: string,
  ): Promise<{ apiKey: ApiKey; token: string }> {
    const expiresAt = expiresInDays
      ? new Date(Date.now() + expiresInDays * 24 * 60 * 60 * 1000)
      : null;

    // Сначала создаём временную запись для получения ID
    // Используем временный ключ, который потом заменим
    const tempKey = `temp_${Date.now()}_${Math.random().toString(36).substring(7)}`;

    const [apiKey] = await this.db
      .insert(apiKeys)
      .values({
        key: tempKey, // Временный ключ, будет заменён на JWT
        name: name || null,
        userId: userId || null,
        expiresAt,
        isActive: true,
        ipAddress: ipAddress || null,
        userAgent: userAgent || null,
        scopes: scopes ? JSON.stringify(scopes) : null,
      })
      .returning();

    // Генерируем JWT токен для API ключа
    const payload: ApiKeyJwtPayload = {
      sub: apiKey.id,
      userId: userId,
      type: 'api-key',
      scopes: scopes || [],
    };

    const token = this.jwtService.sign(payload, {
      secret:
        this.configService.get<string>('JWT_API_KEY_SECRET') ||
        this.configService.get<string>('JWT_SECRET') ||
        'your-api-key-secret-key',
      expiresIn: expiresInDays ? `${expiresInDays}d` : '365d', // По умолчанию год
    });

    // Сохраняем JWT токен в базу данных
    const [updatedApiKey] = await this.db
      .update(apiKeys)
      .set({ key: token })
      .where(eq(apiKeys.id, apiKey.id))
      .returning();

    this.logger.log(
      `API key generated: ${updatedApiKey.id}${name ? ` (${name})` : ''}${userId ? ` for user ${userId}` : ''}`,
    );

    return {
      apiKey: updatedApiKey,
      token,
    };
  }

  /**
   * Проверяет валидность API ключа (JWT)
   */
  async validateApiKeyJwt(apiKeyId: string): Promise<ApiKey | null> {
    const [apiKey] = await this.db
      .select()
      .from(apiKeys)
      .where(and(eq(apiKeys.id, apiKeyId), eq(apiKeys.isActive, true)))
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
   * Проверяет валидность API ключа (старый метод для обратной совместимости)
   */
  async validateApiKey(key: string): Promise<ApiKey | null> {
    // Пытаемся декодировать как JWT
    try {
      const payload = this.jwtService.verify<ApiKeyJwtPayload>(key, {
        secret:
          this.configService.get<string>('JWT_API_KEY_SECRET') ||
          this.configService.get<string>('JWT_SECRET') ||
          'your-api-key-secret-key',
      });

      if (payload.type !== 'api-key') {
        return null;
      }

      return this.validateApiKeyJwt(payload.sub);
    } catch {
      // Если не JWT, проверяем как старый формат (для обратной совместимости)
      const [apiKey] = await this.db
        .select()
        .from(apiKeys)
        .where(and(eq(apiKeys.key, key), eq(apiKeys.isActive, true)))
        .limit(1);

      if (!apiKey) {
        return null;
      }

      if (apiKey.expiresAt && new Date(apiKey.expiresAt) < new Date()) {
        return null;
      }

      await this.db
        .update(apiKeys)
        .set({ lastUsedAt: new Date() })
        .where(eq(apiKeys.id, apiKey.id));

      return apiKey;
    }
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
      this.logger.warn(`Attempt to revoke non-existent API key: ${keyId}`);
      throw new NotFoundException(`API key with ID ${keyId} not found`);
    }

    this.logger.log(`API key revoked: ${keyId}`);
  }

  /**
   * Удаляет API ключ
   */
  async deleteApiKey(keyId: string): Promise<void> {
    const [deletedKey] = await this.db.delete(apiKeys).where(eq(apiKeys.id, keyId)).returning();

    if (!deletedKey) {
      this.logger.warn(`Attempt to delete non-existent API key: ${keyId}`);
      throw new NotFoundException(`API key with ID ${keyId} not found`);
    }

    this.logger.log(`API key deleted: ${keyId}`);
  }
}

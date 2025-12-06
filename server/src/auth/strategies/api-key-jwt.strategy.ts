import { Injectable, UnauthorizedException } from '@nestjs/common';
import { PassportStrategy } from '@nestjs/passport';
import { ExtractJwt, Strategy } from 'passport-jwt';
import { ConfigService } from '@nestjs/config';
import { AuthService } from '../auth.service';
import { Request } from 'express';

export interface ApiKeyJwtPayload {
  sub: string; // api key ID
  userId?: string;
  type: 'api-key';
  scopes?: string[];
  iat?: number;
  exp?: number;
}

@Injectable()
export class ApiKeyJwtStrategy extends PassportStrategy(Strategy, 'api-key-jwt') {
  constructor(
    private configService: ConfigService,
    private authService: AuthService,
  ) {
    super({
      jwtFromRequest: ExtractJwt.fromExtractors([
        (request: Request) => {
          // Проверяем только заголовок X-API-Key
          if (request.headers['x-api-key']) {
            return request.headers['x-api-key'] as string;
          }
          // Также проверяем query параметр для обратной совместимости
          if (request.query?.apiKey) {
            return request.query.apiKey as string;
          }
          return null;
        },
      ]),
      ignoreExpiration: false,
      secretOrKey:
        configService.get<string>('JWT_API_KEY_SECRET') ||
        configService.get<string>('JWT_SECRET') ||
        'your-api-key-secret-key',
    });
  }

  async validate(payload: ApiKeyJwtPayload) {
    if (payload.type !== 'api-key') {
      throw new UnauthorizedException('Invalid token type. Expected API key token.');
    }

    if (!payload.sub) {
      throw new UnauthorizedException('Invalid token payload');
    }

    // Проверяем, что API ключ активен в базе данных
    const apiKey = await this.authService.validateApiKeyJwt(payload.sub);

    if (!apiKey) {
      throw new UnauthorizedException('API key not found or revoked');
    }

    // Получаем scopes из токена или из базы данных
    let scopes: string[] = payload.scopes || [];
    
    // Если в базе данных есть scopes, используем их (они имеют приоритет)
    if (apiKey.scopes) {
      try {
        const dbScopes = JSON.parse(apiKey.scopes);
        if (Array.isArray(dbScopes) && dbScopes.length > 0) {
          scopes = dbScopes;
        }
      } catch (error) {
        // Если не удалось распарсить, используем scopes из токена
      }
    }

    // Возвращаем объект, который будет доступен как request.user
    return {
      apiKeyId: payload.sub,
      userId: payload.userId || apiKey.userId,
      scopes: scopes,
      apiKey,
      type: 'api-key',
    };
  }
}

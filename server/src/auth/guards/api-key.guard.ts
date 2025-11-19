import {
  Injectable,
  CanActivate,
  ExecutionContext,
  UnauthorizedException,
} from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { AuthService } from '../auth.service';
import { IS_PUBLIC_KEY } from '../decorators/public.decorator';

@Injectable()
export class ApiKeyGuard implements CanActivate {
  constructor(
    private readonly authService: AuthService,
    private readonly reflector: Reflector,
  ) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    // Проверяем, помечен ли эндпоинт как публичный
    const isPublic = this.reflector.getAllAndOverride<boolean>(IS_PUBLIC_KEY, [
      context.getHandler(),
      context.getClass(),
    ]);

    if (isPublic) {
      return true;
    }

    const request = context.switchToHttp().getRequest();
    const apiKey = this.extractApiKey(request);

    if (!apiKey) {
      throw new UnauthorizedException('API key is required');
    }

    const validKey = await this.authService.validateApiKey(apiKey);

    if (!validKey) {
      throw new UnauthorizedException('Invalid or expired API key');
    }

    // Добавляем информацию о ключе в request для использования в контроллерах
    request.apiKey = validKey;

    return true;
  }

  private extractApiKey(request: any): string | null {
    // Проверяем заголовок X-API-Key
    if (request.headers['x-api-key']) {
      return request.headers['x-api-key'];
    }

    // Проверяем заголовок Authorization: Bearer <key>
    const authHeader = request.headers.authorization;
    if (authHeader && authHeader.startsWith('Bearer ')) {
      return authHeader.substring(7);
    }

    // Проверяем query параметр
    if (request.query?.apiKey) {
      return request.query.apiKey;
    }

    return null;
  }
}


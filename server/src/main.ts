import { NestFactory } from '@nestjs/core';
import { VersioningType, Logger } from '@nestjs/common';
import { AppModule } from './app/app.module';
import { IoAdapter } from '@nestjs/platform-socket.io';
import { CombinedAuthGuard } from './auth/guards/combined-auth.guard';
import { ScopeGuard } from './auth/guards/scope.guard';
import { DocumentBuilder, SwaggerModule } from '@nestjs/swagger';

async function bootstrap() {
  const logger = new Logger('Bootstrap');
  const app = await NestFactory.create(AppModule, {
    logger: ['error', 'warn', 'log', 'debug', 'verbose'],
  });

  // Enable CORS for Socket.io and API - разрешить все запросы
  app.enableCors({
    origin: '*', // Разрешить все источники
    credentials: true,
    methods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH', 'OPTIONS', 'HEAD'],
    allowedHeaders: ['*'], // Разрешить все заголовки
    exposedHeaders: ['*'], // Разрешить все заголовки в ответе
    preflightContinue: false,
    optionsSuccessStatus: 204,
  });

  // API Versioning
  app.setGlobalPrefix('api');
  app.enableVersioning({
    type: VersioningType.URI,
    defaultVersion: '1',
  });

  // Socket.io adapter
  app.useWebSocketAdapter(new IoAdapter(app));

  // Global Authentication Guard (JWT + API Key)
  const combinedAuthGuard = app.get(CombinedAuthGuard);
  app.useGlobalGuards(combinedAuthGuard);

  // Global Scope Guard (проверка прав доступа для API ключей)
  const scopeGuard = app.get(ScopeGuard);
  app.useGlobalGuards(scopeGuard);

  // Swagger configuration
  const config = new DocumentBuilder()
    .setTitle('Chatty API')
    .setDescription(
      `Chatty backend API documentation.

## Authentication

API supports two authentication methods:

1. **JWT Bearer Token** - Standard user authentication via \`Authorization: Bearer <token>\` header
   - Users authenticated via JWT have full access to all endpoints (no scope restrictions)

2. **API Key** - API key authentication via \`X-API-Key\` header
   - API keys can have specific scopes/permissions that limit their access
   - Available scopes:
     - **allow-all**: Full access to all system functions (super permission)
     - **allow-all-chats**: Access to all chats/rooms in the system, including private ones
     - **allow-all-users**: Access to all users in the system, including their profiles and data

## Scopes & Permissions

Some endpoints require specific scopes when using API keys:
- Endpoints marked with scope requirements will check if the API key has the necessary permissions
- JWT users always have full access regardless of scope requirements
- If an API key lacks required scopes, a 403 Forbidden error will be returned

See endpoint descriptions for specific scope requirements.`,
    )
    .setVersion('1.0')
    .addBearerAuth(
      {
        type: 'http',
        scheme: 'bearer',
        bearerFormat: 'JWT',
        description: 'JWT Access Token (users have full access, no scope restrictions)',
        name: 'Authorization',
        in: 'header',
      },
      'bearer',
    )
    .addApiKey(
      {
        type: 'apiKey',
        name: 'X-API-Key',
        in: 'header',
        description:
          'API Key (JWT-based). API keys can have scopes that limit their access. Create API keys via POST /api/v1/auth/api-keys',
      },
      'api-key',
    )
    .addTag('auth', 'Authentication endpoints')
    .addTag('users', 'User management endpoints')
    .addTag('rooms', 'Room management endpoints')
    .build();

  const document = SwaggerModule.createDocument(app, config);
  SwaggerModule.setup('swagger', app, document, {
    swaggerOptions: {
      persistAuthorization: true,
      tagsSorter: 'alpha',
      operationsSorter: 'alpha',
    },
  });

  const port = process.env.PORT || 3000;
  await app.listen(port);
  logger.log(`Application is running on: http://localhost:${port}`);
  logger.log(`Swagger documentation: http://localhost:${port}/swagger`);
  logger.log(`API base URL: http://localhost:${port}/api/v1`);
}

bootstrap();

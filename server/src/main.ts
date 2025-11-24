import { NestFactory, Reflector } from '@nestjs/core';
import { VersioningType, Logger } from '@nestjs/common';
import { AppModule } from './app/app.module';
import { IoAdapter } from '@nestjs/platform-socket.io';
import { CombinedAuthGuard } from './auth/guards/combined-auth.guard';
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
  const reflector = app.get(Reflector);
  app.useGlobalGuards(new CombinedAuthGuard(reflector));

  // Swagger configuration
  const config = new DocumentBuilder()
    .setTitle('Chatty API')
    .setDescription('Chatty backend API documentation')
    .setVersion('1.0')
    .addBearerAuth(
      {
        type: 'http',
        scheme: 'bearer',
        bearerFormat: 'JWT',
        description: 'JWT Access Token or API Key (JWT-based)',
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
        description: 'API Key (JWT-based) in header',
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

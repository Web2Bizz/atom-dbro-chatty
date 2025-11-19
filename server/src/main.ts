import { NestFactory, Reflector } from '@nestjs/core';
import { ValidationPipe } from '@nestjs/common';
import { AppModule } from './app/app.module';
import { IoAdapter } from '@nestjs/platform-socket.io';
import { ApiKeyGuard } from './auth/guards/api-key.guard';
import { AuthService } from './auth/auth.service';

async function bootstrap() {
  const app = await NestFactory.create(AppModule);

  // Enable CORS for Socket.io and API
  app.enableCors({
    origin: true,
    credentials: true,
  });

  // Socket.io adapter
  app.useWebSocketAdapter(new IoAdapter(app));

  // Global validation pipe
  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      forbidNonWhitelisted: true,
      transform: true,
    }),
  );

  // Global API Key Guard
  const reflector = app.get(Reflector);
  const authService = app.get(AuthService);
  app.useGlobalGuards(new ApiKeyGuard(authService, reflector));

  const port = process.env.PORT || 3000;
  await app.listen(port);
  console.log(`Application is running on: http://localhost:${port}`);
}

bootstrap();

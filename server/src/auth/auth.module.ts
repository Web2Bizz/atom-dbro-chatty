import { Module } from '@nestjs/common';
import { JwtModule } from '@nestjs/jwt';
import { PassportModule } from '@nestjs/passport';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { AuthController } from './auth.controller';
import { AuthService } from './auth.service';
import { JwtStrategy } from './strategies/jwt.strategy';
import { ApiKeyJwtStrategy } from './strategies/api-key-jwt.strategy';
import { JwtAuthGuard } from './guards/jwt-auth.guard';
import { ApiKeyJwtGuard } from './guards/api-key-jwt.guard';
import { CombinedAuthGuard } from './guards/combined-auth.guard';
import { ScopeGuard } from './guards/scope.guard';

@Module({
  imports: [
    PassportModule,
    JwtModule.registerAsync({
      imports: [ConfigModule],
      useFactory: async (configService: ConfigService) => ({
        secret: configService.get<string>('JWT_SECRET') || 'your-secret-key',
        signOptions: {
          expiresIn: configService.get<string>('JWT_EXPIRES_IN') || '15m',
        },
      }),
      inject: [ConfigService],
    }),
  ],
  controllers: [AuthController],
  providers: [
    AuthService,
    JwtStrategy,
    ApiKeyJwtStrategy,
    JwtAuthGuard,
    ApiKeyJwtGuard,
    CombinedAuthGuard,
    ScopeGuard,
  ],
  exports: [AuthService, JwtModule, CombinedAuthGuard, ScopeGuard],
})
export class AuthModule {}

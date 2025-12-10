import { Test, TestingModule } from '@nestjs/testing';
import { ExecutionContext, BadRequestException, UnauthorizedException } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import * as passport from 'passport';
import { CombinedAuthGuard } from '../combined-auth.guard';
import { IS_PUBLIC_KEY } from '../../decorators/public.decorator';

// Мокируем passport
jest.mock('passport', () => ({
  authenticate: jest.fn(),
}));

describe('CombinedAuthGuard', () => {
  let guard: CombinedAuthGuard;
  let reflector: Reflector;
  let mockContext: ExecutionContext;
  let mockRequest: any;

  beforeEach(() => {
    // Создаем мок запроса
    mockRequest = {
      headers: {},
      query: {},
      method: 'GET',
      url: '/test',
      ip: '127.0.0.1',
      user: undefined,
    };

    // Создаем мок response
    const mockResponse = {
      status: jest.fn().mockReturnThis(),
      json: jest.fn().mockReturnThis(),
      send: jest.fn().mockReturnThis(),
    };

    // Создаем мок ExecutionContext
    mockContext = {
      switchToHttp: jest.fn().mockReturnValue({
        getRequest: jest.fn().mockReturnValue(mockRequest),
        getResponse: jest.fn().mockReturnValue(mockResponse),
      }),
      getHandler: jest.fn(),
      getClass: jest.fn(),
    } as any;

    // Создаем мок Reflector
    reflector = {
      getAllAndOverride: jest.fn().mockReturnValue(false),
    } as any;

    // Создаем guard
    guard = new CombinedAuthGuard(reflector);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('Public endpoints', () => {
    it('should allow access to public endpoints without authentication', async () => {
      reflector.getAllAndOverride = jest.fn().mockReturnValue(true);

      const result = await guard.canActivate(mockContext);

      expect(result).toBe(true);
      expect(passport.authenticate).not.toHaveBeenCalled();
    });
  });

  describe('JWT Authentication', () => {
    it('should successfully authenticate with valid JWT token', async () => {
      mockRequest.headers.authorization = 'Bearer valid-jwt-token';
      const mockUser = {
        userId: 'user-123',
        username: 'testuser',
        type: 'jwt',
      };

      (passport.authenticate as jest.Mock).mockImplementation(
        (strategy: string, options: any, callback?: Function) => {
          const cb = callback || options; // Поддержка как 2, так и 3 аргументов
          return (req: any, res: any, next: Function) => {
            req.user = mockUser;
            cb(null, mockUser, null);
            return next();
          };
        },
      );

      const result = await guard.canActivate(mockContext);

      expect(result).toBe(true);
      expect(passport.authenticate).toHaveBeenCalledWith('jwt', { session: false }, expect.any(Function));
      expect(mockRequest.user).toEqual(mockUser);
    });

    it('should throw UnauthorizedException for invalid JWT token', async () => {
      mockRequest.headers.authorization = 'Bearer invalid-token';

      (passport.authenticate as jest.Mock).mockImplementation(
        (strategy: string, options: any, callback?: Function) => {
          const cb = callback || options;
          return (req: any, res: any, next: Function) => {
            cb(new UnauthorizedException('Invalid token'), null, null);
          };
        },
      );

      await expect(guard.canActivate(mockContext)).rejects.toThrow(UnauthorizedException);
      expect(passport.authenticate).toHaveBeenCalledWith('jwt', { session: false }, expect.any(Function));
    });

    it('should throw UnauthorizedException if request.user is not set after authentication', async () => {
      mockRequest.headers.authorization = 'Bearer valid-token';

      (passport.authenticate as jest.Mock).mockImplementation(
        (strategy: string, options: any, callback?: Function) => {
          const cb = callback || options;
          return (req: any, res: any, next: Function) => {
            // Не устанавливаем req.user
            cb(null, {}, null);
          };
        },
      );

      await expect(guard.canActivate(mockContext)).rejects.toThrow(UnauthorizedException);
      expect(passport.authenticate).toHaveBeenCalledWith('jwt', { session: false }, expect.any(Function));
    });

    it('should throw UnauthorizedException if user.userId is missing', async () => {
      mockRequest.headers.authorization = 'Bearer valid-token';

      (passport.authenticate as jest.Mock).mockImplementation(
        (strategy: string, options: any, callback?: Function) => {
          const cb = callback || options;
          return (req: any, res: any, next: Function) => {
            req.user = { username: 'test', type: 'jwt' }; // нет userId
            cb(null, req.user, null);
          };
        },
      );

      await expect(guard.canActivate(mockContext)).rejects.toThrow(UnauthorizedException);
    });
  });

  describe('API Key Authentication', () => {
    it('should successfully authenticate with valid API key in header', async () => {
      mockRequest.headers['x-api-key'] = 'valid-api-key';
      const mockUser = {
        apiKeyId: 'api-key-123',
        userId: 'user-123',
        scopes: ['allow-all'],
        type: 'api-key',
      };

      (passport.authenticate as jest.Mock).mockImplementation(
        (strategy: string, options: any, callback?: Function) => {
          const cb = callback || options;
          return (req: any, res: any, next: Function) => {
            req.user = mockUser;
            cb(null, mockUser, null);
          };
        },
      );

      const result = await guard.canActivate(mockContext);

      expect(result).toBe(true);
      expect(passport.authenticate).toHaveBeenCalledWith('api-key-jwt', { session: false }, expect.any(Function));
      expect(mockRequest.user).toEqual(mockUser);
    });

    it('should successfully authenticate with API key in query parameter', async () => {
      mockRequest.query.apiKey = 'valid-api-key';
      const mockUser = {
        apiKeyId: 'api-key-123',
        userId: 'user-123',
        scopes: ['allow-all'],
        type: 'api-key',
      };

      (passport.authenticate as jest.Mock).mockImplementation(
        (strategy: string, options: any, callback?: Function) => {
          const cb = callback || options;
          return (req: any, res: any, next: Function) => {
            req.user = mockUser;
            cb(null, mockUser, null);
          };
        },
      );

      const result = await guard.canActivate(mockContext);

      expect(result).toBe(true);
      expect(passport.authenticate).toHaveBeenCalledWith('api-key-jwt', { session: false }, expect.any(Function));
      expect(mockRequest.user).toEqual(mockUser);
    });

    it('should support different case variations of X-API-Key header', async () => {
      mockRequest.headers['X-API-Key'] = 'valid-api-key';
      const mockUser = {
        apiKeyId: 'api-key-123',
        userId: 'user-123',
        type: 'api-key',
      };

      (passport.authenticate as jest.Mock).mockImplementation(
        (strategy: string, options: any, callback?: Function) => {
          const cb = callback || options;
          return (req: any, res: any, next: Function) => {
            req.user = mockUser;
            cb(null, mockUser, null);
          };
        },
      );

      const result = await guard.canActivate(mockContext);

      expect(result).toBe(true);
      expect(passport.authenticate).toHaveBeenCalledWith('api-key-jwt', { session: false }, expect.any(Function));
    });

    it('should throw UnauthorizedException for invalid API key', async () => {
      mockRequest.headers['x-api-key'] = 'invalid-api-key';

      (passport.authenticate as jest.Mock).mockImplementation(
        (strategy: string, options: any, callback?: Function) => {
          const cb = callback || options;
          return (req: any, res: any, next: Function) => {
            cb(new UnauthorizedException('Invalid API key'), null, null);
          };
        },
      );

      await expect(guard.canActivate(mockContext)).rejects.toThrow(UnauthorizedException);
      expect(passport.authenticate).toHaveBeenCalledWith('api-key-jwt', { session: false }, expect.any(Function));
    });

    it('should throw UnauthorizedException if request.user is not set after API key authentication', async () => {
      mockRequest.headers['x-api-key'] = 'valid-api-key';

      (passport.authenticate as jest.Mock).mockImplementation(
        (strategy: string, options: any, callback?: Function) => {
          const cb = callback || options;
          return (req: any, res: any, next: Function) => {
            // Не устанавливаем req.user
            cb(null, {}, null);
          };
        },
      );

      await expect(guard.canActivate(mockContext)).rejects.toThrow(UnauthorizedException);
    });

    it('should throw UnauthorizedException if user has neither userId nor apiKeyId', async () => {
      mockRequest.headers['x-api-key'] = 'valid-api-key';

      (passport.authenticate as jest.Mock).mockImplementation(
        (strategy: string, options: any, callback?: Function) => {
          const cb = callback || options;
          return (req: any, res: any, next: Function) => {
            req.user = { scopes: [], type: 'api-key' }; // нет userId и apiKeyId
            cb(null, req.user, null);
          };
        },
      );

      await expect(guard.canActivate(mockContext)).rejects.toThrow(UnauthorizedException);
    });
  });

  describe('Mutual exclusion', () => {
    it('should throw BadRequestException when both Authorization and X-API-Key headers are present', async () => {
      mockRequest.headers.authorization = 'Bearer valid-jwt-token';
      mockRequest.headers['x-api-key'] = 'valid-api-key';

      await expect(guard.canActivate(mockContext)).rejects.toThrow(BadRequestException);
      await expect(guard.canActivate(mockContext)).rejects.toThrow(
        'Cannot use both Authorization and X-API-Key headers simultaneously. Use only one authentication method.',
      );
      expect(passport.authenticate).not.toHaveBeenCalled();
    });

    it('should throw BadRequestException when Authorization header and query apiKey are both present', async () => {
      mockRequest.headers.authorization = 'Bearer valid-jwt-token';
      mockRequest.query.apiKey = 'valid-api-key';

      await expect(guard.canActivate(mockContext)).rejects.toThrow(BadRequestException);
      expect(passport.authenticate).not.toHaveBeenCalled();
    });
  });

  describe('No authentication', () => {
    it('should throw UnauthorizedException when no authentication headers are provided', async () => {
      mockRequest.headers = {};
      mockRequest.query = {};

      await expect(guard.canActivate(mockContext)).rejects.toThrow(UnauthorizedException);
      await expect(guard.canActivate(mockContext)).rejects.toThrow(
        'Authentication required. Provide either Authorization Bearer token or X-API-Key header.',
      );
      expect(passport.authenticate).not.toHaveBeenCalled();
    });

    it('should throw UnauthorizedException when Authorization header is present but not Bearer', async () => {
      mockRequest.headers.authorization = 'Basic credentials';

      await expect(guard.canActivate(mockContext)).rejects.toThrow(UnauthorizedException);
      expect(passport.authenticate).not.toHaveBeenCalled();
    });
  });

  describe('Error handling', () => {
    it('should handle passport authentication errors gracefully', async () => {
      mockRequest.headers.authorization = 'Bearer token';

      (passport.authenticate as jest.Mock).mockImplementation(
        (strategy: string, options: any, callback?: Function) => {
          const cb = callback || options;
          return (req: any, res: any, next: Function) => {
            cb(new UnauthorizedException('Token expired'), null, null);
          };
        },
      );

      await expect(guard.canActivate(mockContext)).rejects.toThrow(UnauthorizedException);
    });

    it('should handle passport authentication returning false', async () => {
      mockRequest.headers.authorization = 'Bearer token';

      (passport.authenticate as jest.Mock).mockImplementation(
        (strategy: string, options: any, callback?: Function) => {
          const cb = callback || options;
          return (req: any, res: any, next: Function) => {
            cb(null, false, { message: 'Authentication failed' });
          };
        },
      );

      await expect(guard.canActivate(mockContext)).rejects.toThrow(UnauthorizedException);
    });
  });
});


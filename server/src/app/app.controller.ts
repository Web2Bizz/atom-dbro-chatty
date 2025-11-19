import { Controller, Get, Version } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse, ApiSecurity } from '@nestjs/swagger';
import { AppService } from './app.service';
import { Public } from '../auth/decorators/public.decorator';
import { GetApiKey } from '../auth/decorators/api-key.decorator';
import { ApiKey } from '../database/schema/api-keys';

@ApiTags('app')
@Controller()
export class AppController {
  constructor(private readonly appService: AppService) {}

  @Public()
  @Get()
  @ApiOperation({ summary: 'Get welcome message' })
  @ApiResponse({ status: 200, description: 'Returns welcome message' })
  getHello(): string {
    return this.appService.getHello();
  }

  @Public()
  @Get('health')
  @ApiOperation({ summary: 'Health check endpoint' })
  @ApiResponse({ status: 200, description: 'Returns server health status' })
  getHealth() {
    return this.appService.getHealth();
  }

  @Get('protected')
  @ApiOperation({ summary: 'Protected endpoint example' })
  @ApiSecurity('api-key')
  @ApiSecurity('bearer')
  @ApiResponse({ status: 200, description: 'Returns protected data' })
  @ApiResponse({ status: 401, description: 'Unauthorized - API key required' })
  getProtected(@GetApiKey() apiKey: ApiKey) {
    return {
      message: 'This is a protected endpoint',
      apiKeyInfo: {
        id: apiKey.id,
        name: apiKey.name,
        lastUsedAt: apiKey.lastUsedAt,
      },
    };
  }
}

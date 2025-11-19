import { Controller, Get } from '@nestjs/common';
import { AppService } from './app.service';
import { Public } from '../auth/decorators/public.decorator';
import { GetApiKey } from '../auth/decorators/api-key.decorator';
import { ApiKey } from '../database/schema/api-keys';

@Controller()
export class AppController {
  constructor(private readonly appService: AppService) {}

  @Public()
  @Get()
  getHello(): string {
    return this.appService.getHello();
  }

  @Public()
  @Get('health')
  getHealth() {
    return this.appService.getHealth();
  }

  @Get('protected')
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


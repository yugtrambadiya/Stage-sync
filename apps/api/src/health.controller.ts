import { Controller, Get } from '@nestjs/common';
import { ApiTags, ApiOperation } from '@nestjs/swagger';
import { PrismaService } from '@smart-anchor/database';

@ApiTags('Health')
@Controller('health')
export class HealthController {
  constructor(private readonly prisma: PrismaService) {}

  @Get()
  @ApiOperation({ summary: 'Health check — includes real DB connectivity test' })
  async getHealth() {
    const dbUp = await this.prisma.ping();
    return {
      status:    dbUp ? 'ok' : 'degraded',
      db:        dbUp ? 'up' : 'down',
      service:   'stage-sync-api',
      timestamp: new Date().toISOString(),
    };
  }
}

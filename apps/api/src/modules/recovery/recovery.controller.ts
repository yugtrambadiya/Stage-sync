import { Controller, Post, HttpCode, HttpStatus, ForbiddenException, Logger } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse } from '@nestjs/swagger';
import { PrismaService } from '@smart-anchor/database';
import { ScheduleEventsPublisher } from '../../common/events/schedule-events.publisher';
import { runReset } from '../../seed/reset';
import { PrismaClient } from '@prisma/client';

/**
 * Demo reset endpoint.
 * Blocked in production unless ALLOW_DEMO_RESET=true is explicitly set.
 * Returns 403 otherwise.
 */
@ApiTags('Demo Tools')
@Controller()
export class RecoveryController {
  private readonly logger = new Logger(RecoveryController.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly publisher: ScheduleEventsPublisher,
  ) {}

  @Post(['api/reset', 'reset'])
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary: 'Reset the demo database',
    description: 'Wipes and re-seeds in < 2s. Blocked in NODE_ENV=production unless ALLOW_DEMO_RESET=true.',
  })
  @ApiResponse({ status: 200, description: '{ success: true, message: "Demo data reset successfully." }' })
  @ApiResponse({ status: 403, description: 'Blocked in production' })
  async reset() {
    const isProduction = process.env.NODE_ENV === 'production';
    const allowReset   = process.env.ALLOW_DEMO_RESET === 'true';

    if (isProduction && !allowReset) {
      throw new ForbiddenException({
        code:    'DEMO_RESET_DISABLED',
        message: 'Demo reset is disabled in production. Set ALLOW_DEMO_RESET=true to enable.',
      });
    }

    this.logger.warn('🔄 Demo reset triggered');
    const start = Date.now();

    // runReset needs a PrismaClient — we cast our PrismaService (which extends PrismaClient)
    await runReset(this.prisma as unknown as PrismaClient);

    const ms = Date.now() - start;
    this.logger.log(`Reset completed in ${ms}ms`);

    // Notify Teammate 2 to broadcast reset to all WS clients
    this.publisher.publish({
      type:    'demo.reset',
      eventId: 'evt_technova_2025',
      at:      new Date().toISOString(),
      data:    { message: 'Demo data has been reset.' },
    });

    return { success: true, message: 'Demo data reset successfully.' };
  }
}

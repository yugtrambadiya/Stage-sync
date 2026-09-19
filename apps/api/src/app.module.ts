import { Module, MiddlewareConsumer } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { join } from 'path';
import { HealthController } from './health.controller';
import { EventsModule } from './modules/events/events.module';
import { SpeakersModule } from './modules/speakers/speakers.module';
import { AgendaModule } from './modules/agenda/agenda.module';
import { ScheduleChangesModule } from './modules/schedule-changes/schedule-changes.module';
import { RecoveryModule } from './modules/recovery/recovery.module';
import { LiveModule } from './modules/live/live.module';
import { AiModule } from './modules/ai/ai.module';
import { PrismaModule } from './common/prisma/prisma.module';
import { ScheduleEventsModule } from './common/events/schedule-events.module';
import { RequestIdMiddleware } from './common/middleware/request-id.middleware';

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
      envFilePath: [join(process.cwd(), '..', '..', '.env'), join(process.cwd(), '.env'), '.env'],
    }),
    // Global infrastructure
    PrismaModule,
    ScheduleEventsModule,
    // Feature modules
    EventsModule,
    SpeakersModule,
    AgendaModule,
    ScheduleChangesModule,
    RecoveryModule,
    LiveModule,
    AiModule,
  ],
  controllers: [HealthController],
})
export class AppModule {
  configure(consumer: MiddlewareConsumer) {
    consumer.apply(RequestIdMiddleware).forRoutes('*');
  }
}

import { Module } from '@nestjs/common';
import { LiveGateway } from './live.gateway';
import { ScheduleEventsModule } from '../../common/events/schedule-events.module';

@Module({
  imports: [ScheduleEventsModule],
  providers: [LiveGateway],
  exports: [LiveGateway],
})
export class LiveModule {}

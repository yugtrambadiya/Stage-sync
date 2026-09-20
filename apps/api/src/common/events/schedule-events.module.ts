import { Module, Global } from '@nestjs/common';
import { ScheduleEventsPublisher } from './schedule-events.publisher';

@Global()
@Module({
  providers: [ScheduleEventsPublisher],
  exports: [ScheduleEventsPublisher],
})
export class ScheduleEventsModule {}

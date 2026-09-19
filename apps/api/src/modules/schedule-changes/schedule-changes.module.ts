import { Module } from '@nestjs/common';
import { ScheduleChangesController } from './schedule-changes.controller';
import { AgendaModule } from '../agenda/agenda.module';

@Module({
  imports: [AgendaModule],
  controllers: [ScheduleChangesController],
})
export class ScheduleChangesModule {}

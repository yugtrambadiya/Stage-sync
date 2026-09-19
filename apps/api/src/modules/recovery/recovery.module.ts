import { Module } from '@nestjs/common';
import { RecoveryController } from './recovery.controller';

@Module({
  controllers: [RecoveryController],
})
export class RecoveryModule {}

import { Module, Global } from '@nestjs/common';
import { PrismaService } from '@smart-anchor/database';

/**
 * Global PrismaModule — import once in AppModule.
 * All feature modules can inject PrismaService without re-importing this module.
 */
@Global()
@Module({
  providers: [PrismaService],
  exports: [PrismaService],
})
export class PrismaModule {}

import { Module } from "@nestjs/common";
import { PrismaModule } from "./prisma.module";
import { HealthController } from "./health.controller";
import { EventsModule } from "./modules/events/events.module";
import { LiveModule } from "./modules/live/live.module";
import { AiModule } from "./modules/ai/ai.module";

@Module({
  imports: [PrismaModule, EventsModule, LiveModule, AiModule],
  controllers: [HealthController],
})
export class AppModule {}

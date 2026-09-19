import { Module } from "@nestjs/common";
import { ConfigModule } from "@nestjs/config";
import { HealthController } from "./health.controller";
import { EventsModule } from "./modules/events/events.module";
import { LiveModule } from "./modules/live/live.module";
import { AiModule } from "./modules/ai/ai.module";
import { join } from "path";

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
      envFilePath: join(process.cwd(), '..', '..', '.env'),
    }),
    EventsModule,
    LiveModule,
    AiModule,
  ],
  controllers: [HealthController]
})
export class AppModule {}


import { Body, Controller, Post } from "@nestjs/common";
import { AiService, GenerateScriptDto } from "./ai.service";

@Controller("ai")
export class AiController {
  constructor(private readonly aiService: AiService) {}

  @Post("generate-script")
  generateScript(@Body() body: GenerateScriptDto) {
    return this.aiService.generateScript(body);
  }

  @Post("delay-recovery")
  delayRecovery(
    @Body()
    body: {
      eventName?: string;
      delayedItemTitle: string;
      delayMinutes: number;
      delayReason?: string;
      nextSpeakerName?: string;
    },
  ) {
    return this.aiService.delayRecovery(body);
  }

  // Backward compatibility endpoint
  @Post("transition")
  legacyTransition(
    @Body()
    body: {
      current: string;
      next: string;
      delayMinutes?: number;
    },
  ) {
    return this.aiService.generateScript({
      type: "TRANSITION",
      currentSession: body.current,
      nextSession: body.next,
      delayMinutes: body.delayMinutes,
    });
  }
}

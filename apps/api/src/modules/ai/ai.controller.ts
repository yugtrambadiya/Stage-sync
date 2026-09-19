import { Body, Controller, Post } from "@nestjs/common";
import { AiService } from "./ai.service";

@Controller("ai")
export class AiController {
  constructor(private readonly aiService: AiService) {}

  @Post("transition")
  transition(@Body() body: { current: string; next: string; delayMinutes?: number }) {
    return this.aiService.generateTransition(body);
  }
}

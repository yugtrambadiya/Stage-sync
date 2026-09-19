import { Controller, Post, Body } from '@nestjs/common';
import { AiService } from './ai.service';

class GenerateScriptDto {
  type!: 'OPENING' | 'INTRODUCTION' | 'TRANSITION' | 'CLOSING' | 'ANNOUNCEMENT';
  context!: Record<string, unknown>;
}

@Controller('ai')
export class AiController {
  constructor(private readonly aiService: AiService) {}

  @Post('generate-script')
  generate(@Body() dto: GenerateScriptDto) {
    return this.aiService.generateScript(dto);
  }
}

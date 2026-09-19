import { Body, Controller, Post } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse, ApiBody, ApiProperty } from '@nestjs/swagger';
import { IsString, IsNotEmpty, IsObject, IsIn } from 'class-validator';
import { AiService } from './ai.service';
import { GenerateTransitionDto } from './dto/generate-transition.dto';

export class GenerateScriptDto {
  @ApiProperty({ enum: ['OPENING', 'INTRODUCTION', 'TRANSITION', 'CLOSING', 'ANNOUNCEMENT'] })
  @IsString()
  @IsNotEmpty()
  @IsIn(['OPENING', 'INTRODUCTION', 'TRANSITION', 'CLOSING', 'ANNOUNCEMENT'])
  type!: 'OPENING' | 'INTRODUCTION' | 'TRANSITION' | 'CLOSING' | 'ANNOUNCEMENT';

  @ApiProperty({ type: Object })
  @IsObject()
  context!: Record<string, unknown>;
}

@ApiTags('AI')
@Controller('ai')
export class AiController {
  constructor(private readonly aiService: AiService) {}

  @Post('transition')
  @ApiOperation({
    summary: 'Generate MC stage transition draft',
    description: 'Generates an AI transition announcement draft between current and next sessions, with optional delay context.',
  })
  @ApiBody({ type: GenerateTransitionDto })
  @ApiResponse({
    status: 201,
    description: 'Transition script draft generated successfully',
    schema: {
      example: {
        type: 'TRANSITION',
        draft: 'Thank you for Keynote: "AI at the Edge". We will now move to Talk: "WebAssembly in Production".',
        context: { delayMinutes: 10 },
        requiresApproval: true,
      },
    },
  })
  transition(@Body() body: GenerateTransitionDto) {
    return this.aiService.generateTransition(body);
  }

  @Post('generate-script')
  @ApiOperation({
    summary: 'Generate AI script with Gemini/OpenAI and fallback',
    description: 'Generates MC scripts for opening, speaker introductions, delay transitions, or announcements.',
  })
  generate(@Body() dto: GenerateScriptDto) {
    return this.aiService.generateScript(dto);
  }
}

import { Injectable, Logger } from '@nestjs/common';
import OpenAI from 'openai';
import { FALLBACK_SCRIPTS } from './fallback-scripts';
import { buildOpeningPrompt } from './prompts/opening.prompt';
import { buildIntroductionPrompt } from './prompts/introduction.prompt';
import { buildTransitionPrompt } from './prompts/transition.prompt';

const TIMEOUT_MS = 5000;

@Injectable()
export class AiService {
  private readonly logger = new Logger(AiService.name);
  private openai = new OpenAI({
    apiKey: process.env.GEMINI_API_KEY,
    baseURL: 'https://generativelanguage.googleapis.com/v1beta/openai/',
  });

  async generateScript(params: {
    type: 'OPENING' | 'INTRODUCTION' | 'TRANSITION' | 'CLOSING' | 'ANNOUNCEMENT';
    context: Record<string, unknown>;
  }): Promise<{ content: string; fromCache: boolean }> {
    const prompt = this.buildPrompt(params.type, params.context);

    try {
      const content = await Promise.race([
        this.callLLM(prompt),
        new Promise<never>((_, reject) =>
          setTimeout(() => reject(new Error('LLM timeout')), TIMEOUT_MS),
        ),
      ]);
      return { content, fromCache: false };
    } catch (err) {
      this.logger.warn(`LLM call failed (${(err as Error).message}), using fallback`);
      return {
        content: FALLBACK_SCRIPTS[params.type] ?? FALLBACK_SCRIPTS.ANNOUNCEMENT,
        fromCache: true,
      };
    }
  }

  private async callLLM(prompt: string): Promise<string> {
    const response = await this.openai.chat.completions.create({
      model: 'gemini-2.0-flash',
      messages: [{ role: 'user', content: prompt }],
      max_tokens: 300,
      temperature: 0.7,
    });
    return response.choices[0].message.content ?? '';
  }

  private buildPrompt(type: string, context: Record<string, unknown>): string {
    switch (type) {
      case 'OPENING':
        return buildOpeningPrompt(
          context.eventName as string,
          (context.venue as string) ?? 'the main auditorium',
        );
      case 'INTRODUCTION':
        return buildIntroductionPrompt(context as any);
      case 'TRANSITION':
        return buildTransitionPrompt(
          context.from as string,
          context.to as string,
          context.delayMinutes as number,
        );
      case 'CLOSING':
        return `Write a warm closing script for ${context.eventName}. Thank speakers, sponsors, audience. 3-4 sentences. Return ONLY the script.`;
      case 'ANNOUNCEMENT':
        return `Write a calm audience announcement: "${context.message}". 1-2 sentences, reassuring tone. Return ONLY the script.`;
      default:
        return `Write a professional MC script for: ${JSON.stringify(context)}`;
    }
  }
}

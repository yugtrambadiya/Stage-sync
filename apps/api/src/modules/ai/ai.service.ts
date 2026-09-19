import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import OpenAI from 'openai';
import { FALLBACK_SCRIPTS } from './fallback-scripts';
import { buildOpeningPrompt } from './prompts/opening.prompt';
import { buildIntroductionPrompt } from './prompts/introduction.prompt';
import { buildTransitionPrompt } from './prompts/transition.prompt';

const TIMEOUT_MS = 15000;

@Injectable()
export class AiService {
  private readonly logger = new Logger(AiService.name);
  private openai: OpenAI | null = null;

  constructor(private readonly configService: ConfigService) {}

  generateTransition(input?: {
    current?: string;
    next?: string;
    delayMinutes?: number;
  }) {
    const current = input?.current?.trim() || 'our previous speaker';
    const next = input?.next?.trim() || 'our upcoming presentation';
    const delay = input?.delayMinutes ?? 0;

    let draft = '';
    if (delay > 0) {
      draft = `What an extraordinary and deeply insightful session from ${current}! Let's give them a tremendous, heartfelt round of applause for sharing such brilliance with us today. We are taking a brief ${delay}-minute intermission to let our stage crew prepare the podium for ${next}. Thank you all for your wonderful energy and gracious patience—please enjoy a quick stretch, and we will resume in just a moment!`;
    } else {
      draft = `Let's have another massive, warm round of applause for ${current}! We are so grateful for their time, wisdom, and remarkable presentation. Up next, we have the distinct privilege of welcoming ${next} to the stage. Get ready for an exceptional deep dive—please join me in giving them a warm, enthusiastic welcome!`;
    }

    return {
      type: 'TRANSITION',
      draft,
      context: {
        delayMinutes: delay,
      },
      requiresApproval: true,
    };
  }

  private getClient(): OpenAI | null {
    if (this.openai) return this.openai;

    const apiKey = this.configService.get<string>('GEMINI_API_KEY') || process.env.GEMINI_API_KEY;
    if (!apiKey) {
      this.logger.warn('GEMINI_API_KEY not set — AI will use fallback scripts');
      return null;
    }

    this.openai = new OpenAI({
      apiKey,
      baseURL: 'https://generativelanguage.googleapis.com/v1beta/openai/',
    });
    return this.openai;
  }

  async generateScript(params: {
    type: 'OPENING' | 'INTRODUCTION' | 'TRANSITION' | 'CLOSING' | 'ANNOUNCEMENT';
    context: Record<string, unknown>;
  }): Promise<{ content: string; fromCache: boolean }> {
    const client = this.getClient();

    if (!client) {
      return {
        content: FALLBACK_SCRIPTS[params.type] ?? FALLBACK_SCRIPTS.ANNOUNCEMENT,
        fromCache: true,
      };
    }

    const prompt = this.buildPrompt(params.type, params.context);

    try {
      const content = await Promise.race([
        this.callLLM(client, prompt),
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

  private async callLLM(client: OpenAI, prompt: string): Promise<string> {
    const response = await client.chat.completions.create({
      model: 'gemini-2.0-flash',
      messages: [{ role: 'user', content: prompt }],
      max_tokens: 800,
      temperature: 0.7,
    });
    return response.choices[0]?.message?.content ?? '';
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

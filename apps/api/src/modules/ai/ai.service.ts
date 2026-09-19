import { Injectable } from '@nestjs/common';

@Injectable()
export class AiService {
  generateTransition(input?: {
    current?: string;
    next?: string;
    delayMinutes?: number;
  }) {
    const current = input?.current ?? '';
    const next = input?.next ?? '';
    const delay = input?.delayMinutes ?? 0;

    return {
      type: 'TRANSITION',
      draft: `Thank you for ${current}. We will now move to ${next}.`,
      context: {
        delayMinutes: delay,
      },
      requiresApproval: true,
    };
  }
}

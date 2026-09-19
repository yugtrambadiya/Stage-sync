import { Injectable } from "@nestjs/common";

@Injectable()
export class AiService {
  generateTransition(input: {
    current: string;
    next: string;
    delayMinutes?: number;
  }) {
    const delay = input.delayMinutes ?? 0;

    return {
      type: "TRANSITION",
      draft: `Thank you for ${input.current}. We will now move to ${input.next}.`,
      context: {
        delayMinutes: delay
      },
      requiresApproval: true
    };
  }
}

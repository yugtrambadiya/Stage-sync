import { Injectable } from "@nestjs/common";

export type ScriptKind =
  | "OPENING"
  | "INTRODUCTION"
  | "TRANSITION"
  | "CLOSING"
  | "DELAY_RECOVERY"
  | "ANNOUNCEMENT";

export interface GenerateScriptDto {
  type: ScriptKind;
  tone?: "energetic" | "formal" | "warm" | "humorous";
  eventName?: string;
  eventType?: string;
  speakerName?: string;
  speakerDesignation?: string;
  speakerOrg?: string;
  speakerTopic?: string;
  speakerBio?: string;
  currentSession?: string;
  nextSession?: string;
  delayMinutes?: number;
  delayReason?: string;
  announcementDetails?: string;
}

@Injectable()
export class AiService {
  async generateScript(input: GenerateScriptDto) {
    const tone = input.tone ?? "energetic";
    const eventName = input.eventName || "College Stage Event";
    const apiKey = process.env.OPENAI_API_KEY;

    if (apiKey && apiKey.trim().length > 10) {
      try {
        const response = await fetch("https://api.openai.com/v1/chat/completions", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${apiKey}`,
          },
          body: JSON.stringify({
            model: "gpt-4o-mini",
            messages: [
              {
                role: "system",
                content:
                  "You are an elite live stage anchor coach and speechwriter for college events, hackathons, and tech summits. Write dynamic, teleprompter-ready scripts with clear anchor stage directions in [BRACKETS]. Keep it punchy, spoken-word friendly, and engaging.",
              },
              {
                role: "user",
                content: this.buildPrompt(input),
              },
            ],
            temperature: 0.7,
          }),
        });

        if (response.ok) {
          const data = await response.json();
          const content = data.choices?.[0]?.message?.content;
          if (content) {
            return {
              type: input.type,
              tone,
              content,
              estimatedSeconds: Math.round(content.split(" ").length / 2.5),
              source: "openai",
            };
          }
        }
      } catch (err) {
        console.warn("OpenAI API call failed, falling back to local AI engine:", err);
      }
    }

    // High-quality contextual fallback script generator
    const script = this.generateLocalScript(input);
    return {
      type: input.type,
      tone,
      content: script.content,
      stageDirections: script.stageDirections,
      estimatedSeconds: script.estimatedSeconds,
      source: "stage-copilot-engine",
    };
  }

  async delayRecovery(input: {
    eventName?: string;
    delayedItemTitle: string;
    delayMinutes: number;
    delayReason?: string;
    nextSpeakerName?: string;
  }) {
    const delay = input.delayMinutes || 10;
    const reason = input.delayReason || "brief technical calibration";

    return {
      alertType: "SCHEDULE_SHIFT",
      delayMinutes: delay,
      anchorSpeech: `[WARM SMILE, RELAXED STANCE]\n"Folks, great code and great ideas take just a moment to compile! We are taking a quick ${delay}-minute intermission while our stage crew ensures top-tier acoustics for the upcoming session: '${input.delayedItemTitle}'.\n\nWhile we wait, turn to the person on your left and right—find out what project they're building today! We'll be right back in exactly ${delay} minutes."`,
      fillerActionItems: [
        "Run an impromptu 60-second audience poll: 'Who had more than 3 cups of coffee today?'",
        "Give a fast shoutout to campus event sponsors and partner clubs.",
        "Remind teams about the Discord/Slack channel and Wi-Fi access credentials.",
      ],
      suggestedBufferSeconds: delay * 60,
    };
  }

  private buildPrompt(input: GenerateScriptDto): string {
    return `Generate a live stage ${input.type} script with a ${input.tone} tone for the event "${input.eventName}".
Details:
- Type: ${input.type}
- Current Session: ${input.currentSession ?? "N/A"}
- Next Session: ${input.nextSession ?? "N/A"}
- Speaker: ${input.speakerName ?? "N/A"} (${input.speakerDesignation ?? ""}, ${input.speakerOrg ?? ""})
- Topic: ${input.speakerTopic ?? "N/A"}
- Delay / Notes: ${input.delayMinutes ? `${input.delayMinutes} mins delay` : "On schedule"}
Provide a teleprompter-friendly anchor script with cue notes in brackets.`;
  }

  private generateLocalScript(input: GenerateScriptDto): {
    content: string;
    stageDirections: string[];
    estimatedSeconds: number;
  } {
    const eventName = input.eventName || "InnovateX 2026";
    const tone = input.tone || "energetic";

    switch (input.type) {
      case "OPENING": {
        if (tone === "formal") {
          return {
            content: `[STAND TALL AT CENTER STAGE, CONFIDENT GAZE]\n"A very pleasant morning to our esteemed patrons, respected faculty members, industry leaders, and our vibrant student community. Welcome to ${eventName}.\n\nToday marks a congregation of intellectual curiosity and collaborative innovation. Over the next several hours, we shall witness groundbreaking keynotes, technical exchanges, and creative problem solving.\n\n[PAUSE, SCAN THE AUDIENCE]\nBefore we commence, kindly ensure all personal mobile devices are switched to silent mode. Without further delay, let us inaugurate today's proceedings."`,
            stageDirections: ["Maintain steady eye contact", "Clear vocal projection", "Pause for opening applause"],
            estimatedSeconds: 45,
          };
        }
        return {
          content: `[ENERGETIC WALK TO CENTER STAGE, BIG SMILE]\n"Good morning innovators, creators, and future tech leaders! Welcome to ${eventName}! Let me hear some noise from the back row!\n\n[PAUSE FOR AUDIENCE CHEER AND APPLAUSE]\nLook around this auditorium. Every game-changing startup, every open-source breakthrough, and every visionary product started with people sitting in a room just like this, asking: 'What if?'\n\nToday is your arena. We have world-class speakers, fierce challenges, and unstoppable energy. Strap in, get ready to be inspired, and let's get ${eventName} started!"`,
          stageDirections: ["High energy delivery", "Gesture broadly across both wings", "Wait for cheer to subside"],
          estimatedSeconds: 40,
        };
      }

      case "INTRODUCTION": {
        const name = input.speakerName || "our distinguished speaker";
        const role = input.speakerDesignation ? `${input.speakerDesignation}` : "industry leader";
        const org = input.speakerOrg ? ` at ${input.speakerOrg}` : "";
        const topic = input.speakerTopic ? ` on '${input.speakerTopic}'` : "";

        return {
          content: `[TURN SLIGHTLY TOWARDS STAGE ENTRANCE, RAISE RIGHT HAND]\n"It is now our distinct privilege to introduce a speaker whose work is transforming the frontier of technology.\n\nServing as ${role}${org}, they have spearheaded visionary initiatives and inspired thousands of builders worldwide.\n\nToday, they join us on stage to share invaluable insights${topic}.\n\n[BUILD CRESCENDO, ENERGETIC TONE]\nLadies and gentlemen, please put your hands together and give a resounding ${eventName} welcome to... ${name}!"`,
          stageDirections: ["Crescendo vocal delivery on speaker's name", "Lead the auditorium applause", "Step back and hand over microphone"],
          estimatedSeconds: 35,
        };
      }

      case "TRANSITION": {
        const current = input.currentSession || "that insightful presentation";
        const next = input.nextSession || "our next agenda item";

        return {
          content: `[RE-ENTER FROM STAGE LEFT WITH ENTHUSIASTIC APPLAUSE]\n"What an extraordinary session! Let's give another massive round of appreciation for ${current}!\n\n[BRIEF PAUSE FOR APPLAUSE]\nEvery note, every architectural pattern, and every piece of wisdom shared on that stage proves why learning never stops.\n\nNow, shifting gears to the next milestone in our schedule: get ready for ${next}.\n\n[GESTURE FORWARD]\nKeep that momentum high, because we are diving right in!"`,
          stageDirections: ["Acknowledge departing speaker", "Smoothly pivot attention to next block", "Maintain stage tempo"],
          estimatedSeconds: 30,
        };
      }

      case "CLOSING": {
        return {
          content: `[CENTER STAGE, WARM APPRECIATIVE EXPRESSION]\n"Distinguished dignitaries, mentors, volunteers, and every passionate attendee—we have reached the conclusion of our main stage program for ${eventName}.\n\nWhat made today truly unforgettable wasn't just the code or the presentations; it was the relentless curiosity and collaborative spirit in this auditorium.\n\nA huge thank you to our organizing committee, our technical volunteers, and our supportive faculty. Have a fantastic continuation of the event, and keep building the future!"`,
          stageDirections: ["Bow slightly in appreciation", "Lead concluding round of applause", "Remind audience of exit protocols"],
          estimatedSeconds: 40,
        };
      }

      case "DELAY_RECOVERY": {
        const mins = input.delayMinutes || 10;
        return {
          content: `[CALM, PLAYFUL, ENGAGING SMILE]\n"Hey everyone! Quick backstage update: great things take just an extra few moments to calibrate, and our stage setup for ${input.nextSession || "the upcoming session"} will be live in just about ${mins} minutes.\n\n[QUICK INTERACTION]\nWhile our tech crew does their magic: quick question for the audience—how many of you are already debugging your first prototype today? Raise your hands!\n\nStay seated, network with your neighbors, and we will resume in exactly ${mins} minutes."`,
          stageDirections: ["Disarm tension with humor", "Do not blame anyone for delays", "Engage audience directly"],
          estimatedSeconds: 30,
        };
      }

      case "ANNOUNCEMENT": {
        const details = input.announcementDetails || "an important stage update";
        return {
          content: `[CLEAR, AUTHORITATIVE YET FRIENDLY VOICE]\n"Attention please, ladies and gentlemen! We have a quick, essential announcement for all participants:\n\n${details}\n\nThank you for your attention, and let's keep the energy rolling!"`,
          stageDirections: ["Pause ambient music if any", "Speak with deliberate clarity", "Repeat critical location/time twice"],
          estimatedSeconds: 20,
        };
      }

      default:
        return {
          content: `Welcome to ${eventName}! Let us proceed to the next activity on our schedule.`,
          stageDirections: ["Standard stage presence"],
          estimatedSeconds: 15,
        };
    }
  }
}

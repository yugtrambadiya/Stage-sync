export function buildIntroductionPrompt(speaker: {
  name: string;
  topic: string;
  organization: string;
  bio: string;
}): string {
  const bio = speaker.bio?.trim() || `a distinguished professional from ${speaker.organization}`;
  const topic = speaker.topic?.trim() || 'an exciting topic';
  return `You are a professional event anchor. Write a 2-3 sentence speaker introduction.
Speaker: ${speaker.name}
Organization: ${speaker.organization}
Topic: ${topic}
Bio: ${bio}
Requirements: Enthusiastic but professional. Highlight expertise. End with "Please welcome ${speaker.name}!".
Return ONLY the script text.`;
}

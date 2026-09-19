export function buildOpeningPrompt(eventName: string, venue: string): string {
  return `You are a professional event anchor. Write a warm, energetic opening script for a tech conference.
Event: ${eventName}
Venue: ${venue}
Requirements: 3-4 sentences. Welcoming tone. Mention excitement for the day ahead. End with a call to attention.
Return ONLY the script text, no quotes, no stage directions.`;
}

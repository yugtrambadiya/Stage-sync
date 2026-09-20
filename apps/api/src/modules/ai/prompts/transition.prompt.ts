export function buildTransitionPrompt(from: string, to: string, delayMinutes?: number): string {
  const delayNote = delayMinutes
    ? `There is a ${delayMinutes}-minute schedule adjustment. Express deep, sincere gratitude for the rich presentation just delivered, warmly thank the audience for their wonderful energy, and gracefully frame the brief buffer as a refreshing moment to stretch and network before the next session.`
    : `Express genuine, heartfelt appreciation and applause for the speaker who just finished, and build enthusiastic, inspiring anticipation for the next presenter.`;

  return `You are a world-class, charismatic keynote master of ceremonies (MC). Write an appreciative, eloquent, and warm stage transition script.
Previous session: ${from}
Next session: ${to}
${delayNote}
Requirements:
- 2-3 sentences of conversational, high-warmth broadcast prose.
- Generously appreciate and praise the previous speaker's expertise, depth, and contributions.
- Introduce the upcoming session with infectious enthusiasm and respect.
- Return ONLY the spoken teleprompter script text.`;
}

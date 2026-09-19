export function buildTransitionPrompt(from: string, to: string, delayMinutes?: number): string {
  const delayNote = delayMinutes
    ? `Note: there is a ${delayMinutes}-minute delay. Acknowledge it gracefully without alarming the audience.`
    : '';
  return `You are a professional event anchor. Write a smooth transition script between sessions.
Previous session: ${from}
Next session: ${to}
${delayNote}
Requirements: 2-3 sentences. Keep energy positive. Bridge the two topics naturally.
Return ONLY the script text.`;
}

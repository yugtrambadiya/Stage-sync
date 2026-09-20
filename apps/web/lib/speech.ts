/**
 * Professional Broadcast Speech Synthesizer
 * Produces formal, humanized, stage-ready audio playback for AI teleprompter scripts.
 */

export function getBestBroadcastVoice(): SpeechSynthesisVoice | null {
  if (typeof window === 'undefined' || !('speechSynthesis' in window)) return null;
  const voices = window.speechSynthesis.getVoices();
  if (!voices || voices.length === 0) return null;

  // Ranked priority list of executive, natural broadcast presenter voices
  const preferredVoiceNames = [
    /samantha/i,
    /daniel/i,
    /serena/i,
    /karen/i,
    /google us english/i,
    /google uk english male/i,
    /google uk english female/i,
    /ava/i,
    /oliver/i,
    /natural/i,
    /enhanced/i,
    /premium/i,
    /alex/i,
  ];

  for (const pattern of preferredVoiceNames) {
    const match = voices.find((v) => pattern.test(v.name) && v.lang.startsWith('en'));
    if (match) return match;
  }

  // Fallback to any English voice
  return voices.find((v) => v.lang.startsWith('en')) || voices[0] || null;
}

export function speakBroadcastScript(
  text: string,
  onEnd?: () => void,
  onError?: () => void
): SpeechSynthesisUtterance | null {
  if (typeof window === 'undefined' || !('speechSynthesis' in window)) return null;

  window.speechSynthesis.cancel();

  // Clean script text of stage directions, brackets, and markdown formatting for natural voice cadence
  const cleanText = text
    .replace(/\[.*?\]/g, '') // remove bracketed stage directions like [Pause for applause]
    .replace(/\*+/g, '')     // remove markdown asterisks
    .replace(/^#+\s+/gm, '') // remove markdown headings
    .replace(/—/g, ', ')     // em-dashes to natural pauses
    .replace(/\.{3}/g, ', ') // ellipses to brief breath pauses
    .trim();

  if (!cleanText) return null;

  const utterance = new SpeechSynthesisUtterance(cleanText);
  const voice = getBestBroadcastVoice();
  if (voice) {
    utterance.voice = voice;
  }

  // Professional keynote broadcast cadence:
  // 0.93x rate for authoritative, deliberate, humanized clarity
  utterance.rate = 0.93;
  // 1.02 pitch for engaging, warm presence without monotone robotic flattening
  utterance.pitch = 1.02;
  utterance.volume = 1.0;

  utterance.onend = () => {
    onEnd?.();
  };
  utterance.onerror = () => {
    onError?.();
  };

  window.speechSynthesis.speak(utterance);
  return utterance;
}

export function stopBroadcastSpeech() {
  if (typeof window !== 'undefined' && 'speechSynthesis' in window) {
    window.speechSynthesis.cancel();
  }
}

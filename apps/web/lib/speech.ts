/**
 * StageSync Humanized Broadcast Speech Engine
 * Produces lifelike, keynote-grade audio playback for AI teleprompter scripts.
 * 
 * Features:
 * - Asynchronous voice discovery with neural & enhanced voice prioritization
 * - Sentence-level cadence chunking with natural human breathing pauses
 * - Real-time progress callbacks for live teleprompter sentence tracking
 * - User-selectable voice personas stored in local storage
 */

export interface PresenterVoice {
  id: string;
  name: string;
  lang: string;
  tier: 'neural' | 'enhanced' | 'studio' | 'standard';
  label: string;
  voice: SpeechSynthesisVoice;
}

let cachedVoices: SpeechSynthesisVoice[] = [];
let voiceListenersAttached = false;

// Pre-load voices on client load
function ensureVoiceCatalogLoaded(): void {
  if (typeof window === 'undefined' || !('speechSynthesis' in window)) return;

  const voices = window.speechSynthesis.getVoices();
  if (voices && voices.length > 0) {
    cachedVoices = voices;
  }

  if (!voiceListenersAttached && 'onvoiceschanged' in window.speechSynthesis) {
    voiceListenersAttached = true;
    window.speechSynthesis.onvoiceschanged = () => {
      cachedVoices = window.speechSynthesis.getVoices();
    };
  }
}

// Immediately trigger voice catalog query
ensureVoiceCatalogLoaded();

/**
 * Returns all high-quality English broadcast voices available on the client browser.
 */
export function getAvailablePresenterVoices(): PresenterVoice[] {
  if (typeof window === 'undefined' || !('speechSynthesis' in window)) return [];

  ensureVoiceCatalogLoaded();
  const voices = cachedVoices.length > 0 ? cachedVoices : window.speechSynthesis.getVoices();
  if (!voices || voices.length === 0) return [];

  // Filter English voices
  const englishVoices = voices.filter((v) => v.lang.startsWith('en'));
  const candidatePool = englishVoices.length > 0 ? englishVoices : voices;

  const result: PresenterVoice[] = candidatePool.map((v) => {
    const name = v.name;
    const lower = name.toLowerCase();

    let tier: PresenterVoice['tier'] = 'standard';
    let label = name;

    if (lower.includes('natural') || lower.includes('online') || lower.includes('neural')) {
      tier = 'neural';
      label = `⚡ ${name} (Neural AI)`;
    } else if (lower.includes('premium') || lower.includes('enhanced')) {
      tier = 'enhanced';
      label = `🎙️ ${name} (HD Studio)`;
    } else if (lower.includes('google')) {
      tier = 'studio';
      label = `✨ ${name} (Google Natural)`;
    } else if (lower.includes('daniel')) {
      tier = 'enhanced';
      label = `🎙️ Daniel (BBC Executive)`;
    } else if (lower.includes('samantha')) {
      tier = 'studio';
      label = `🎙️ Samantha (Keynote Host)`;
    } else if (lower.includes('ava') || lower.includes('serena') || lower.includes('zoe')) {
      tier = 'studio';
      label = `🎙️ ${name} (Executive Presenter)`;
    } else if (lower.includes('karen') || lower.includes('moira') || lower.includes('rishi')) {
      tier = 'studio';
      label = `🎙️ ${name} (Global MC)`;
    }

    return {
      id: `${v.name}_${v.lang}`,
      name: v.name,
      lang: v.lang,
      tier,
      label,
      voice: v,
    };
  });

  // Sort: Neural > Enhanced > Studio > Standard
  const tierWeight = { neural: 4, enhanced: 3, studio: 2, standard: 1 };
  result.sort((a, b) => {
    const wDiff = tierWeight[b.tier] - tierWeight[a.tier];
    if (wDiff !== 0) return wDiff;
    return a.name.localeCompare(b.name);
  });

  return result;
}

/**
 * Automatically selects the best available humanized broadcast presenter voice.
 */
export function getBestBroadcastVoice(preferredVoiceName?: string): SpeechSynthesisVoice | null {
  const options = getAvailablePresenterVoices();
  if (options.length === 0) return null;

  // 1. Check user preference if specified
  if (preferredVoiceName) {
    const matched = options.find((o) => o.name.toLowerCase() === preferredVoiceName.toLowerCase());
    if (matched) return matched.voice;
  }

  // 2. Check localStorage preference if available
  if (typeof window !== 'undefined') {
    try {
      const saved = localStorage.getItem('stagesync_preferred_voice');
      if (saved) {
        const match = options.find((o) => o.name === saved);
        if (match) return match.voice;
      }
    } catch {
      // ignore
    }
  }

  // 3. Pick top ranked voice (Neural or Enhanced or Google)
  return options[0]?.voice ?? null;
}

export interface SpeechPlaybackOptions {
  voiceName?: string;
  rate?: number;
  pitch?: number;
  onSentenceChange?: (sentenceIndex: number, totalSentences: number, text: string) => void;
  onEnd?: () => void;
  onError?: (err?: unknown) => void;
}

// Active speech controller state to support clean multi-sentence natural cadence
let activeRunId = 0;

/**
 * Converts formatted AI script into natural sentence units with natural prosodic pauses.
 */
export function prepareScriptSentences(rawScript: string): string[] {
  // Strip stage cues, asterisks, markdown, and convert dashes to gentle pauses
  const clean = rawScript
    .replace(/\[.*?\]/g, '') // remove bracketed stage cues like [Pause for applause]
    .replace(/\(.*?\)/g, (match) => {
      // Only remove if it looks like stage direction, e.g. (applause)
      if (/applause|cheers|pause|dim|cue/i.test(match)) return '';
      return match;
    })
    .replace(/\*+/g, '')     // remove markdown bold/italic
    .replace(/^#+\s+/gm, '') // remove headings
    .replace(/—/g, ', ')     // em-dashes to natural pauses
    .replace(/\.{3}/g, ', ') // ellipses to brief breath pauses
    .trim();

  if (!clean) return [];

  // Split into natural breathing sentences on [.!?] followed by whitespace or end
  const sentences = clean
    .split(/(?<=[.?!])\s+/)
    .map((s) => s.trim())
    .filter((s) => s.length > 0);

  return sentences.length > 0 ? sentences : [clean];
}

/**
 * Speaks the script using humanized sentence cadence and natural micro-pauses.
 */
export function speakBroadcastScript(
  text: string,
  optionsOrOnEnd?: SpeechPlaybackOptions | (() => void),
  maybeOnError?: () => void
): void {
  if (typeof window === 'undefined' || !('speechSynthesis' in window)) {
    if (typeof optionsOrOnEnd === 'object') {
      optionsOrOnEnd.onError?.(new Error('Speech synthesis not supported in this environment'));
    } else {
      maybeOnError?.();
    }
    return;
  }

  const options: SpeechPlaybackOptions =
    typeof optionsOrOnEnd === 'function'
      ? { onEnd: optionsOrOnEnd, onError: maybeOnError }
      : optionsOrOnEnd ?? {};

  // Stop any active speech
  stopBroadcastSpeech();

  const sentences = prepareScriptSentences(text);
  if (sentences.length === 0) {
    options.onEnd?.();
    return;
  }

  const voice = getBestBroadcastVoice(options.voiceName);
  const thisRunId = ++activeRunId;
  let currentIndex = 0;

  function speakNextSentence() {
    if (thisRunId !== activeRunId) return; // Cancelled

    if (currentIndex >= sentences.length) {
      options?.onEnd?.();
      return;
    }

    const currentSentence = sentences[currentIndex];
    options?.onSentenceChange?.(currentIndex, sentences.length, currentSentence);

    const utterance = new SpeechSynthesisUtterance(currentSentence);
    if (voice) {
      utterance.voice = voice;
    }

    // Keynote broadcast cadence tuning:
    // Rate 0.91: Authoritative, polished, deliberate human speech rate
    utterance.rate = options?.rate ?? 0.91;
    // Pitch 1.01: Warm, engaging inflection without flat robotic monotone
    utterance.pitch = options?.pitch ?? 1.01;
    utterance.volume = 1.0;

    utterance.onend = () => {
      if (thisRunId !== activeRunId) return;
      currentIndex++;

      if (currentIndex < sentences.length) {
        // Natural human breathing pause between sentences (140ms)
        setTimeout(() => {
          if (thisRunId === activeRunId) {
            speakNextSentence();
          }
        }, 140);
      } else {
        options?.onEnd?.();
      }
    };

    utterance.onerror = (e) => {
      if (thisRunId !== activeRunId) return;
      // If stopped manually, don't trigger error
      if (e.error === 'interrupted' || e.error === 'canceled') {
        options?.onEnd?.();
      } else {
        options?.onError?.(e);
      }
    };

    window.speechSynthesis.speak(utterance);
  }

  speakNextSentence();
}

/**
 * Stops all ongoing speech immediately.
 */
export function stopBroadcastSpeech(): void {
  activeRunId++;
  if (typeof window !== 'undefined' && 'speechSynthesis' in window) {
    window.speechSynthesis.cancel();
  }
}

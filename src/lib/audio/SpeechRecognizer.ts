interface SpeechRecognitionAlternative {
  transcript: string;
  confidence: number;
}

interface SpeechRecognitionResult {
  readonly length: number;
  readonly isFinal: boolean;
  item(index: number): SpeechRecognitionAlternative;
  [index: number]: SpeechRecognitionAlternative;
}

interface SpeechRecognitionResultList {
  readonly length: number;
  item(index: number): SpeechRecognitionResult;
  [index: number]: SpeechRecognitionResult;
}

interface SpeechRecognitionEvent extends Event {
  readonly resultIndex: number;
  readonly results: SpeechRecognitionResultList;
}

interface SpeechRecognitionErrorEvent extends Event {
  readonly error: string;
  readonly message: string;
}

interface SpeechRecognition extends EventTarget {
  lang: string;
  continuous: boolean;
  interimResults: boolean;
  maxAlternatives: number;
  start(): void;
  stop(): void;
  abort(): void;
  onresult: ((event: SpeechRecognitionEvent) => void) | null;
  onerror: ((event: SpeechRecognitionErrorEvent) => void) | null;
  onend: (() => void) | null;
  onstart: (() => void) | null;
}

declare global {
  interface Window {
    SpeechRecognition?: { new(): SpeechRecognition };
    webkitSpeechRecognition?: { new(): SpeechRecognition };
  }
}

export class SpeechRecognizer {
  private recognition: SpeechRecognition | null = null;
  private onResult: ((text: string, isFinal: boolean) => boolean) | null = null;
  private onListeningChange: ((listening: boolean) => void) | null = null;
  private isRunning = false;
  private consumedIndices = new Set<number>();
  private lastResultsLength = 0;

  constructor() {
    const SR = window.SpeechRecognition || window.webkitSpeechRecognition;
    if (SR) {
      this.recognition = new SR();
      this.recognition.lang = 'it-IT';
      this.recognition.continuous = true;
      this.recognition.interimResults = true;
      this.recognition.maxAlternatives = 1;
    }
  }

  static isSupported(): boolean {
    return !!(window.SpeechRecognition || window.webkitSpeechRecognition);
  }

  start(
    onResult: (text: string, isFinal: boolean) => boolean,
    onListeningChange?: (listening: boolean) => void,
  ): void {
    if (!this.recognition) return;
    this.onResult = onResult;
    this.onListeningChange = onListeningChange ?? null;
    this.isRunning = true;

    this.recognition.onresult = (event: SpeechRecognitionEvent) => {
      for (let i = event.resultIndex; i < event.results.length; i++) {
        if (this.consumedIndices.has(i)) continue;

        const result = event.results[i];
        const text = result[0].transcript.trim();
        if (!text) continue;

        const consumed = this.onResult?.(text, result.isFinal) ?? false;

        // Only mark as consumed when final so that a more accurate
        // final transcript can still be delivered after an interim
        // that was too partial to match.
        if (consumed && result.isFinal) {
          this.consumedIndices.add(i);
        }
      }
      this.lastResultsLength = event.results.length;
    };

    this.recognition.onstart = () => {
      this.onListeningChange?.(true);
    };

    this.recognition.onerror = (event: SpeechRecognitionErrorEvent) => {
      console.error('Speech recognition error:', event.error);
    };

    this.recognition.onend = () => {
      this.onListeningChange?.(false);
      if (this.isRunning) {
        // Engine stopped on its own (Chrome timeout / silence).
        // Clear consumed indices because the results array resets
        // on restart, then restart the engine.
        this.consumedIndices.clear();
        this.lastResultsLength = 0;
        try { this.recognition?.start(); } catch { /* ignore */ }
      }
    };

    try {
      this.recognition.start();
    } catch (error) {
      console.error('Failed to start speech recognition:', error);
    }
  }

  /**
   * Soft reset — does NOT abort the engine. The engine keeps listening
   * continuously so short syllables like "Do" are not lost during a
   * restart gap. Dedup is handled by the caller's per-note guard.
   */
  reset(): void {
    // Mark all currently known result indices as consumed so that
    // pending interim results that become final after a note change
    // are not attributed to the new note. Without this, the final
    // transcript of the previous note's utterance arrives after the
    // note has already advanced and gets misattributed as a wrong
    // answer for the new note.
    for (let i = 0; i < this.lastResultsLength; i++) {
      this.consumedIndices.add(i);
    }
  }

  stop(): void {
    this.isRunning = false;
    if (this.recognition) {
      try { this.recognition.stop(); } catch { /* ignore */ }
    }
  }

  cleanup(): void {
    this.stop();
    this.onResult = null;
    this.onListeningChange = null;
    this.consumedIndices.clear();
    if (this.recognition) {
      this.recognition.onresult = null;
      this.recognition.onerror = null;
      this.recognition.onend = null;
      this.recognition.onstart = null;
    }
  }
}

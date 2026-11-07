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
  private isActuallyListening = false;
  private lastFinalTranscript = '';

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

  /**
   * Extract only the new portion of a cumulative transcript by removing
   * the previously-seen final text from the beginning.
   */
  private extractDelta(transcript: string): string {
    if (this.lastFinalTranscript && transcript.toLowerCase().startsWith(this.lastFinalTranscript.toLowerCase())) {
      return transcript.slice(this.lastFinalTranscript.length).trim();
    }
    return transcript.trim();
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
      let interimDelta = '';

      for (let i = event.resultIndex; i < event.results.length; i++) {
        const result = event.results[i];
        const transcript = result[0].transcript.trim();

        if (result.isFinal) {
          // The final transcript is cumulative — strip the part we've
          // already processed so only the newly spoken words remain.
          const delta = this.extractDelta(transcript);
          this.lastFinalTranscript = transcript;

          if (delta) {
            this.onResult?.(delta, true);
          }
        } else {
          // Accumulate interim deltas; we'll deliver them as a single
          // callback after the loop.
          const delta = this.extractDelta(transcript);
          if (delta) interimDelta = delta;
        }
      }

      if (interimDelta) {
        this.onResult?.(interimDelta, false);
      }
    };

    this.recognition.onstart = () => {
      this.isActuallyListening = true;
      this.onListeningChange?.(true);
    };

    this.recognition.onerror = (event: SpeechRecognitionErrorEvent) => {
      console.error('Speech recognition error:', event.error);
    };

    this.recognition.onend = () => {
      this.isActuallyListening = false;
      this.onListeningChange?.(false);
      if (this.isRunning) {
        try { this.recognition?.start(); } catch { /* ignore */ }
      }
    };

    try {
      this.recognition.start();
    } catch (error) {
      console.error('Failed to start speech recognition:', error);
    }
  }

  reset(): void {
    if (!this.recognition || !this.isRunning) return;
    this.lastFinalTranscript = '';
    try {
      this.recognition.abort();
    } catch { /* ignore */ }
    // onend fires after abort and restarts since isRunning is still true
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
    this.lastFinalTranscript = '';
    this.isActuallyListening = false;
    if (this.recognition) {
      this.recognition.onresult = null;
      this.recognition.onerror = null;
      this.recognition.onend = null;
      this.recognition.onstart = null;
    }
  }
}

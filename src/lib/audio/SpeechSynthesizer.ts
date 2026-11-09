import { Note } from '../../types';

const DEGREE_NAMES: Record<string, string> = {
  '1': 'primo grado',
  '2': 'secondo grado',
  '3': 'terzo grado',
  '4': 'quarto grado',
  '5': 'quinto grado',
  '6': 'sesto grado',
  '7': 'settimo grado',
  'b2': 'secondo bemolle',
  'b3': 'terzo bemolle',
  'b6': 'sesto bemolle',
  'b7': 'settimo bemolle',
  '#4': 'quarto diesis',
};

export function degreeToSpokenText(degree: Note): string {
  let base = degree;
  let prefix = '';
  if (degree.startsWith('_')) {
    prefix = ' basso';
    base = degree.slice(1);
  } else if (degree.startsWith('^')) {
    prefix = ' alto';
    base = degree.slice(1);
  }
  const name = DEGREE_NAMES[base];
  if (!name) return base;
  return name + prefix;
}

export class SpeechSynthesizer {
  private voices: SpeechSynthesisVoice[] = [];
  private italianVoice: SpeechSynthesisVoice | null = null;
  private supported: boolean;

  constructor() {
    this.supported = typeof window !== 'undefined' && 'speechSynthesis' in window;
    if (this.supported) {
      this.loadVoices();
      window.speechSynthesis.onvoiceschanged = () => this.loadVoices();
    }
  }

  private loadVoices() {
    this.voices = window.speechSynthesis.getVoices();
    this.italianVoice =
      this.voices.find(v => v.lang === 'it-IT') ??
      this.voices.find(v => v.lang.startsWith('it')) ??
      null;
  }

  static isSupported(): boolean {
    return typeof window !== 'undefined' && 'speechSynthesis' in window;
  }

  speak(text: string): void {
    if (!this.supported) return;
    window.speechSynthesis.cancel();
    const utterance = new SpeechSynthesisUtterance(text);
    if (this.italianVoice) {
      utterance.voice = this.italianVoice;
    }
    utterance.lang = 'it-IT';
    utterance.rate = 1.0;
    utterance.pitch = 1.0;
    window.speechSynthesis.speak(utterance);
  }

  cancel(): void {
    if (!this.supported) return;
    window.speechSynthesis.cancel();
  }

  cleanup(): void {
    if (!this.supported) return;
    window.speechSynthesis.cancel();
    window.speechSynthesis.onvoiceschanged = null;
  }
}

import Soundfont, { Player } from 'soundfont-player';
import { AudioRenderer } from './AudioRenderer';

const NOTE_NAMES: Record<string, string> = {
  'Db': 'C#',
  'Eb': 'D#',
  'Gb': 'F#',
  'Ab': 'G#',
  'Bb': 'A#',
  'Cb': 'B',
};

function toSoundfontNote(note: string, octave: number): string {
  const normalized = NOTE_NAMES[note] || note;
  return `${normalized}${octave}`;
}

export class SoundfontRenderer implements AudioRenderer {
  private audioContext: AudioContext | null = null;
  private noteInstrument: Player | null = null;
  private droneInstrument: Player | null = null;
  private droneNode: ReturnType<Player['play']> | null = null;
  private droneInterval: ReturnType<typeof setInterval> | null = null;
  private droneNote: string | null = null;
  private noteInstrumentName: string = 'acoustic_grand_piano';
  private droneInstrumentName: string = 'string_ensemble_1';
  private loading = false;

  async initialize(): Promise<void> {
    this.audioContext = new AudioContext();
    if (this.audioContext.state === 'suspended') {
      await this.audioContext.resume();
    }
    await this.loadInstruments();
  }

  private async loadInstruments(): Promise<void> {
    if (!this.audioContext || this.loading) return;
    this.loading = true;
    try {
      const [noteInst, droneInst] = await Promise.all([
        Soundfont.instrument(this.audioContext, this.noteInstrumentName as any),
        this.droneInstrumentName === this.noteInstrumentName
          ? null
          : Soundfont.instrument(this.audioContext, this.droneInstrumentName as any),
      ]);
      this.noteInstrument = noteInst;
      this.droneInstrument = droneInst || noteInst;
    } finally {
      this.loading = false;
    }
  }

  async setNoteInstrument(name: string): Promise<void> {
    if (name === this.noteInstrumentName && this.noteInstrument) return;
    this.noteInstrumentName = name;
    if (this.audioContext) {
      this.noteInstrument = await Soundfont.instrument(this.audioContext, name as any);
      if (this.droneInstrumentName === name) {
        this.droneInstrument = this.noteInstrument;
      }
    }
  }

  async setDroneInstrument(name: string): Promise<void> {
    if (name === this.droneInstrumentName && this.droneInstrument) return;
    this.droneInstrumentName = name;
    if (this.audioContext) {
      const wasPlaying = this.droneNote;
      this.stopDrone();
      if (name === this.noteInstrumentName && this.noteInstrument) {
        this.droneInstrument = this.noteInstrument;
      } else {
        this.droneInstrument = await Soundfont.instrument(this.audioContext, name as any);
      }
      if (wasPlaying) {
        const [note, octave] = this.parseNoteOctave(wasPlaying);
        await this.playDrone(note, octave);
      }
    }
  }

  private parseNoteOctave(sfNote: string): [string, number] {
    const octave = parseInt(sfNote.slice(-1));
    const note = sfNote.slice(0, -1);
    return [note, octave];
  }

  async playDrone(note: string, octave: number): Promise<void> {
    if (!this.audioContext || !this.droneInstrument) {
      throw new Error('Soundfont not initialized');
    }
    if (this.audioContext.state === 'suspended') {
      await this.audioContext.resume();
    }

    this.stopDrone();

    const sfNote = toSoundfontNote(note, octave);
    this.droneNote = sfNote;

    const retrigger = () => {
      if (!this.droneInstrument || !this.droneNote) return;
      this.droneNode = this.droneInstrument.play(sfNote, undefined, {
        gain: 2.5,
        duration: 4.5,
        attack: 0.3,
        release: 0.5,
      }) as any;
    };

    retrigger();
    this.droneInterval = setInterval(retrigger, 3800);
  }

  stopDrone(): void {
    if (this.droneInterval) {
      clearInterval(this.droneInterval);
      this.droneInterval = null;
    }
    if (this.droneNode) {
      try { this.droneNode.stop(); } catch { /* already stopped */ }
      this.droneNode = null;
    }
    this.droneNote = null;
  }

  async playNote(note: string, octave: number, duration: number): Promise<void> {
    if (!this.audioContext || !this.noteInstrument) {
      throw new Error('Soundfont not initialized');
    }
    if (this.audioContext.state === 'suspended') {
      await this.audioContext.resume();
    }

    const sfNote = toSoundfontNote(note, octave);
    this.noteInstrument.play(sfNote, undefined, {
      gain: 3,
      duration: duration / 1000,
    });
  }

  cleanup(): void {
    this.stopDrone();
    if (this.noteInstrument) {
      this.noteInstrument.stop();
      this.noteInstrument = null;
    }
    if (this.droneInstrument) {
      this.droneInstrument.stop();
      this.droneInstrument = null;
    }
    if (this.audioContext) {
      this.audioContext.close();
      this.audioContext = null;
    }
  }
}

// Base interface for audio renderers
export interface AudioRenderer {
  initialize(): Promise<void>;
  playDrone(note: string, octave: number): Promise<void>;
  stopDrone(): void;
  playNote(note: string, octave: number, duration: number): Promise<void>;
  cleanup(): void;
}

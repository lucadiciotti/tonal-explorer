// Base interface for audio renderers
export interface AudioRenderer {
  initialize(deviceId?: string): Promise<void>;
  playDrone(note: string, octave: number): Promise<void>;
  stopDrone(): void;
  playNote(note: string, octave: number, duration: number): Promise<void>;
  cleanup(): void;
}

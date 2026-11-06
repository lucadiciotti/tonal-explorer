import { AudioRenderer } from './AudioRenderer';

// Note frequencies for octave 4 (middle C = C4)
const NOTE_FREQUENCIES: Record<string, number> = {
  'C': 261.63,
  'C#': 277.18,
  'Db': 277.18,
  'D': 293.66,
  'D#': 311.13,
  'Eb': 311.13,
  'E': 329.63,
  'F': 349.23,
  'F#': 369.99,
  'Gb': 369.99,
  'G': 392.00,
  'G#': 415.30,
  'Ab': 415.30,
  'A': 440.00,
  'A#': 466.16,
  'Bb': 466.16,
  'B': 493.88,
  'Cb': 493.88
};

export class WebAudioRenderer implements AudioRenderer {
  private audioContext: AudioContext | null = null;
  private oscillators: OscillatorNode[] = [];
  private gainNode: GainNode | null = null;
  private filter: BiquadFilterNode | null = null;

  async initialize(_deviceId?: string): Promise<void> {
    this.audioContext = new AudioContext();

    // Resume audio context if it's suspended (browser autoplay policy)
    if (this.audioContext.state === 'suspended') {
      await this.audioContext.resume();
    }

    console.log('Audio context initialized, state:', this.audioContext.state);
  }

  async playDrone(note: string, octave: number): Promise<void> {
    if (!this.audioContext) {
      throw new Error('Audio context not initialized');
    }

    // Ensure audio context is running
    if (this.audioContext.state === 'suspended') {
      console.log('Resuming suspended audio context...');
      await this.audioContext.resume();
      console.log('Audio context resumed, state:', this.audioContext.state);
    }

    // Stop existing drone if any
    this.stopDrone();

    // Calculate frequency for the given note and octave
    const baseFrequency = NOTE_FREQUENCIES[note];
    if (!baseFrequency) {
      console.error('Unknown note:', note);
      throw new Error(`Unknown note: ${note}`);
    }

    // Adjust frequency for octave (octave 4 is the reference)
    // Each octave doubles or halves the frequency
    // Subtract 1 from octave to play one octave lower
    const frequency = baseFrequency * Math.pow(2, (octave - 1) - 4);

    console.log(`Playing drone: ${note} at octave ${octave}, frequency: ${frequency.toFixed(2)} Hz`);

    // Create a warm pad-like drone with multiple oscillators
    this.gainNode = this.audioContext.createGain();
    this.filter = this.audioContext.createBiquadFilter();

    // Low-pass filter to smooth out harsh frequencies
    this.filter.type = 'lowpass';
    this.filter.frequency.setValueAtTime(1500, this.audioContext.currentTime);
    this.filter.Q.setValueAtTime(1, this.audioContext.currentTime);

    // Create fewer detuned oscillators for a cleaner drone
    const detuneValues = [0, -3, 3]; // Minimal detuning for clarity
    const oscillatorGain = this.audioContext.createGain();
    oscillatorGain.gain.setValueAtTime(0.2, this.audioContext.currentTime); // Divide volume among oscillators

    detuneValues.forEach(detune => {
      const osc = this.audioContext!.createOscillator();
      // Use triangle wave - smoother than sawtooth but richer than sine
      osc.type = 'triangle';
      osc.frequency.setValueAtTime(frequency, this.audioContext!.currentTime);
      osc.detune.setValueAtTime(detune, this.audioContext!.currentTime);

      osc.connect(oscillatorGain);
      osc.start(this.audioContext!.currentTime);
      this.oscillators.push(osc);
    });

    // Connect the audio chain: oscillators -> oscillatorGain -> filter -> mainGain -> destination
    oscillatorGain.connect(this.filter);
    this.filter.connect(this.gainNode);
    this.gainNode.connect(this.audioContext.destination);

    // Set overall volume
    this.gainNode.gain.setValueAtTime(0.7, this.audioContext.currentTime);

    console.log('Drone started successfully, context state:', this.audioContext.state);
  }

  stopDrone(): void {
    if (this.oscillators.length > 0 && this.audioContext) {
      try {
        // Stop all oscillators
        this.oscillators.forEach(osc => {
          osc.stop();
          osc.disconnect();
        });
        this.oscillators = [];

        if (this.filter) {
          this.filter.disconnect();
          this.filter = null;
        }

        if (this.gainNode) {
          this.gainNode.disconnect();
          this.gainNode = null;
        }

        console.log('Drone stopped');
      } catch (e) {
        // Oscillators might already be stopped
        console.error('Error stopping drone:', e);
      }
    }
  }

  async playNote(note: string, octave: number, duration: number): Promise<void> {
    if (!this.audioContext) {
      throw new Error('Audio context not initialized');
    }

    if (this.audioContext.state === 'suspended') {
      await this.audioContext.resume();
    }

    const baseFrequency = NOTE_FREQUENCIES[note];
    if (!baseFrequency) {
      throw new Error(`Unknown note: ${note}`);
    }

    // Calculate frequency (no octave adjustment here - use octave as-is)
    const frequency = baseFrequency * Math.pow(2, octave - 4);

    // Create a short note with the same pad sound as the drone
    const noteGain = this.audioContext.createGain();
    const noteFilter = this.audioContext.createBiquadFilter();

    noteFilter.type = 'lowpass';
    noteFilter.frequency.setValueAtTime(1500, this.audioContext.currentTime);
    noteFilter.Q.setValueAtTime(1, this.audioContext.currentTime);

    const detuneValues = [0, -5, 5, -10, 10];
    const oscillatorGain = this.audioContext.createGain();
    oscillatorGain.gain.setValueAtTime(0.15, this.audioContext.currentTime);

    const noteOscillators: OscillatorNode[] = [];

    detuneValues.forEach(detune => {
      const osc = this.audioContext!.createOscillator();
      osc.type = 'triangle';
      osc.frequency.setValueAtTime(frequency, this.audioContext!.currentTime);
      osc.detune.setValueAtTime(detune, this.audioContext!.currentTime);

      osc.connect(oscillatorGain);
      osc.start(this.audioContext!.currentTime);
      osc.stop(this.audioContext!.currentTime + duration / 1000);
      noteOscillators.push(osc);
    });

    oscillatorGain.connect(noteFilter);
    noteFilter.connect(noteGain);
    noteGain.connect(this.audioContext.destination);

    // Fade in and out for smooth sound
    noteGain.gain.setValueAtTime(0, this.audioContext.currentTime);
    noteGain.gain.linearRampToValueAtTime(0.8, this.audioContext.currentTime + 0.05);
    noteGain.gain.linearRampToValueAtTime(0.8, this.audioContext.currentTime + (duration / 1000) - 0.05);
    noteGain.gain.linearRampToValueAtTime(0, this.audioContext.currentTime + duration / 1000);

    // Clean up after playing
    setTimeout(() => {
      noteOscillators.forEach(osc => osc.disconnect());
      oscillatorGain.disconnect();
      noteFilter.disconnect();
      noteGain.disconnect();
    }, duration);
  }

  cleanup(): void {
    this.stopDrone();
    if (this.audioContext) {
      this.audioContext.close();
      this.audioContext = null;
    }
  }
}

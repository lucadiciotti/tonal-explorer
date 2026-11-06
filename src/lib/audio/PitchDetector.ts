const NOTE_NAMES = ['C', 'C#', 'D', 'D#', 'E', 'F', 'F#', 'G', 'G#', 'A', 'A#', 'B'];
const MIN_FREQUENCY = 60;
const MAX_FREQUENCY = 1500;
const MIN_RMS = 0.015;
const STABILITY_COUNT = 4;

type NoteCallback = (note: string, octave: number) => void;
type ContinuousNoteCallback = (note: string | null, octave: number | null) => void;

export interface PitchData {
  note: string;
  octave: number;
  frequency: number;
  cents: number;
}

type PitchDataCallback = (data: PitchData | null) => void;

export class PitchDetector {
  private audioContext: AudioContext | null = null;
  private analyser: AnalyserNode | null = null;
  private stream: MediaStream | null = null;
  private rafId: number | null = null;
  private callbacks: Map<number, NoteCallback> = new Map();
  private continuousCallbacks: Map<number, ContinuousNoteCallback> = new Map();
  private pitchDataCallbacks: Map<number, PitchDataCallback> = new Map();
  private buffer: Float32Array = new Float32Array(0);
  private lastNote: string | null = null;
  private lastOctave: number | null = null;
  private stableCount = 0;
  private fired = false;

  async initialize(): Promise<void> {
    if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
      throw new Error('mediaDevices API not available — requires HTTPS context');
    }
    this.stream = await navigator.mediaDevices.getUserMedia({
      audio: {
        echoCancellation: false,
        noiseSuppression: false,
        autoGainControl: false,
      },
    });
    this.audioContext = new AudioContext();
    if (this.audioContext.state === 'suspended') {
      await this.audioContext.resume();
    }
    const source = this.audioContext.createMediaStreamSource(this.stream);

    this.analyser = this.audioContext.createAnalyser();
    this.analyser.fftSize = 4096;
    this.buffer = new Float32Array(this.analyser.fftSize);

    source.connect(this.analyser);
  }

  start(): void {
    if (!this.analyser) return;
    this.detect();
  }

  stop(): void {
    if (this.rafId !== null) {
      cancelAnimationFrame(this.rafId);
      this.rafId = null;
    }
  }

  cleanup(): void {
    this.stop();
    if (this.stream) {
      this.stream.getTracks().forEach(t => t.stop());
      this.stream = null;
    }
    if (this.audioContext) {
      this.audioContext.close();
      this.audioContext = null;
    }
    this.callbacks.clear();
    this.continuousCallbacks.clear();
    this.pitchDataCallbacks.clear();
  }

  onNoteDetected(callback: NoteCallback): () => void {
    const id = Date.now() + Math.random();
    this.callbacks.set(id, callback);
    return () => this.callbacks.delete(id);
  }

  onContinuousNote(callback: ContinuousNoteCallback): () => void {
    const id = Date.now() + Math.random();
    this.continuousCallbacks.set(id, callback);
    return () => this.continuousCallbacks.delete(id);
  }

  onPitchData(callback: PitchDataCallback): () => void {
    const id = Date.now() + Math.random();
    this.pitchDataCallbacks.set(id, callback);
    return () => this.pitchDataCallbacks.delete(id);
  }

  private detect = () => {
    if (!this.analyser) return;

    this.analyser.getFloatTimeDomainData(this.buffer);

    let rms = 0;
    for (let i = 0; i < this.buffer.length; i++) {
      rms += this.buffer[i] * this.buffer[i];
    }
    rms = Math.sqrt(rms / this.buffer.length);

    if (rms < MIN_RMS) {
      this.lastNote = null;
      this.lastOctave = null;
      this.stableCount = 0;
      this.fired = false;
      this.continuousCallbacks.forEach(cb => cb(null, null));
      this.pitchDataCallbacks.forEach(cb => cb(null));
      this.rafId = requestAnimationFrame(this.detect);
      return;
    }

    const frequency = this.autoCorrelate(this.buffer, this.audioContext!.sampleRate);

    if (frequency > 0 && frequency >= MIN_FREQUENCY && frequency <= MAX_FREQUENCY) {
      const midiNumber = 12 * (Math.log2(frequency / 440)) + 69;
      const rounded = Math.round(midiNumber);
      const noteIndex = ((rounded % 12) + 12) % 12;
      const octave = Math.floor(rounded / 12) - 1;
      const note = NOTE_NAMES[noteIndex];
      const cents = (midiNumber - rounded) * 100;

      this.pitchDataCallbacks.forEach(cb => cb({ note, octave, frequency, cents }));

      if (note === this.lastNote && octave === this.lastOctave) {
        this.stableCount++;
      } else {
        this.lastNote = note;
        this.lastOctave = octave;
        this.stableCount = 1;
        this.fired = false;
      }

      if (this.stableCount >= STABILITY_COUNT) {
        if (!this.fired) {
          this.fired = true;
          this.callbacks.forEach(cb => cb(note, octave));
        }
        this.continuousCallbacks.forEach(cb => cb(note, octave));
      }
    }

    this.rafId = requestAnimationFrame(this.detect);
  };

  private autoCorrelate(buffer: Float32Array, sampleRate: number): number {
    const size = buffer.length;
    let bestOffset = -1;
    let bestCorrelation = 0;
    let foundGoodCorrelation = false;

    const minPeriod = Math.floor(sampleRate / MAX_FREQUENCY);
    const maxPeriod = Math.floor(sampleRate / MIN_FREQUENCY);

    const correlations = new Float32Array(maxPeriod);

    for (let offset = minPeriod; offset < maxPeriod && offset < size; offset++) {
      let correlation = 0;
      let totalPower = 0;

      for (let i = 0; i < size - offset; i++) {
        correlation += buffer[i] * buffer[i + offset];
        totalPower += buffer[i] * buffer[i] + buffer[i + offset] * buffer[i + offset];
      }

      if (totalPower === 0) continue;
      correlation = (2 * correlation) / totalPower;
      correlations[offset] = correlation;

      if (correlation > 0.9 && correlation > bestCorrelation) {
        bestCorrelation = correlation;
        bestOffset = offset;
        foundGoodCorrelation = true;
      } else if (foundGoodCorrelation && correlation < bestCorrelation - 0.1) {
        break;
      }
    }

    if (bestCorrelation < 0.8) return -1;

    if (bestOffset > 0 && bestOffset < maxPeriod - 1) {
      const prev = correlations[bestOffset - 1];
      const curr = correlations[bestOffset];
      const next = correlations[bestOffset + 1];
      const shift = (next - prev) / (2 * (2 * curr - next - prev));
      if (Math.abs(shift) < 1) {
        bestOffset += shift;
      }
    }

    return sampleRate / bestOffset;
  }
}
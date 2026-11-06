import { AudioRenderer } from './AudioRenderer';
import { WebAudioRenderer } from './WebAudioRenderer';
import { MidiRenderer } from './MidiRenderer';
import { SoundfontRenderer } from './SoundfontRenderer';
import { MidiDetector } from './MidiDetector';

export type AudioRendererType = 'web-audio' | 'midi' | 'soundfont';

export class AudioManager {
  private renderer: AudioRenderer | null = null;
  private rendererType: AudioRendererType;
  private deviceId?: string;
  private inputDeviceId?: string;

  constructor(rendererType: AudioRendererType = 'web-audio', deviceId?: string, inputDeviceId?: string) {
    this.rendererType = rendererType;
    this.deviceId = deviceId;
    this.inputDeviceId = inputDeviceId;
  }

  async initialize(): Promise<void> {
    // Create renderer based on type
    switch (this.rendererType) {
      case 'web-audio':
        this.renderer = new WebAudioRenderer();
        break;
      case 'midi':
        this.renderer = new MidiRenderer();
        break;
      case 'soundfont':
        this.renderer = new SoundfontRenderer();
        break;
      default:
        throw new Error(`Unknown renderer type: ${this.rendererType}`);
    }

    await this.renderer.initialize(this.deviceId, this.inputDeviceId);
  }

  async playDrone(note: string): Promise<void> {
    if (!this.renderer) {
      throw new Error('Audio manager not initialized');
    }

    await this.renderer.playDrone(note, 2);
  }

  stopDrone(): void {
    if (this.renderer) {
      this.renderer.stopDrone();
    }
  }

  async playNote(note: string, octave: number, duration: number): Promise<void> {
    if (!this.renderer) {
      throw new Error('Audio manager not initialized');
    }
    await this.renderer.playNote(note, octave, duration);
  }

  cleanup(): void {
    if (this.renderer) {
      this.renderer.cleanup();
      this.renderer = null;
    }
  }

  setRendererType(type: AudioRendererType, deviceId?: string, inputDeviceId?: string): void {
    this.cleanup();
    this.rendererType = type;
    this.deviceId = deviceId;
    this.inputDeviceId = inputDeviceId;
  }

  static async detectBestRenderer(): Promise<AudioRendererType> {
    const hasMidi = await MidiDetector.isAvailable();
    return hasMidi ? 'midi' : 'web-audio';
  }

  getRenderer(): AudioRenderer | null {
    return this.renderer;
  }
}

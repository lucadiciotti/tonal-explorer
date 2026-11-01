export interface MidiDevice {
  id: string;
  name: string;
  manufacturer: string;
}

type DeviceChangeCallback = (devices: MidiDevice[]) => void;

export class MidiDetector {
  private static access: MIDIAccess | null = null;
  private static listeners: Set<DeviceChangeCallback> = new Set();
  private static listening = false;

  private static async getAccess(): Promise<MIDIAccess | null> {
    if (this.access) return this.access;
    if (!navigator.requestMIDIAccess) return null;
    try {
      this.access = await navigator.requestMIDIAccess();
      return this.access;
    } catch (error) {
      console.error('MIDI access failed:', error);
      return null;
    }
  }

  private static readOutputs(access: MIDIAccess): MidiDevice[] {
    return Array.from(access.outputs.values()).map(output => ({
      id: output.id || '',
      name: output.name || 'Unknown Device',
      manufacturer: output.manufacturer || 'Unknown',
    }));
  }

  static async isAvailable(): Promise<boolean> {
    const access = await this.getAccess();
    if (!access) return false;
    return Array.from(access.outputs.values()).length > 0;
  }

  static async getDevices(): Promise<MidiDevice[]> {
    const access = await this.getAccess();
    if (!access) return [];
    return this.readOutputs(access);
  }

  static async onDeviceChange(callback: DeviceChangeCallback): Promise<() => void> {
    const access = await this.getAccess();
    this.listeners.add(callback);

    if (access && !this.listening) {
      this.listening = true;
      access.onstatechange = () => {
        const devices = this.readOutputs(access);
        for (const cb of this.listeners) {
          cb(devices);
        }
      };
    }

    return () => {
      this.listeners.delete(callback);
    };
  }
}

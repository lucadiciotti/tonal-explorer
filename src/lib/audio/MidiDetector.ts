export interface MidiDevice {
  id: string;
  name: string;
  manufacturer: string;
  isInput: boolean;
  isOutput: boolean;
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

  private static readDevices(access: MIDIAccess): MidiDevice[] {
    const map = new Map<string, MidiDevice>();

    for (const output of access.outputs.values()) {
      const id = output.id || '';
      const existing = map.get(id);
      if (existing) {
        existing.isOutput = true;
      } else {
        map.set(id, {
          id,
          name: output.name || 'Unknown Device',
          manufacturer: output.manufacturer || 'Unknown',
          isInput: false,
          isOutput: true,
        });
      }
    }

    for (const input of access.inputs.values()) {
      const id = input.id || '';
      const existing = map.get(id);
      if (existing) {
        existing.isInput = true;
      } else {
        map.set(id, {
          id,
          name: input.name || 'Unknown Device',
          manufacturer: input.manufacturer || 'Unknown',
          isInput: true,
          isOutput: false,
        });
      }
    }

    return Array.from(map.values());
  }

  static async isAvailable(): Promise<boolean> {
    const access = await this.getAccess();
    if (!access) return false;
    return access.outputs.size > 0 || access.inputs.size > 0;
  }

  static async getDevices(): Promise<MidiDevice[]> {
    const access = await this.getAccess();
    if (!access) return [];
    return this.readDevices(access);
  }

  static async onDeviceChange(callback: DeviceChangeCallback): Promise<() => void> {
    const access = await this.getAccess();
    this.listeners.add(callback);

    if (access && !this.listening) {
      this.listening = true;
      access.onstatechange = () => {
        const devices = this.readDevices(access);
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

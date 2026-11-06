import { AudioRenderer } from './AudioRenderer';

const NOTE_TO_MIDI: Record<string, number> = {
  'C': 0,
  'C#': 1, 'Db': 1,
  'D': 2,
  'D#': 3, 'Eb': 3,
  'E': 4,
  'F': 5,
  'F#': 6, 'Gb': 6,
  'G': 7,
  'G#': 8, 'Ab': 8,
  'A': 9,
  'A#': 10, 'Bb': 10,
  'B': 11, 'Cb': 11,
};

const DRONE_CHANNEL = 1;
const NOTE_CHANNEL = 0;

export class MidiRenderer implements AudioRenderer {
  private midiAccess: MIDIAccess | null = null;
  private output: MIDIOutput | null = null;
  private input: MIDIInput | null = null;
  private droneNoteNumber: number | null = null;
  private currentProgram: number = 0;
  private currentDroneProgram: number = 48;
  private noteCallbacks: Map<number, (note: string, octave: number) => void> = new Map();

  async initialize(deviceId?: string, inputDeviceId?: string): Promise<void> {
    if (!navigator.requestMIDIAccess) {
      throw new Error('Web MIDI API not supported in this browser');
    }

    try {
      this.midiAccess = await navigator.requestMIDIAccess();

      const outputs = Array.from(this.midiAccess.outputs.values());
      if (outputs.length === 0) {
        throw new Error('No MIDI devices found');
      }

      if (deviceId) {
        const found = outputs.find(o => o.id === deviceId);
        this.output = found || outputs[0];
      } else {
        this.output = outputs[0];
      }
      this.output.send([0xC0 + NOTE_CHANNEL, this.currentProgram]);
      this.output.send([0xC0 + DRONE_CHANNEL, this.currentDroneProgram]);
      console.log('MIDI output initialized with device:', this.output.name);

      const inputs = Array.from(this.midiAccess.inputs.values());
      if (inputs.length > 0) {
        let chosenInput: MIDIInput | null = null;
        if (inputDeviceId) {
          chosenInput = inputs.find(i => i.id === inputDeviceId) || null;
        }
        if (!chosenInput && deviceId) {
          chosenInput = inputs.find(i => i.id === deviceId) || null;
        }
        this.input = chosenInput || inputs[0];
        this.input.onmidimessage = this.handleMidiMessage.bind(this);
        console.log('MIDI input initialized with device:', this.input.name);
      }
    } catch (error) {
      console.error('Failed to initialize MIDI:', error);
      throw error;
    }
  }

  async playDrone(note: string, octave: number): Promise<void> {
    if (!this.output) {
      throw new Error('MIDI not initialized');
    }

    this.stopDrone();

    const midiNote = NOTE_TO_MIDI[note];
    if (midiNote === undefined) {
      throw new Error(`Unknown note: ${note}`);
    }

    this.droneNoteNumber = (octave + 1) * 12 + midiNote;
    const velocity = 80;

    this.output.send([0x90 + DRONE_CHANNEL, this.droneNoteNumber, velocity]);
  }

  stopDrone(): void {
    if (this.output && this.droneNoteNumber !== null) {
      this.output.send([0x80 + DRONE_CHANNEL, this.droneNoteNumber, 0]);
      this.droneNoteNumber = null;
    }
  }

  async playNote(note: string, octave: number, duration: number): Promise<void> {
    if (!this.output) {
      throw new Error('MIDI not initialized');
    }

    const midiNote = NOTE_TO_MIDI[note];
    if (midiNote === undefined) {
      throw new Error(`Unknown note: ${note}`);
    }

    const noteNumber = (octave + 1) * 12 + midiNote;
    const velocity = 100;

    this.output.send([0x90 + NOTE_CHANNEL, noteNumber, velocity]);

    setTimeout(() => {
      if (this.output) {
        this.output.send([0x80 + NOTE_CHANNEL, noteNumber, 0]);
      }
    }, duration);
  }

  cleanup(): void {
    this.stopDrone();
    if (this.input) {
      this.input.onmidimessage = null;
      this.input = null;
    }
    this.output = null;
    this.midiAccess = null;
    this.noteCallbacks.clear();
  }

  getAvailableDevices(): MIDIOutput[] {
    if (!this.midiAccess) {
      return [];
    }
    return Array.from(this.midiAccess.outputs.values());
  }

  setOutput(output: MIDIOutput): void {
    this.stopDrone();
    this.output = output;
    this.setNoteProgram(this.currentProgram);
    this.setDroneProgram(this.currentDroneProgram);
  }

  setProgram(program: number, channel?: number): void {
    if (!this.output) {
      return;
    }
    this.currentProgram = program;
    if (channel !== undefined) {
      this.output.send([0xC0 + channel, program]);
    } else {
      this.output.send([0xC0 + NOTE_CHANNEL, program]);
      this.output.send([0xC0 + DRONE_CHANNEL, program]);
    }
  }

  setNoteProgram(program: number): void {
    if (!this.output) return;
    this.currentProgram = program;
    this.output.send([0xC0 + NOTE_CHANNEL, program]);
  }

  setDroneProgram(program: number): void {
    if (!this.output) return;
    this.currentDroneProgram = program;
    this.output.send([0xC0 + DRONE_CHANNEL, program]);
  }

  getProgram(): number {
    return this.currentProgram;
  }

  private handleMidiMessage(event: MIDIMessageEvent): void {
    const [status, noteNumber, velocity] = event.data;
    const command = status & 0xF0;

    if (command === 0x90 && velocity > 0) {
      const octave = Math.floor(noteNumber / 12) - 1;
      const noteIndex = noteNumber % 12;
      const noteNames = ['C', 'C#', 'D', 'D#', 'E', 'F', 'F#', 'G', 'G#', 'A', 'A#', 'B'];
      const note = noteNames[noteIndex];

      this.noteCallbacks.forEach(callback => {
        callback(note, octave);
      });
    }
  }

  onNoteInput(callback: (note: string, octave: number) => void): () => void {
    const id = Date.now() + Math.random();
    this.noteCallbacks.set(id, callback);
    return () => this.noteCallbacks.delete(id);
  }

  hasInput(): boolean {
    return this.input !== null;
  }
}

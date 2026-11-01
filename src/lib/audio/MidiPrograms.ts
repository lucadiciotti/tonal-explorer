export interface MidiProgram {
  value: number;
  name: string;
  category: string;
}

export const MIDI_PROGRAMS: MidiProgram[] = [
  { value: 0, name: 'Acoustic Grand Piano', category: 'Piano' },
  { value: 1, name: 'Bright Acoustic Piano', category: 'Piano' },
  { value: 2, name: 'Electric Grand Piano', category: 'Piano' },
  { value: 4, name: 'Electric Piano 1', category: 'Piano' },
  { value: 5, name: 'Electric Piano 2', category: 'Piano' },

  { value: 8, name: 'Celesta', category: 'Chromatic Percussion' },
  { value: 9, name: 'Glockenspiel', category: 'Chromatic Percussion' },
  { value: 10, name: 'Music Box', category: 'Chromatic Percussion' },
  { value: 11, name: 'Vibraphone', category: 'Chromatic Percussion' },
  { value: 12, name: 'Marimba', category: 'Chromatic Percussion' },
  { value: 13, name: 'Xylophone', category: 'Chromatic Percussion' },
  { value: 14, name: 'Tubular Bells', category: 'Chromatic Percussion' },

  { value: 16, name: 'Drawbar Organ', category: 'Organ' },
  { value: 17, name: 'Percussive Organ', category: 'Organ' },
  { value: 18, name: 'Rock Organ', category: 'Organ' },
  { value: 19, name: 'Church Organ', category: 'Organ' },
  { value: 20, name: 'Reed Organ', category: 'Organ' },

  { value: 24, name: 'Acoustic Guitar (nylon)', category: 'Guitar' },
  { value: 25, name: 'Acoustic Guitar (steel)', category: 'Guitar' },
  { value: 26, name: 'Electric Guitar (jazz)', category: 'Guitar' },
  { value: 27, name: 'Electric Guitar (clean)', category: 'Guitar' },

  { value: 40, name: 'Violin', category: 'Strings' },
  { value: 41, name: 'Viola', category: 'Strings' },
  { value: 42, name: 'Cello', category: 'Strings' },
  { value: 44, name: 'Tremolo Strings', category: 'Strings' },
  { value: 48, name: 'String Ensemble 1', category: 'Strings' },
  { value: 49, name: 'String Ensemble 2', category: 'Strings' },

  { value: 56, name: 'Trumpet', category: 'Brass' },
  { value: 57, name: 'Trombone', category: 'Brass' },
  { value: 60, name: 'French Horn', category: 'Brass' },
  { value: 61, name: 'Brass Section', category: 'Brass' },

  { value: 64, name: 'Soprano Sax', category: 'Reed' },
  { value: 65, name: 'Alto Sax', category: 'Reed' },
  { value: 66, name: 'Tenor Sax', category: 'Reed' },
  { value: 67, name: 'Baritone Sax', category: 'Reed' },
  { value: 68, name: 'Oboe', category: 'Reed' },
  { value: 71, name: 'Clarinet', category: 'Reed' },

  { value: 72, name: 'Piccolo', category: 'Pipe' },
  { value: 73, name: 'Flute', category: 'Pipe' },
  { value: 74, name: 'Recorder', category: 'Pipe' },
  { value: 75, name: 'Pan Flute', category: 'Pipe' },

  { value: 80, name: 'Square Lead', category: 'Synth Lead' },
  { value: 81, name: 'Sawtooth Lead', category: 'Synth Lead' },
  { value: 88, name: 'New Age Pad', category: 'Synth Pad' },
  { value: 89, name: 'Warm Pad', category: 'Synth Pad' },
  { value: 90, name: 'Polysynth Pad', category: 'Synth Pad' },
  { value: 91, name: 'Choir Pad', category: 'Synth Pad' },
  { value: 92, name: 'Bowed Pad', category: 'Synth Pad' },

  { value: 98, name: 'Crystal', category: 'Synth Effects' },
  { value: 101, name: 'Goblins', category: 'Synth Effects' },
];

export const MIDI_PROGRAM_CATEGORIES = [
  'Piano',
  'Chromatic Percussion',
  'Organ',
  'Guitar',
  'Strings',
  'Brass',
  'Reed',
  'Pipe',
  'Synth Lead',
  'Synth Pad',
  'Synth Effects',
] as const;

export function getProgramsByCategory(category: string): MidiProgram[] {
  return MIDI_PROGRAMS.filter(p => p.category === category);
}

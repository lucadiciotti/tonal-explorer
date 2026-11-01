export interface SoundfontProgram {
  value: string;
  name: string;
  category: string;
}

export const SOUNDFONT_PROGRAMS: SoundfontProgram[] = [
  { value: 'acoustic_grand_piano', name: 'Acoustic Grand Piano', category: 'Piano' },
  { value: 'bright_acoustic_piano', name: 'Bright Acoustic Piano', category: 'Piano' },
  { value: 'electric_grand_piano', name: 'Electric Grand Piano', category: 'Piano' },
  { value: 'electric_piano_1', name: 'Electric Piano 1', category: 'Piano' },
  { value: 'electric_piano_2', name: 'Electric Piano 2', category: 'Piano' },

  { value: 'celesta', name: 'Celesta', category: 'Chromatic Percussion' },
  { value: 'glockenspiel', name: 'Glockenspiel', category: 'Chromatic Percussion' },
  { value: 'music_box', name: 'Music Box', category: 'Chromatic Percussion' },
  { value: 'vibraphone', name: 'Vibraphone', category: 'Chromatic Percussion' },
  { value: 'marimba', name: 'Marimba', category: 'Chromatic Percussion' },
  { value: 'xylophone', name: 'Xylophone', category: 'Chromatic Percussion' },
  { value: 'tubular_bells', name: 'Tubular Bells', category: 'Chromatic Percussion' },

  { value: 'drawbar_organ', name: 'Drawbar Organ', category: 'Organ' },
  { value: 'percussive_organ', name: 'Percussive Organ', category: 'Organ' },
  { value: 'rock_organ', name: 'Rock Organ', category: 'Organ' },
  { value: 'church_organ', name: 'Church Organ', category: 'Organ' },
  { value: 'reed_organ', name: 'Reed Organ', category: 'Organ' },

  { value: 'acoustic_guitar_nylon', name: 'Acoustic Guitar (nylon)', category: 'Guitar' },
  { value: 'acoustic_guitar_steel', name: 'Acoustic Guitar (steel)', category: 'Guitar' },
  { value: 'electric_guitar_jazz', name: 'Electric Guitar (jazz)', category: 'Guitar' },
  { value: 'electric_guitar_clean', name: 'Electric Guitar (clean)', category: 'Guitar' },

  { value: 'violin', name: 'Violin', category: 'Strings' },
  { value: 'viola', name: 'Viola', category: 'Strings' },
  { value: 'cello', name: 'Cello', category: 'Strings' },
  { value: 'tremolo_strings', name: 'Tremolo Strings', category: 'Strings' },
  { value: 'string_ensemble_1', name: 'String Ensemble 1', category: 'Strings' },
  { value: 'string_ensemble_2', name: 'String Ensemble 2', category: 'Strings' },

  { value: 'trumpet', name: 'Trumpet', category: 'Brass' },
  { value: 'trombone', name: 'Trombone', category: 'Brass' },
  { value: 'french_horn', name: 'French Horn', category: 'Brass' },
  { value: 'brass_section', name: 'Brass Section', category: 'Brass' },

  { value: 'soprano_sax', name: 'Soprano Sax', category: 'Reed' },
  { value: 'alto_sax', name: 'Alto Sax', category: 'Reed' },
  { value: 'tenor_sax', name: 'Tenor Sax', category: 'Reed' },
  { value: 'baritone_sax', name: 'Baritone Sax', category: 'Reed' },
  { value: 'oboe', name: 'Oboe', category: 'Reed' },
  { value: 'clarinet', name: 'Clarinet', category: 'Reed' },

  { value: 'piccolo', name: 'Piccolo', category: 'Pipe' },
  { value: 'flute', name: 'Flute', category: 'Pipe' },
  { value: 'recorder', name: 'Recorder', category: 'Pipe' },
  { value: 'pan_flute', name: 'Pan Flute', category: 'Pipe' },

  { value: 'lead_1_square', name: 'Square Lead', category: 'Synth Lead' },
  { value: 'lead_2_sawtooth', name: 'Sawtooth Lead', category: 'Synth Lead' },
  { value: 'pad_1_new_age', name: 'New Age Pad', category: 'Synth Pad' },
  { value: 'pad_2_warm', name: 'Warm Pad', category: 'Synth Pad' },
  { value: 'pad_3_polysynth', name: 'Polysynth Pad', category: 'Synth Pad' },
  { value: 'pad_4_choir', name: 'Choir Pad', category: 'Synth Pad' },
  { value: 'pad_5_bowed', name: 'Bowed Pad', category: 'Synth Pad' },
];

export const SOUNDFONT_CATEGORIES = [
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
] as const;

export function getSoundfontProgramsByCategory(category: string): SoundfontProgram[] {
  return SOUNDFONT_PROGRAMS.filter(p => p.category === category);
}

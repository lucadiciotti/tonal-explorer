import { Note } from '../types';

const SCALE_DEGREE_TO_SEMITONES: Record<string, number> = {
  '1': 0, 'b2': 1, '2': 2, 'b3': 3, '3': 4, '4': 5,
  '#4': 6, '5': 7, 'b6': 8, '6': 9, 'b7': 10, '7': 11,
};

const ITALIAN_CHROMATIC_SCALES: Record<string, string[]> = {
  'C':  ['Do', 'Do#', 'Re', 'Re#', 'Mi', 'Fa', 'Fa#', 'Sol', 'Sol#', 'La', 'La#', 'Si'],
  'G':  ['Sol', 'Sol#', 'La', 'La#', 'Si', 'Do', 'Do#', 'Re', 'Re#', 'Mi', 'Fa', 'Fa#'],
  'D':  ['Re', 'Re#', 'Mi', 'Fa', 'Fa#', 'Sol', 'Sol#', 'La', 'La#', 'Si', 'Do', 'Do#'],
  'A':  ['La', 'La#', 'Si', 'Do', 'Do#', 'Re', 'Re#', 'Mi', 'Fa', 'Fa#', 'Sol', 'Sol#'],
  'E':  ['Mi', 'Fa', 'Fa#', 'Sol', 'Sol#', 'La', 'La#', 'Si', 'Do', 'Do#', 'Re', 'Re#'],
  'B':  ['Si', 'Do', 'Do#', 'Re', 'Re#', 'Mi', 'Fa', 'Fa#', 'Sol', 'Sol#', 'La', 'La#'],
  'Cb': ['Dob', 'Do', 'Reb', 'Re', 'Mib', 'Mi', 'Fa', 'Solb', 'Sol', 'Lab', 'La', 'Sib'],
  'F#': ['Fa#', 'Sol', 'Sol#', 'La', 'La#', 'Si', 'Do', 'Do#', 'Re', 'Re#', 'Mi', 'Fa'],
  'Gb': ['Solb', 'Sol', 'Lab', 'La', 'Sib', 'Si', 'Do', 'Reb', 'Re', 'Mib', 'Mi', 'Fa'],
  'C#': ['Do#', 'Re', 'Re#', 'Mi', 'Fa', 'Fa#', 'Sol', 'Sol#', 'La', 'La#', 'Si', 'Do'],
  'Db': ['Reb', 'Re', 'Mib', 'Mi', 'Fa', 'Solb', 'Sol', 'Lab', 'La', 'Sib', 'Si', 'Do'],
  'Ab': ['Lab', 'La', 'Sib', 'Si', 'Do', 'Reb', 'Re', 'Mib', 'Mi', 'Fa', 'Solb', 'Sol'],
  'Eb': ['Mib', 'Mi', 'Fa', 'Solb', 'Sol', 'Lab', 'La', 'Sib', 'Si', 'Do', 'Reb', 'Re'],
  'Bb': ['Sib', 'Si', 'Do', 'Reb', 'Re', 'Mib', 'Mi', 'Fa', 'Solb', 'Sol', 'Lab', 'La'],
  'F':  ['Fa', 'Solb', 'Sol', 'Lab', 'La', 'Sib', 'Si', 'Do', 'Reb', 'Re', 'Mib', 'Mi'],
};

const ITALIAN_TO_ENGLISH: Record<string, string> = {
  'Do': 'C', 'Do#': 'C#', 'Dob': 'Cb',
  'Re': 'D', 'Re#': 'D#', 'Reb': 'Db',
  'Mi': 'E', 'Mi#': 'E#', 'Mib': 'Eb',
  'Fa': 'F', 'Fa#': 'F#', 'Fab': 'Fb',
  'Sol': 'G', 'Sol#': 'G#', 'Solb': 'Gb',
  'La': 'A', 'La#': 'A#', 'Lab': 'Ab',
  'Si': 'B', 'Si#': 'B#', 'Sib': 'Bb',
};

export function getItalianNoteName(tonic: string, degree: Note): string {
  let degreeString = degree;
  if (degree.startsWith('_') || degree.startsWith('^')) {
    degreeString = degree.slice(1);
  }

  const semitones = SCALE_DEGREE_TO_SEMITONES[degreeString];
  if (semitones === undefined) {
    throw new Error(`Unknown scale degree: ${degreeString}`);
  }

  const scale = ITALIAN_CHROMATIC_SCALES[tonic];
  if (!scale) {
    throw new Error(`Unknown tonic: ${tonic}`);
  }

  return scale[semitones];
}

export function italianToEnglish(note: string): string {
  return ITALIAN_TO_ENGLISH[note] ?? note;
}

export function parseSpokenNote(text: string): string | null {
  const lower = text.toLowerCase().trim();

  const sharpFlat: [RegExp, string][] = [
    [/do\s*diesis/, 'Do#'],
    [/do\s*bemolle/, 'Dob'],
    [/re\s*diesis/, 'Re#'],
    [/re\s*bemolle/, 'Reb'],
    [/mi\s*diesis/, 'Mi#'],
    [/mi\s*bemolle/, 'Mib'],
    [/fa\s*diesis/, 'Fa#'],
    [/fa\s*bemolle/, 'Fab'],
    [/sol\s*diesis/, 'Sol#'],
    [/sol\s*bemolle/, 'Solb'],
    [/la\s*diesis/, 'La#'],
    [/la\s*bemolle/, 'Lab'],
    [/si\s*diesis/, 'Si#'],
    [/si\s*bemolle/, 'Sib'],
  ];

  const natural: [RegExp, string][] = [
    [/\bdo\b/, 'Do'],
    [/\bre\b/, 'Re'],
    [/\bmi\b/, 'Mi'],
    [/\bfa\b/, 'Fa'],
    [/\bsol\b/, 'Sol'],
    [/\bla\b/, 'La'],
    [/\bsi\b/, 'Si'],
  ];

  for (const [regex, note] of sharpFlat) {
    if (regex.test(lower)) return note;
  }
  for (const [regex, note] of natural) {
    if (regex.test(lower)) return note;
  }

  return null;
}

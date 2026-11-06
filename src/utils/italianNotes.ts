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

const SHARP_KEYS = new Set(['C', 'G', 'D', 'A', 'E', 'B', 'F#', 'C#']);

const DIATONIC_DEGREES: Record<string, string[]> = {
  'C':  ['Do', 'Re', 'Mi', 'Fa', 'Sol', 'La', 'Si'],
  'G':  ['Sol', 'La', 'Si', 'Do', 'Re', 'Mi', 'Fa#'],
  'D':  ['Re', 'Mi', 'Fa#', 'Sol', 'La', 'Si', 'Do#'],
  'A':  ['La', 'Si', 'Do#', 'Re', 'Mi', 'Fa#', 'Sol#'],
  'E':  ['Mi', 'Fa#', 'Sol#', 'La', 'Si', 'Do#', 'Re#'],
  'B':  ['Si', 'Do#', 'Re#', 'Mi', 'Fa#', 'Sol#', 'La#'],
  'F#': ['Fa#', 'Sol#', 'La#', 'Si', 'Do#', 'Re#', 'Mi#'],
  'C#': ['Do#', 'Re#', 'Mi#', 'Fa#', 'Sol#', 'La#', 'Si#'],
  'F':  ['Fa', 'Sol', 'La', 'Sib', 'Do', 'Re', 'Mi'],
  'Bb': ['Sib', 'Do', 'Re', 'Mib', 'Fa', 'Sol', 'La'],
  'Eb': ['Mib', 'Fa', 'Sol', 'Lab', 'Sib', 'Do', 'Re'],
  'Ab': ['Lab', 'Sib', 'Do', 'Reb', 'Mib', 'Fa', 'Sol'],
  'Db': ['Reb', 'Mib', 'Fa', 'Solb', 'Lab', 'Sib', 'Do'],
  'Gb': ['Solb', 'Lab', 'Sib', 'Dob', 'Reb', 'Mib', 'Fa'],
  'Cb': ['Dob', 'Reb', 'Mib', 'Fab', 'Solb', 'Lab', 'Sib'],
};

function lowerSemitone(note: string): string {
  if (note.endsWith('#')) return note.slice(0, -1);
  return note + 'b';
}

function raiseSemitone(note: string): string {
  if (note.endsWith('b')) return note.slice(0, -1);
  return note + '#';
}

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

  const scale = ITALIAN_CHROMATIC_SCALES[tonic];
  if (!scale) {
    throw new Error(`Unknown tonic: ${tonic}`);
  }

  const semitones = SCALE_DEGREE_TO_SEMITONES[degreeString];
  if (semitones === undefined) {
    throw new Error(`Unknown scale degree: ${degreeString}`);
  }

  if (degreeString.startsWith('b') && SHARP_KEYS.has(tonic)) {
    const diatonic = DIATONIC_DEGREES[tonic];
    const naturalDegreeNum = degreeString.slice(1);
    const naturalNote = diatonic[parseInt(naturalDegreeNum) - 1];
    return lowerSemitone(naturalNote);
  }

  if (degreeString.startsWith('#') && !SHARP_KEYS.has(tonic)) {
    const diatonic = DIATONIC_DEGREES[tonic];
    const naturalDegreeNum = degreeString.slice(1);
    const naturalNote = diatonic[parseInt(naturalDegreeNum) - 1];
    return raiseSemitone(naturalNote);
  }

  return scale[semitones];
}

export function italianToEnglish(note: string): string {
  return ITALIAN_TO_ENGLISH[note] ?? note;
}

export function parseSpokenNote(text: string): string | null {
  const lower = text.toLowerCase().trim();

  const altered: [RegExp, string][] = [
    [/do\s*diesis|du\b/, 'Do#'],
    [/do\s*bemolle|di\b/, 'Dob'],
    [/re\s*diesis|ri\b/, 'Re#'],
    [/re\s*bemolle|ra\b/, 'Reb'],
    [/mi\s*diesis|mo\b/, 'Mi#'],
    [/mi\s*bemolle|me\b/, 'Mib'],
    [/fa\s*diesis|fe\b/, 'Fa#'],
    [/fa\s*bemolle|fu\b/, 'Fab'],
    [/sol\s*diesis|sul\b/, 'Sol#'],
    [/sol\s*bemolle|sil\b/, 'Solb'],
    [/la\s*diesis|le\b/, 'La#'],
    [/la\s*bemolle|lu\b/, 'Lab'],
    [/si\s*diesis|so\b/, 'Si#'],
    [/si\s*bemolle|se\b/, 'Sib'],
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

  for (const [regex, note] of altered) {
    if (regex.test(lower)) return note;
  }
  for (const [regex, note] of natural) {
    if (regex.test(lower)) return note;
  }

  return null;
}

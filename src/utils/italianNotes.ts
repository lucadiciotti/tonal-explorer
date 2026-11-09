import { Note } from '../types';
import { phoneticMatchNote } from './phoneticMatcher';

const SCALE_DEGREE_TO_SEMITONES: Record<string, number> = {
  '1': 0, 'b2': 1, '2': 2, 'b3': 3, '3': 4, '4': 5,
  '#4': 6, '5': 7, 'b6': 8, '6': 9, 'b7': 10, '7': 11,
};

export function getItalianChromaticScale(tonic: string): string[] {
  return ITALIAN_CHROMATIC_SCALES[tonic] ?? ITALIAN_CHROMATIC_SCALES['C'];
}

const ALL_ITALIAN_NOTES: string[] = [
  'Do', 'Do#', 'Dob',
  'Re', 'Re#', 'Reb',
  'Mi', 'Mi#', 'Mib',
  'Fa', 'Fa#', 'Fab',
  'Sol', 'Sol#', 'Solb',
  'La', 'La#', 'Lab',
  'Si', 'Si#', 'Sib',
];

export function getAllItalianNotes(): string[] {
  return ALL_ITALIAN_NOTES;
}

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

const ITALIAN_TO_COMPACT: Record<string, string> = {
  'Do#': 'Du', 'Dob': 'Di',
  'Re#': 'Ri', 'Reb': 'Ra',
  'Mi#': 'Mo', 'Mib': 'Me',
  'Fa#': 'Fe', 'Fab': 'Fu',
  'Sol#': 'Sul', 'Solb': 'Sil',
  'La#': 'Le', 'Lab': 'Lu',
  'Si#': 'So', 'Sib': 'Se',
};

const ITALIAN_TO_SPOKEN: Record<string, string> = {
  'Do#': 'Do diesis', 'Dob': 'Do bemolle',
  'Re#': 'Re diesis', 'Reb': 'Re bemolle',
  'Mi#': 'Mi diesis', 'Mib': 'Mi bemolle',
  'Fa#': 'Fa diesis', 'Fab': 'Fa bemolle',
  'Sol#': 'Sol diesis', 'Solb': 'Sol bemolle',
  'La#': 'La diesis', 'Lab': 'La bemolle',
  'Si#': 'Si diesis', 'Sib': 'Si bemolle',
};

export function getSpokenForms(note: string): string {
  const compact = ITALIAN_TO_COMPACT[note];
  const spoken = ITALIAN_TO_SPOKEN[note];
  if (compact && spoken) return `${spoken} / ${compact}`;
  return note;
}

export function italianToEnglish(note: string): string {
  return ITALIAN_TO_ENGLISH[note] ?? note;
}

export function parseSpokenNote(text: string): string | null {
  const lower = text.toLowerCase().trim().normalize('NFD').replace(/[\u0300-\u036f]/g, '');

  const altered: [RegExp, string][] = [
    [/do\s*diesis|\bdu\b|\bdù\b|\bdhu\b|\bdoo\b/, 'Do#'],
    [/do\s*bemolle|\bdi\b|\bdì\b/, 'Dob'],
    [/re\s*diesis|\bri\b|\brì\b|\bree\b|\brye\b/, 'Re#'],
    [/re\s*bemolle|\bra\b|\brah\b/, 'Reb'],
    [/mi\s*diesis|\bmo\b|\bmò\b/, 'Mi#'],
    [/mi\s*bemolle|\bme\b|\bmeh\b/, 'Mib'],
    [/fa\s*diesis|\bfe\b|\bfè\b|\bfay\b/, 'Fa#'],
    [/fa\s*bemolle|\bfu\b|\bfù\b|\bfoo\b/, 'Fab'],
    [/sol\s*diesis|\bsul\b|\bsùl\b|\bsool\b|\bsoul\b/, 'Sol#'],
    [/sol\s*bemolle|\bsil\b|\bseal\b|\bsyll\b|\bsill\b/, 'Solb'],
    [/la\s*diesis|\ble\b|\blè\b|\blay\b/, 'La#'],
    [/la\s*bemolle|\blu\b|\blo\b|\blou\b|\blù\b|\bloo\b/, 'Lab'],
    [/si\s*diesis|\bso\b|\bsò\b/, 'Si#'],
    [/si\s*bemolle|\bse\b|\bseh\b|\bsay\b/, 'Sib'],
  ];

  const natural: [RegExp, string][] = [
    [/\bdo\b|\bdoh\b|\bdow\b/, 'Do'],
    [/\bre\b|\breh\b|\bray\b/, 'Re'],
    [/\bmi\b|\bmee\b|\bme\b/, 'Mi'],
    [/\bfa\b|\bfah\b|\bfar\b/, 'Fa'],
    [/\bsol\b|\bsoul\b|\bsohl\b/, 'Sol'],
    [/\bla\b|\blah\b/, 'La'],
    [/\bsi\b|\bsee\b|\bsea\b/, 'Si'],
  ];

  // Search from the end of the text so that if the delta contains
  // filler words before the note name (e.g. "ehm... la"), we match
  // the last — and most likely intended — note name.
  for (let i = altered.length - 1; i >= 0; i--) {
    const [regex, note] = altered[i];
    if (regex.test(lower)) return note;
  }
  for (let i = natural.length - 1; i >= 0; i--) {
    const [regex, note] = natural[i];
    if (regex.test(lower)) return note;
  }

  // Regex match failed — try phonetic fallback. The speech engine
  // often mishears short syllables as real Italian words that the
  // regex doesn't cover. Phonetic matching finds the closest valid
  // syllable by edit distance, catching e.g. "no"→Do, "te"→Re.
  return phoneticMatchNote(lower);
}

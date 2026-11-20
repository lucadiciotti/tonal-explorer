import { Note } from '../types';
import { phoneticMatchNote } from './phoneticMatcher';
import {
  getChromaticScaleItalian,
  getNoteNameByFifths,
  TONIC_TO_FIFTHS,
  DEGREE_TO_DELTA_Q,
} from './lineOfFifths';

export function getItalianChromaticScale(tonic: string): string[] {
  try {
    return getChromaticScaleItalian(tonic);
  } catch {
    return getChromaticScaleItalian('C');
  }
}

const ALL_ITALIAN_NOTES: string[] = [
  'Do', 'Do#', 'Do##', 'Dob', 'Dobb',
  'Re', 'Re#', 'Re##', 'Reb', 'Rebb',
  'Mi', 'Mi#', 'Mi##', 'Mib', 'Mibb',
  'Fa', 'Fa#', 'Fa##', 'Fab', 'Fabb',
  'Sol', 'Sol#', 'Sol##', 'Solb', 'Solbb',
  'La', 'La#', 'La##', 'Lab', 'Labb',
  'Si', 'Si#', 'Si##', 'Sib', 'Sibb',
];

export function getAllItalianNotes(): string[] {
  return ALL_ITALIAN_NOTES;
}

export function getItalianNoteName(tonic: string, degree: Note): string {
  try {
    return getNoteNameByFifths(tonic, degree);
  } catch {
    return '?';
  }
}

const ITALIAN_TO_ENGLISH: Record<string, string> = {
  'Do': 'C', 'Do#': 'C#', 'Do##': 'C##', 'Dob': 'Cb', 'Dobb': 'Cbb',
  'Re': 'D', 'Re#': 'D#', 'Re##': 'D##', 'Reb': 'Db', 'Rebb': 'Dbb',
  'Mi': 'E', 'Mi#': 'E#', 'Mi##': 'E##', 'Mib': 'Eb', 'Mibb': 'Ebb',
  'Fa': 'F', 'Fa#': 'F#', 'Fa##': 'F##', 'Fab': 'Fb', 'Fabb': 'Fbb',
  'Sol': 'G', 'Sol#': 'G#', 'Sol##': 'G##', 'Solb': 'Gb', 'Solbb': 'Gbb',
  'La': 'A', 'La#': 'A#', 'La##': 'A##', 'Lab': 'Ab', 'Labb': 'Abb',
  'Si': 'B', 'Si#': 'B#', 'Si##': 'B##', 'Sib': 'Bb', 'Sibb': 'Bbb',
};

const ITALIAN_TO_COMPACT: Record<string, string> = {
  'Do#': 'Du', 'Do##': 'Du2', 'Dob': 'Di', 'Dobb': 'Di2',
  'Re#': 'Ri', 'Re##': 'Ri2', 'Reb': 'Ra', 'Rebb': 'Ra2',
  'Mi#': 'Mo', 'Mi##': 'Mo2', 'Mib': 'Me', 'Mibb': 'Me2',
  'Fa#': 'Fe', 'Fa##': 'Fe2', 'Fab': 'Fu', 'Fabb': 'Fu2',
  'Sol#': 'Sul', 'Sol##': 'Sul2', 'Solb': 'Sil', 'Solbb': 'Sil2',
  'La#': 'Le', 'La##': 'Le2', 'Lab': 'Lu', 'Labb': 'Lu2',
  'Si#': 'So', 'Si##': 'So2', 'Sib': 'Se', 'Sibb': 'Se2',
};

const ITALIAN_TO_SPOKEN: Record<string, string> = {
  'Do#': 'Do diesis', 'Do##': 'Do doppio diesis', 'Dob': 'Do bemolle', 'Dobb': 'Do doppio bemolle',
  'Re#': 'Re diesis', 'Re##': 'Re doppio diesis', 'Reb': 'Re bemolle', 'Rebb': 'Re doppio bemolle',
  'Mi#': 'Mi diesis', 'Mi##': 'Mi doppio diesis', 'Mib': 'Mi bemolle', 'Mibb': 'Mi doppio bemolle',
  'Fa#': 'Fa diesis', 'Fa##': 'Fa doppio diesis', 'Fab': 'Fa bemolle', 'Fabb': 'Fa doppio bemolle',
  'Sol#': 'Sol diesis', 'Sol##': 'Sol doppio diesis', 'Solb': 'Sol bemolle', 'Solbb': 'Sol doppio bemolle',
  'La#': 'La diesis', 'La##': 'La doppio diesis', 'Lab': 'La bemolle', 'Labb': 'La doppio bemolle',
  'Si#': 'Si diesis', 'Si##': 'Si doppio diesis', 'Sib': 'Si bemolle', 'Sibb': 'Si doppio bemolle',
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
    [/do\s*doppio\s*diesis|\bdu2\b/, 'Do##'],
    [/do\s*doppio\s*bemolle|\bdi2\b/, 'Dobb'],
    [/do\s*diesis|\bdu\b|\bdù\b|\bdhu\b|\bdoo\b/, 'Do#'],
    [/do\s*bemolle|\bdi\b|\bdì\b/, 'Dob'],
    [/re\s*doppio\s*diesis|\bri2\b/, 'Re##'],
    [/re\s*doppio\s*bemolle|\bra2\b/, 'Rebb'],
    [/re\s*diesis|\bri\b|\brì\b|\bree\b|\brye\b/, 'Re#'],
    [/re\s*bemolle|\bra\b|\brah\b/, 'Reb'],
    [/mi\s*doppio\s*diesis|\bmo2\b/, 'Mi##'],
    [/mi\s*doppio\s*bemolle|\bme2\b/, 'Mibb'],
    [/mi\s*diesis|\bmo\b|\bmò\b/, 'Mi#'],
    [/mi\s*bemolle|\bme\b|\bmeh\b/, 'Mib'],
    [/fa\s*doppio\s*diesis|\bfe2\b/, 'Fa##'],
    [/fa\s*doppio\s*bemolle|\bfu2\b/, 'Fabb'],
    [/fa\s*diesis|\bfe\b|\bfè\b|\bfay\b/, 'Fa#'],
    [/fa\s*bemolle|\bfu\b|\bfù\b|\bfoo\b/, 'Fab'],
    [/sol\s*doppio\s*diesis|\bsul2\b/, 'Sol##'],
    [/sol\s*doppio\s*bemolle|\bsil2\b/, 'Solbb'],
    [/sol\s*diesis|\bsul\b|\bsùl\b|\bsool\b|\bsoul\b/, 'Sol#'],
    [/sol\s*bemolle|\bsil\b|\bseal\b|\bsyll\b|\bsill\b/, 'Solb'],
    [/la\s*doppio\s*diesis|\ble2\b/, 'La##'],
    [/la\s*doppio\s*bemolle|\blu2\b/, 'Labb'],
    [/la\s*diesis|\ble\b|\blè\b|\blay\b/, 'La#'],
    [/la\s*bemolle|\blu\b|\blo\b|\blou\b|\blù\b|\bloo\b/, 'Lab'],
    [/si\s*doppio\s*diesis|\bso2\b/, 'Si##'],
    [/si\s*doppio\s*bemolle|\bse2\b/, 'Sibb'],
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

  for (let i = altered.length - 1; i >= 0; i--) {
    const [regex, note] = altered[i];
    if (regex.test(lower)) return note;
  }
  for (let i = natural.length - 1; i >= 0; i--) {
    const [regex, note] = natural[i];
    if (regex.test(lower)) return note;
  }

  return phoneticMatchNote(lower);
}

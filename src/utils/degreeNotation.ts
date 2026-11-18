export type DegreeNotation = 'classic' | 'jazz';

const DEGREE_TO_EXTENSION: Record<string, string> = {
  '1': '8',
  'b2': 'b9',
  '2': '9',
  'b3': 'b10',
  '3': '10',
  '4': '11',
  '#4': '#11',
  'b5': 'b12',
  '5': '12',
  'b6': 'b13',
  '6': '13',
  'b7': 'b14',
  '7': '14',
};

export function convertDegreeDisplay(degree: string, notation: DegreeNotation): string {
  if (notation === 'classic') return degree;

  let modifier = '';
  let base = degree;

  if (degree.startsWith('_')) {
    modifier = '_';
    base = degree.slice(1);
  } else if (degree.startsWith('^')) {
    modifier = '^';
    base = degree.slice(1);
  }

  if (modifier === '^' && DEGREE_TO_EXTENSION[base]) {
    return DEGREE_TO_EXTENSION[base];
  }

  return degree;
}

const DEGREE_TO_SEMITONE: Record<string, number> = {
  '1': 0, 'b2': 1, '2': 2, 'b3': 3, '3': 4,
  '4': 5, '#4': 6, '5': 7, 'b6': 8, '6': 9, 'b7': 10, '7': 11,
};

const EXTENSION_TO_DEGREE: Record<string, string> = {};
for (const [deg, ext] of Object.entries(DEGREE_TO_EXTENSION)) {
  EXTENSION_TO_DEGREE[ext] = deg;
}

export function parseDisplayDegree(display: string): string {
  if (display.startsWith('_') || display.startsWith('^')) return display;
  if (EXTENSION_TO_DEGREE[display]) {
    return '^' + EXTENSION_TO_DEGREE[display];
  }
  return display;
}

export function getExtensionSemitone(ext: string): number | undefined {
  const deg = EXTENSION_TO_DEGREE[ext];
  if (!deg) return undefined;
  return DEGREE_TO_SEMITONE[deg];
}

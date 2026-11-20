/**
 * Line of Fifths — deterministic enharmonic spelling engine.
 *
 * Every note has an integer coordinate `q` on the infinite Line of Fifths:
 *   F = -1, C = 0, G = +1, D = +2, A = +3, E = +4, B = +5
 * Moving +1 on the line = up a perfect fifth; -1 = down a perfect fifth (up a fourth).
 *
 * Given any integer `q`, the grammatical letter name and accidental are fully
 * determined — no lookup tables needed. This eliminates manual enharmonic
 * spelling errors across all 15 keys, including double sharps/flats.
 */

const FIFTHS_ROOTS_EN = ['F', 'C', 'G', 'D', 'A', 'E', 'B'];
const FIFTHS_ROOTS_IT = ['Fa', 'Do', 'Sol', 'Re', 'La', 'Mi', 'Si'];

export interface FifthsNote {
  rootEn: string;
  rootIt: string;
  acc: string;
  accEn: string;
  fifths: number;
}

/**
 * Given any integer coordinate `q` on the Line of Fifths,
 * returns the exact grammatical note object.
 */
export function getNoteByFifths(q: number): FifthsNote {
  const letterIdx = ((q + 1) % 7 + 7) % 7;
  const sharpShift = Math.floor((q + 1) / 7);

  let acc = '';
  let accEn = '';
  if (sharpShift === 1) { acc = '#'; accEn = '#'; }
  else if (sharpShift === -1) { acc = 'b'; accEn = 'b'; }
  else if (sharpShift === 2) { acc = '##'; accEn = '##'; }
  else if (sharpShift === -2) { acc = 'bb'; accEn = 'bb'; }
  else if (sharpShift >= 3) { acc = '#'.repeat(sharpShift); accEn = '#'.repeat(sharpShift); }
  else if (sharpShift <= -3) { acc = 'b'.repeat(-sharpShift); accEn = 'b'.repeat(-sharpShift); }

  return {
    rootEn: FIFTHS_ROOTS_EN[letterIdx],
    rootIt: FIFTHS_ROOTS_IT[letterIdx],
    acc,
    accEn,
    fifths: q,
  };
}

/**
 * Returns the Italian note name (e.g. "Mi#") for a given fifths coordinate.
 */
export function fifthsToItalian(q: number): string {
  const n = getNoteByFifths(q);
  return `${n.rootIt}${n.acc}`;
}

/**
 * Returns the English note name (e.g. "E#") for a given fifths coordinate.
 */
export function fifthsToEnglish(q: number): string {
  const n = getNoteByFifths(q);
  return `${n.rootEn}${n.accEn}`;
}

/**
 * Scale degree → fifths offset from tonic.
 * Diatonic: 4=-1, 1=0, 5=+1, 2=+2, 6=+3, 3=+4, 7=+5
 * Chromatic: #4=+6, b5=-6, b2=-5, b6=-4, b3=-3, b7=-2
 * Advanced enharmonics: #1=+7, #2=-5... wait, let me recalc.
 *
 * Actually, the fifths offset for each degree is derived from the circle of fifths
 * position relative to the tonic:
 *   1  = 0    (tonic)
 *   5  = +1
 *   2  = +2
 *   6  = +3
 *   3  = +4
 *   7  = +5
 *   #4 = +6   (augmented 4th)
 *   4  = -1   (subdominant)
 *   b7 = -2
 *   b3 = -3
 *   b6 = -4
 *   b2 = -5
 *   b5 = -6   (diminished 5th)
 *
 * Advanced enharmonic degrees (same semitone, different spelling):
 *   #1 = +7   (enharmonic to b2, but spelled as raised 1st)
 *   #2 = -5 + 7 = ... no. #2 is chromatic mediant territory.
 *
 * Let me think about this more carefully.
 * #1 is 1 semitone above tonic. On the line of fifths, it's the same pitch class as b2.
 *   b2 = tonic + (-5) on line of fifths? No, that's wrong.
 *
 * Actually, the line-of-fifths offset is NOT about semitones — it's about the spelling.
 * The semitone offset and the fifths offset are different things.
 *
 * #1 is enharmonic to b2. b2 has deltaQ = -5.
 * #1 is "raised 1st degree" = the 1st degree raised by a chromatic semitone.
 * On the line of fifths, raising by a semitone = +7 fifths (since 7 fifths ≈ 12 semitones, one octave, minus the letter change).
 * So #1 = 0 + 7 = +7.
 * Similarly: #2 = +2 + 7 = +9? No...
 *
 * Actually: to raise any note by a chromatic semitone on the line of fifths, you add 7.
 * To lower any note by a chromatic semitone, you subtract 7.
 *
 * So:
 *   #1 = 1(0) + 7  = +7    (enharmonic to b2 at -5, since +7 and -5 differ by 12 = circle completes)
 *   #2 = 2(+2) + 7 = +9    (enharmonic to b3 at -3)
 *   b4 = 4(-1) - 7 = -8    (enharmonic to 3 at +4, since -8 and +4 differ by 12)
 *   #3 = 3(+4) + 7 = +11   (enharmonic to 4 at -1... no, +11 and -1 differ by 12. But #3 is enharmonic to 4)
 *   b5 = 5(+1) - 7 = -6    ✓ matches
 *   #5 = 5(+1) + 7 = +8    (enharmonic to b6 at -4, since +8 and -4 differ by 12)
 *   #6 = 6(+3) + 7 = +10   (enharmonic to b7 at -2, since +10 and -2 differ by 12)
 *   #4 = 4(-1) + 7 = +6    ✓ matches
 *   b2 = 2(+2) - 7 = -5    ✓ matches
 *   b3 = 3(+4) - 7 = -3    ✓ matches
 *   b6 = 6(+3) - 7 = -4    ✓ matches
 *   b7 = 7(+5) - 7 = -2    ✓ matches
 */

export const DEGREE_TO_DELTA_Q: Record<string, number> = {
  // Diatonic
  '1': 0,
  '5': 1,
  '2': 2,
  '6': 3,
  '3': 4,
  '7': 5,
  '4': -1,
  // Chromatic (flat side)
  'b7': -2,
  'b3': -3,
  'b6': -4,
  'b2': -5,
  'b5': -6,
  // Chromatic (sharp side)
  '#4': 6,
  // Advanced enharmonic degrees
  '#1': 7,
  '#2': 9,
  'b4': -8,
  '#3': 11,
  '#5': 8,
  '#6': 10,
};

/**
 * Tonic name → fifths coordinate q0.
 * This is the position of the tonic on the Line of Fifths.
 */
export const TONIC_TO_FIFTHS: Record<string, number> = {
  'C': 0,
  'G': 1,
  'D': 2,
  'A': 3,
  'E': 4,
  'B': 5,
  'F#': 6,
  'C#': 7,
  'F': -1,
  'Bb': -2,
  'Eb': -3,
  'Ab': -4,
  'Db': -5,
  'Gb': -6,
  'Cb': -7,
};

/**
 * The 12 chromatic scale degrees in ascending semitone order,
 * each with its fifths offset.
 * Order: 1, b2/#1, 2, b3/#2, 3, 4/b4, #4/b5, 5, b6/#5, 6, b7/#6, 7
 */
export const CHROMATIC_DEGREES_NORMAL: string[] = [
  '1', 'b2', '2', 'b3', '3', '4', '#4', '5', 'b6', '6', 'b7', '7',
];

/**
 * Returns the Italian chromatic scale for a given tonic,
 * computed deterministically via the Line of Fifths.
 */
export function getChromaticScaleItalian(tonic: string): string[] {
  const q0 = TONIC_TO_FIFTHS[tonic];
  if (q0 === undefined) throw new Error(`Unknown tonic: ${tonic}`);

  return CHROMATIC_DEGREES_NORMAL.map((deg) => {
    const deltaQ = DEGREE_TO_DELTA_Q[deg];
    if (deltaQ === undefined) throw new Error(`Unknown degree: ${deg}`);
    return fifthsToItalian(q0 + deltaQ);
  });
}

/**
 * Returns the 7 diatonic degrees (1-7) in scale order,
 * computed deterministically via the Line of Fifths.
 */
export function getDiatonicScaleItalian(tonic: string): string[] {
  const q0 = TONIC_TO_FIFTHS[tonic];
  if (q0 === undefined) throw new Error(`Unknown tonic: ${tonic}`);

  const diatonicDegrees = ['1', '2', '3', '4', '5', '6', '7'];
  return diatonicDegrees.map((deg) => {
    const deltaQ = DEGREE_TO_DELTA_Q[deg];
    if (deltaQ === undefined) throw new Error(`Unknown degree: ${deg}`);
    return fifthsToItalian(q0 + deltaQ);
  });
}

/**
 * Returns the Italian note name for any scale degree (including advanced enharmonics)
 * relative to a tonic, computed deterministically via the Line of Fifths.
 */
export function getNoteNameByFifths(tonic: string, degree: string): string {
  let degreeString = degree;
  if (degree.startsWith('_') || degree.startsWith('^')) {
    degreeString = degree.slice(1);
  }

  const q0 = TONIC_TO_FIFTHS[tonic];
  if (q0 === undefined) throw new Error(`Unknown tonic: ${tonic}`);

  const deltaQ = DEGREE_TO_DELTA_Q[degreeString];
  if (deltaQ === undefined) throw new Error(`Unknown scale degree: ${degreeString}`);

  return fifthsToItalian(q0 + deltaQ);
}

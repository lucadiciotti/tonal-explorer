import { Note } from '../types';

// Maps scale degrees to semitones from tonic
const SCALE_DEGREE_TO_SEMITONES: Record<string, number> = {
  '1': 0,
  'b2': 1,
  '2': 2,
  'b3': 3,
  '3': 4,
  '4': 5,
  '#4': 6,
  '5': 7,
  'b6': 8,
  '6': 9,
  'b7': 10,
  '7': 11,
};

// Maps note names to semitones from C
const NOTE_TO_SEMITONES: Record<string, number> = {
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

const SEMITONES_TO_NOTE: string[] = ['C', 'C#', 'D', 'D#', 'E', 'F', 'F#', 'G', 'G#', 'A', 'A#', 'B'];

/**
 * Converts a scale degree notation (e.g., "_b3", "5", "^#4") relative to a tonic
 * into an absolute note name and octave number
 */
export function convertScaleDegreeToNote(scaleDegree: Note, tonic: string): { note: string; octave: number } {
  // Parse the scale degree
  let octaveModifier = 0;
  let degreeString = scaleDegree;

  if (scaleDegree.startsWith('_')) {
    octaveModifier = -1;
    degreeString = scaleDegree.slice(1);
  } else if (scaleDegree.startsWith('^')) {
    octaveModifier = 1;
    degreeString = scaleDegree.slice(1);
  }

  // Get semitones for the scale degree
  const degreeSemitones = SCALE_DEGREE_TO_SEMITONES[degreeString];
  if (degreeSemitones === undefined) {
    throw new Error(`Unknown scale degree: ${degreeString}`);
  }

  // Get semitones for the tonic
  const tonicSemitones = NOTE_TO_SEMITONES[tonic];
  if (tonicSemitones === undefined) {
    throw new Error(`Unknown tonic: ${tonic}`);
  }

  // Calculate absolute semitone position
  let absoluteSemitones = tonicSemitones + degreeSemitones;

  // Base octave is 4 (middle octave)
  let octave = 4 + octaveModifier;

  // Handle octave wrapping
  while (absoluteSemitones >= 12) {
    absoluteSemitones -= 12;
    octave += 1;
  }
  while (absoluteSemitones < 0) {
    absoluteSemitones += 12;
    octave -= 1;
  }

  const note = SEMITONES_TO_NOTE[absoluteSemitones];

  return { note, octave };
}

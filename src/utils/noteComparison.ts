const ENHARMONIC_EQUIVALENTS: Record<string, string[]> = {
  'C': ['C', 'B#', 'Dbb'],
  'C#': ['C#', 'Db', 'B##'],
  'D': ['D', 'C##', 'Ebb'],
  'D#': ['D#', 'Eb', 'Fbb'],
  'E': ['E', 'D##', 'Fb'],
  'F': ['F', 'E#', 'Gbb'],
  'F#': ['F#', 'Gb', 'E##'],
  'G': ['G', 'F##', 'Abb'],
  'G#': ['G#', 'Ab'],
  'A': ['A', 'G##', 'Bbb'],
  'A#': ['A#', 'Bb', 'Cbb'],
  'B': ['B', 'A##', 'Cb'],
};

export function normalizeNote(note: string): string {
  for (const [key, equivalents] of Object.entries(ENHARMONIC_EQUIVALENTS)) {
    if (equivalents.includes(note)) {
      return key;
    }
  }
  return note;
}

export function areNotesEqual(note1: string, note2: string, ignoreOctave: boolean = true): boolean {
  const normalized1 = normalizeNote(note1);
  const normalized2 = normalizeNote(note2);
  return normalized1 === normalized2;
}

export function areNotesEqualWithOctave(
  note1: string,
  octave1: number,
  note2: string,
  octave2: number
): boolean {
  return areNotesEqual(note1, note2) && octave1 === octave2;
}

// Given a wrong answer, determine if it's a pure octave error (right pitch class, wrong octave)
// or a degree error (wrong pitch class).
// noteWithOctave format: "C4", "F#5", "Bb3", etc.
export function classifyError(playedNoteWithOctave: string, expectedNoteWithOctave: string): 'octave' | 'degree' | null {
  const pm = playedNoteWithOctave.match(/^([A-Ga-g][#b]?)(\d+)$/);
  const em = expectedNoteWithOctave.match(/^([A-Ga-g][#b]?)(\d+)$/);
  if (!pm || !em) return null;
  return areNotesEqual(pm[1], em[1]) ? 'octave' : 'degree';
}

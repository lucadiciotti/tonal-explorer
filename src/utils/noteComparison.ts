const LETTER_TO_SEMITONE: Record<string, number> = {
  'C': 0, 'D': 2, 'E': 4, 'F': 5, 'G': 7, 'A': 9, 'B': 11,
};

function noteToSemitones(note: string): number | null {
  const match = note.match(/^([A-G])(#{0,4}|b{0,4})$/i);
  if (!match) return null;
  const letter = match[1].toUpperCase();
  const acc = match[2];
  let semitones = LETTER_TO_SEMITONE[letter];
  if (semitones === undefined) return null;
  for (const c of acc) {
    if (c === '#') semitones += 1;
    else if (c === 'b') semitones -= 1;
  }
  return ((semitones % 12) + 12) % 12;
}

const SEMITONE_TO_NORMALIZED = [
  'C', 'C#', 'D', 'D#', 'E', 'F', 'F#', 'G', 'G#', 'A', 'A#', 'B',
];

export function normalizeNote(note: string): string {
  const semitones = noteToSemitones(note);
  if (semitones === null) return note;
  return SEMITONE_TO_NORMALIZED[semitones];
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

export function classifyError(playedNoteWithOctave: string, expectedNoteWithOctave: string): 'octave' | 'degree' | null {
  const pm = playedNoteWithOctave.match(/^([A-G](?:#{1,4}|b{1,4})?)(\d+)$/i);
  const em = expectedNoteWithOctave.match(/^([A-G](?:#{1,4}|b{1,4})?)(\d+)$/i);
  if (!pm || !em) return null;
  return areNotesEqual(pm[1], em[1]) ? 'octave' : 'degree';
}

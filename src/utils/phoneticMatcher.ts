interface SyllableEntry {
  syllable: string;
  note: string;
  priority: number;
}

const VALID_SYLLABLES: SyllableEntry[] = [
  { syllable: 'do', note: 'Do', priority: 0 },
  { syllable: 're', note: 'Re', priority: 0 },
  { syllable: 'mi', note: 'Mi', priority: 0 },
  { syllable: 'fa', note: 'Fa', priority: 0 },
  { syllable: 'sol', note: 'Sol', priority: 0 },
  { syllable: 'la', note: 'La', priority: 0 },
  { syllable: 'si', note: 'Si', priority: 0 },
  { syllable: 'du', note: 'Do#', priority: 1 },
  { syllable: 'ri', note: 'Re#', priority: 1 },
  { syllable: 'ra', note: 'Reb', priority: 1 },
  { syllable: 'mo', note: 'Mi#', priority: 1 },
  { syllable: 'me', note: 'Mib', priority: 1 },
  { syllable: 'fe', note: 'Fa#', priority: 1 },
  { syllable: 'fu', note: 'Fab', priority: 1 },
  { syllable: 'sul', note: 'Sol#', priority: 1 },
  { syllable: 'sil', note: 'Solb', priority: 1 },
  { syllable: 'le', note: 'La#', priority: 1 },
  { syllable: 'lu', note: 'Lab', priority: 1 },
  { syllable: 'so', note: 'Si#', priority: 1 },
  { syllable: 'se', note: 'Sib', priority: 1 },
];

const PHONETIC_GROUPS: ReadonlySet<string>[] = [
  new Set(['i', 'e']),
  new Set(['o', 'u']),
  new Set(['t', 'd', 'n', 's', 'z', 'l', 'r']),
  new Set(['p', 'b', 'm', 'f', 'v']),
  new Set(['c', 'g', 'k', 'q']),
];

function substitutionCost(a: string, b: string): number {
  if (a === b) return 0;
  for (const group of PHONETIC_GROUPS) {
    if (group.has(a) && group.has(b)) return 0.5;
  }
  return 1;
}

function weightedLevenshtein(a: string, b: string): number {
  const m = a.length;
  const n = b.length;
  if (m === 0) return n;
  if (n === 0) return m;

  const prev = new Array<number>(n + 1);
  const curr = new Array<number>(n + 1);

  for (let j = 0; j <= n; j++) prev[j] = j;

  for (let i = 1; i <= m; i++) {
    curr[0] = i;
    for (let j = 1; j <= n; j++) {
      const cost = substitutionCost(a[i - 1], b[j - 1]);
      curr[j] = Math.min(
        prev[j] + 1,
        curr[j - 1] + 1,
        prev[j - 1] + cost,
      );
    }
    for (let j = 0; j <= n; j++) prev[j] = curr[j];
  }

  return prev[n];
}

/**
 * Normalize a word to its Italian phonetic form before distance
 * comparison. The Italian speech engine often mishears short
 * syllables as English-looking words (e.g. "sil"→"seal", "sil"→"syll").
 * These rules collapse English digraphs and doubled consonants back
 * to their Italian phonetic equivalents.
 */
function phoneticNormalize(word: string): string {
  let w = word;

  // y → i  (syll → sill)
  w = w.replace(/y/g, 'i');

  // English vowel digraphs → Italian single vowel
  w = w
    .replace(/ea/g, 'i')   // seal → sil
    .replace(/ee/g, 'i')   // seel → sil
    .replace(/ie/g, 'i')   // 
    .replace(/oo/g, 'u')   // sool → sul
    .replace(/ou/g, 'u')   // soul → sul
    .replace(/oa/g, 'o')   // 
    .replace(/ai/g, 'e')   // 
    .replace(/ae/g, 'e');  //

  // Collapse doubled consonants (ll→l, ss→s, nn→n, etc.)
  w = w.replace(/([bcdfglmnprst])\1/g, '$1');

  // Drop trailing silent 'e' after a consonant (but not after a vowel
  // cluster that would change the syllable — "se" is a valid syllable
  // for Sib, so we only drop 'e' when the word is longer than 2 chars
  // and the preceding char is a consonant, meaning the 'e' was likely
  // silent: "sile" → "sil", but "se" stays "se").
  if (w.length > 2 && /[^aeiou]e$/.test(w)) {
    w = w.slice(0, -1);
  }

  return w;
}

/**
 * Fallback matcher: when the regex-based parseSpokenNote finds nothing,
 * compare each word against all valid note syllables using a phonetically
 * weighted edit distance. Catches mishearings the regex doesn't anticipate
 * (e.g. "no" → "do", "te" → "re", "seal" → "sil") by exploiting the fact
 * that consonants in the same place of articulation and close vowels are
 * easily confused by a general-purpose speech engine.
 */
export function phoneticMatchNote(text: string): string | null {
  const normalized = text.toLowerCase().trim()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '');

  const words = normalized.split(/\s+/).filter(w => w.length > 0);
  if (words.length === 0) return null;

  let bestNote: string | null = null;
  let bestDist = Infinity;
  let bestPriority = Infinity;

  for (const word of words) {
    const phonetic = phoneticNormalize(word);
    for (const { syllable, note, priority } of VALID_SYLLABLES) {
      const dist = weightedLevenshtein(phonetic, syllable);
      const threshold = syllable.length <= 2 ? 0.5 : 1.0;
      if (dist > threshold) continue;

      if (
        dist < bestDist ||
        (dist === bestDist && priority < bestPriority)
      ) {
        bestNote = note;
        bestDist = dist;
        bestPriority = priority;
      }
    }
  }

  return bestNote;
}

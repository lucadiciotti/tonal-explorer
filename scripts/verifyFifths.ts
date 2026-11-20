/**
 * Verification script: compares the Line of Fifths algorithm output
 * against the hardcoded tables in italianNotes.ts.
 *
 * Run: npx tsx scripts/verifyFifths.ts
 */

import {
  getChromaticScaleItalian,
  getDiatonicScaleItalian,
  getNoteNameByFifths,
  DEGREE_TO_DELTA_Q,
  TONIC_TO_FIFTHS,
} from '../src/utils/lineOfFifths';

// --- Mirror the hardcoded tables from italianNotes.ts ---

const HARDCODED_CHROMATIC: Record<string, string[]> = {
  'C':  ['Do', 'Do#', 'Re', 'Re#', 'Mi', 'Fa', 'Fa#', 'Sol', 'Sol#', 'La', 'La#', 'Si'],
  'G':  ['Sol', 'Sol#', 'La', 'La#', 'Si', 'Do', 'Do#', 'Re', 'Re#', 'Mi', 'Fa', 'Fa#'],
  'D':  ['Re', 'Re#', 'Mi', 'Fa', 'Fa#', 'Sol', 'Sol#', 'La', 'La#', 'Si', 'Do', 'Do#'],
  'A':  ['La', 'La#', 'Si', 'Do', 'Do#', 'Re', 'Re#', 'Mi', 'Fa', 'Fa#', 'Sol', 'Sol#'],
  'E':  ['Mi', 'Fa', 'Fa#', 'Sol', 'Sol#', 'La', 'La#', 'Si', 'Do', 'Do#', 'Re', 'Re#'],
  'B':  ['Si', 'Do', 'Do#', 'Re', 'Re#', 'Mi', 'Fa', 'Fa#', 'Sol', 'Sol#', 'La', 'La#'],
  'Cb': ['Dob', 'Do', 'Reb', 'Re', 'Mib', 'Fab', 'Fa', 'Solb', 'Sol', 'Lab', 'La', 'Sib'],
  'F#': ['Fa#', 'Sol', 'Sol#', 'La', 'La#', 'Si', 'Do', 'Do#', 'Re', 'Re#', 'Mi', 'Mi#'],
  'Gb': ['Solb', 'Sol', 'Lab', 'La', 'Sib', 'Dob', 'Do', 'Reb', 'Re', 'Mib', 'Mi', 'Fa'],
  'C#': ['Do#', 'Re', 'Re#', 'Mi', 'Mi#', 'Fa#', 'Sol', 'Sol#', 'La', 'La#', 'Si', 'Si#'],
  'Db': ['Reb', 'Re', 'Mib', 'Mi', 'Fa', 'Solb', 'Sol', 'Lab', 'La', 'Sib', 'Si', 'Do'],
  'Ab': ['Lab', 'La', 'Sib', 'Si', 'Do', 'Reb', 'Re', 'Mib', 'Mi', 'Fa', 'Solb', 'Sol'],
  'Eb': ['Mib', 'Mi', 'Fa', 'Solb', 'Sol', 'Lab', 'La', 'Sib', 'Si', 'Do', 'Reb', 'Re'],
  'Bb': ['Sib', 'Si', 'Do', 'Reb', 'Re', 'Mib', 'Mi', 'Fa', 'Solb', 'Sol', 'Lab', 'La'],
  'F':  ['Fa', 'Solb', 'Sol', 'Lab', 'La', 'Sib', 'Si', 'Do', 'Reb', 'Re', 'Mib', 'Mi'],
};

const HARDCODED_DIATONIC: Record<string, string[]> = {
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

// Hardcoded degree→semitones and the getItalianNoteName logic from italianNotes.ts
// We need to replicate the full getItalianNoteName function to compare per-degree.
const SCALE_DEGREE_TO_SEMITONES: Record<string, number> = {
  '1': 0, '#1': 1, 'b2': 1, '2': 2, '#2': 3, 'b3': 3, '3': 4, 'b4': 4,
  '4': 5, '#3': 5, '#4': 6, 'b5': 6, '5': 7, '#5': 8, 'b6': 8, '6': 9,
  '#6': 10, 'b7': 10, '7': 11,
};

function lowerSemitone(note: string): string {
  if (note.endsWith('#')) return note.slice(0, -1);
  return note + 'b';
}

function raiseSemitone(note: string): string {
  if (note.endsWith('b')) return note.slice(0, -1);
  return note + '#';
}

function hardcodedGetItalianNoteName(tonic: string, degree: string): string {
  let degreeString = degree;
  if (degree.startsWith('_') || degree.startsWith('^')) {
    degreeString = degree.slice(1);
  }

  const scale = HARDCODED_CHROMATIC[tonic];
  if (!scale) throw new Error(`Unknown tonic: ${tonic}`);

  const semitones = SCALE_DEGREE_TO_SEMITONES[degreeString];
  if (semitones === undefined) throw new Error(`Unknown scale degree: ${degreeString}`);

  if (degreeString.startsWith('b')) {
    const diatonic = HARDCODED_DIATONIC[tonic];
    const naturalDegreeNum = degreeString.slice(1);
    const naturalNote = diatonic[parseInt(naturalDegreeNum) - 1];
    return lowerSemitone(naturalNote);
  }

  if (degreeString.startsWith('#')) {
    const diatonic = HARDCODED_DIATONIC[tonic];
    const naturalDegreeNum = degreeString.slice(1);
    const naturalNote = diatonic[parseInt(naturalDegreeNum) - 1];
    return raiseSemitone(naturalNote);
  }

  return scale[semitones];
}

// --- Run the comparison ---

const ALL_TONICS = ['C', 'G', 'D', 'A', 'E', 'B', 'F#', 'C#', 'F', 'Bb', 'Eb', 'Ab', 'Db', 'Gb', 'Cb'];
const ALL_DEGREES = ['1', '#1', 'b2', '2', '#2', 'b3', '3', 'b4', '4', '#3', '#4', 'b5', '5', '#5', 'b6', '6', '#6', 'b7', '7'];
const CHROMATIC_DEGREES = ['1', 'b2', '2', 'b3', '3', '4', '#4', '5', 'b6', '6', 'b7', '7'];

let totalChecks = 0;
let mismatches = 0;
const mismatchList: string[] = [];

console.log('='.repeat(80));
console.log('LINE OF FIFTHS vs HARDCODED TABLES — VERIFICATION REPORT');
console.log('='.repeat(80));

// 1. Compare chromatic scales
console.log('\n--- CHROMATIC SCALES (12 notes) ---\n');
for (const tonic of ALL_TONICS) {
  const algoScale = getChromaticScaleItalian(tonic);
  const hardScale = HARDCODED_CHROMATIC[tonic];

  totalChecks += 12;
  const mismatchesInScale: string[] = [];
  for (let i = 0; i < 12; i++) {
    if (algoScale[i] !== hardScale[i]) {
      mismatches++;
      mismatchesInScale.push(`  [${i}] ${CHROMATIC_DEGREES[i]}: algo="${algoScale[i]}"  hardcoded="${hardScale[i]}"`);
    }
  }
  if (mismatchesInScale.length > 0) {
    console.log(`${tonic}: ${mismatchesInScale.length} mismatch(es)`);
    mismatchList.push(`\n${tonic} chromatic:`);
    mismatchesInScale.forEach(m => { mismatchList.push(m); console.log(m); });
  } else {
    console.log(`${tonic}: OK`);
  }
}

// 2. Compare diatonic scales
console.log('\n--- DIATONIC SCALES (7 notes) ---\n');
const DIATONIC_DEGREES = ['1', '2', '3', '4', '5', '6', '7'];
for (const tonic of ALL_TONICS) {
  const algoScale = getDiatonicScaleItalian(tonic);
  const hardScale = HARDCODED_DIATONIC[tonic];

  totalChecks += 7;
  const mismatchesInScale: string[] = [];
  for (let i = 0; i < 7; i++) {
    if (algoScale[i] !== hardScale[i]) {
      mismatches++;
      mismatchesInScale.push(`  ${DIATONIC_DEGREES[i]}: algo="${algoScale[i]}"  hardcoded="${hardScale[i]}"`);
    }
  }
  if (mismatchesInScale.length > 0) {
    console.log(`${tonic}: ${mismatchesInScale.length} mismatch(es)`);
    mismatchList.push(`\n${tonic} diatonic:`);
    mismatchesInScale.forEach(m => { mismatchList.push(m); console.log(m); });
  } else {
    console.log(`${tonic}: OK`);
  }
}

// 3. Compare per-degree note names (all 19 degrees including advanced enharmonics)
console.log('\n--- PER-DEGREE NOTE NAMES (19 degrees × 15 tonics) ---\n');
for (const tonic of ALL_TONICS) {
  let tonicMismatches = 0;
  const details: string[] = [];
  for (const deg of ALL_DEGREES) {
    totalChecks++;
    let algoName: string, hardName: string;
    try {
      algoName = getNoteNameByFifths(tonic, deg);
    } catch (e) {
      algoName = `ERROR: ${(e as Error).message}`;
    }
    try {
      hardName = hardcodedGetItalianNoteName(tonic, deg);
    } catch (e) {
      hardName = `ERROR: ${(e as Error).message}`;
    }

    if (algoName !== hardName) {
      mismatches++;
      tonicMismatches++;
      details.push(`  ${deg.padEnd(4)} algo="${algoName}"  hardcoded="${hardName}"`);
    }
  }
  if (tonicMismatches > 0) {
    console.log(`${tonic}: ${tonicMismatches} mismatch(es)`);
    mismatchList.push(`\n${tonic} per-degree:`);
    details.forEach(d => { mismatchList.push(d); console.log(d); });
  } else {
    console.log(`${tonic}: OK`);
  }
}

// 4. Summary
console.log('\n' + '='.repeat(80));
console.log(`TOTAL CHECKS: ${totalChecks}`);
console.log(`MISMATCHES:   ${mismatches}`);
console.log(`MATCH RATE:   ${((totalChecks - mismatches) / totalChecks * 100).toFixed(1)}%`);
console.log('='.repeat(80));

if (mismatches > 0) {
  console.log('\n\nFULL MISMATCH LIST:');
  mismatchList.forEach(m => console.log(m));
}

// 5. Also dump the full algorithm-generated tables for visual inspection
console.log('\n\n--- ALGORITHM-GENERATED CHROMATIC SCALES (for visual inspection) ---\n');
for (const tonic of ALL_TONICS) {
  const scale = getChromaticScaleItalian(tonic);
  console.log(`  '${tonic}':  [${scale.map(n => `'${n}'`).join(', ')}],`);
}

console.log('\n--- ALGORITHM-GENERATED DIATONIC SCALES ---\n');
for (const tonic of ALL_TONICS) {
  const scale = getDiatonicScaleItalian(tonic);
  console.log(`  '${tonic}': [${scale.map(n => `'${n}'`).join(', ')}],`);
}

console.log('\n--- ALGORITHM: ALL 19 DEGREES × 15 TONICS ---\n');
console.log('Tonic  | ' + ALL_DEGREES.map(d => d.padEnd(6)).join(' | '));
console.log('-'.repeat(120));
for (const tonic of ALL_TONICS) {
  const notes = ALL_DEGREES.map(deg => {
    try { return getNoteNameByFifths(tonic, deg); }
    catch { return 'ERR'; }
  });
  console.log(`${tonic.padEnd(6)} | ` + notes.map(n => n.padEnd(6)).join(' | '));
}

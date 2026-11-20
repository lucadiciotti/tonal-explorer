import { Note } from '../types';

const NORMAL_NOTES = ['1', 'b2', '2', 'b3', '3', '4', '#4', '5', 'b6', '6', 'b7', '7'];
const ADVANCED_NOTES = ['1', '#1', 'b2', '2', '#2', 'b3', '3', 'b4', '4', '#3', '#4', 'b5', '5', '#5', 'b6', '6', '#6', 'b7', '7'];
const EXTENSIONS = ['_', '', '^'];

export function generateRandomNote(degreeSet: 'normal' | 'advanced' = 'normal'): Note {
  const pool = degreeSet === 'advanced' ? ADVANCED_NOTES : NORMAL_NOTES;
  const extension = EXTENSIONS[Math.floor(Math.random() * EXTENSIONS.length)];
  const baseNote = pool[Math.floor(Math.random() * pool.length)];

  if (extension === '') {
    return baseNote;
  }

  return `${extension}${baseNote}`;
}

export function generateNoteSequence(count: number, degreeSet: 'normal' | 'advanced' = 'normal'): Note[] {
  return Array.from({ length: count }, () => generateRandomNote(degreeSet));
}

import { Note } from '../types';

const BASE_NOTES = ['1', 'b2', '2', 'b3', '3', '4', '#4', '5', 'b6', '6', 'b7', '7'];
const EXTENSIONS = ['_', '', '^'];

export function generateRandomNote(): Note {
  const extension = EXTENSIONS[Math.floor(Math.random() * EXTENSIONS.length)];
  const baseNote = BASE_NOTES[Math.floor(Math.random() * BASE_NOTES.length)];

  if (extension === '') {
    return baseNote;
  }

  return `${extension}${baseNote}`;
}

export function generateNoteSequence(count: number): Note[] {
  return Array.from({ length: count }, () => generateRandomNote());
}

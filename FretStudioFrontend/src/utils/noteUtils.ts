import type { AccidentalType } from '../contexts/AccidentalTypeContext';

// --- Constants ---
const SHARP_NOTES = ["C", "C#", "D", "D#", "E", "F", "F#", "G", "G#", "A", "A#", "B"];
const FLAT_NOTES = ["C", "Db", "D", "Eb", "E", "F", "Gb", "G", "Ab", "A", "Bb", "B"];
const SHARP_TO_FLAT: { [key: string]: string } = {
  'C#': 'Db', 'D#': 'Eb', 'F#': 'Gb', 'G#': 'Ab', 'A#': 'Bb',
};

// --- Existing Exports (Preserved) ---
export const NOTES = SHARP_NOTES;

export function getNoteIndex(note: string): number {
  // Note: This will always use the sharp-based index for internal calculations.
  const flatToSharp: { [key: string]: string } = { 'DB': 'C#', 'EB': 'D#', 'GB': 'F#', 'AB': 'G#', 'BB': 'A#' };
  const upperNote = note.toUpperCase();
  const sharpNote = flatToSharp[upperNote] || upperNote;
  return NOTES.indexOf(sharpNote);
}

export function transposeNote(note: string, semitones: number): string {
  const idx = getNoteIndex(note);
  if (idx === -1) throw new Error(`Invalid note: ${note}`);
  const newIdx = (idx + semitones + NOTES.length) % NOTES.length;
  return NOTES[newIdx];
}

export function getScaleNotes(root: string, intervals: number[]): string[] {
  const rootIdx = getNoteIndex(root);
  if (rootIdx === -1) throw new Error(`Invalid root note: ${root}`);
  return intervals.map(i => NOTES[(rootIdx + i) % NOTES.length]);
}

// --- New Exports ---
/**
 * Formats a single note based on the selected accidental type.
 * @param note The note to format (e.g., "C#").
 * @param accidentalType The desired format ('sharps' or 'flats').
 * @returns The formatted note string.
 */
export const formatNote = (note: string, accidentalType: AccidentalType = 'sharps'): string => {
  if (accidentalType === 'flats' && SHARP_TO_FLAT[note]) {
    return SHARP_TO_FLAT[note];
  }
  return note;
};

/**
 * Returns the appropriate array of 12 notes for display based on the accidental type.
 * @param accidentalType The desired format ('sharps' or 'flats').
 * @returns An array of 12 note strings.
 */
export const getNoteNames = (accidentalType: AccidentalType): string[] => {
    return accidentalType === 'flats' ? FLAT_NOTES : SHARP_NOTES;
}
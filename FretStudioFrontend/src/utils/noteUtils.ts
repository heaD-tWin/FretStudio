import type { AccidentalType } from '../contexts/AccidentalTypeContext';

// --- Constants ---
const SHARP_NOTES = ["C", "C#", "D", "D#", "E", "F", "F#", "G", "G#", "A", "A#", "B"];
const FLAT_NOTES = ["C", "Db", "D", "Eb", "E", "F", "Gb", "G", "Ab", "A", "Bb", "B"];
const SHARP_TO_FLAT: { [key: string]: string } = {
  'C#': 'Db', 'D#': 'Eb', 'F#': 'Gb', 'G#': 'Ab', 'A#': 'Bb',
};
const FLAT_TO_SHARP: { [key: string]: string } = {
  'Db': 'C#', 'Eb': 'D#', 'Gb': 'F#', 'Ab': 'G#', 'Bb': 'A#',
};

// --- Existing Exports (Preserved) ---
export const NOTES = SHARP_NOTES;

export function getNoteIndex(note: string): number {
  const upperNote = note.toUpperCase();
  const sharpNote = (FLAT_TO_SHARP[note as keyof typeof FLAT_TO_SHARP] || note).toUpperCase();
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

// --- New and Updated Exports ---

/**
 * Converts a user-facing note name (which could be a flat) to its sharp-based equivalent for backend calls.
 * @param note The note to un-format (e.g., "Db").
 * @returns The sharp-based note string (e.g., "C#").
 */
export const unformatNote = (note: string): string => {
  return FLAT_TO_SHARP[note] || note;
};

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
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

// --- Note Conversion and Formatting ---

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

/**
 * Determines the CSS classes for a note on the fretboard based on its role.
 * @param note The note to classify.
 * @param validNotes An array of notes that are part of the current chord or scale.
 * @param scaleRootNote The root note of the scale.
 * @param chordRootNote The root note of the chord.
 * @returns A string of CSS class names.
 */
export const getNoteClass = (
  note: string,
  validNotes: string[],
  scaleRootNote?: string,
  chordRootNote?: string
): string => {
  const classes: string[] = [];
  const isScaleRoot = note === scaleRootNote;
  const isChordRoot = note === chordRootNote;
  const isInScaleOrChord = validNotes.includes(note);

  if (isScaleRoot) {
    classes.push('scale-root');
  } else if (isChordRoot) {
    classes.push('chord-root');
  }

  if (isInScaleOrChord) {
    classes.push('in-scale');
  }

  return classes.join(' ');
};
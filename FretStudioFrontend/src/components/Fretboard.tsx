import './Fretboard.css';
import type { FretboardAPIResponse, Voicing } from '../apiService';

interface FretboardProps {
  fretboardData: FretboardAPIResponse | null;
  selectedVoicing: Voicing | null;
  scaleRootNote: string;
  chordRootNote: string | null;
  onFretClick?: (string: number, fret: number) => void;
}

const DEFAULT_STRINGS = 6;
const DEFAULT_FRETS = 24;

const Fretboard = ({ fretboardData, selectedVoicing, scaleRootNote, chordRootNote, onFretClick }: FretboardProps) => {
  const voicingMap = selectedVoicing 
    ? new Map(selectedVoicing.fingering.map(([string, fret, finger]) => [`${string}-${fret}`, finger]))
    : null;
  
  const stringStatusMap = selectedVoicing
    ? new Map(selectedVoicing.fingering.map(([string, fret]) => [string, fret]))
    : null;

  const renderFrets = (stringIndex: number) => {
    const fretsArray = [];
    const stringKey = String(stringIndex + 1);
    const stringNotes = fretboardData ? fretboardData[stringKey] : [];

    for (let fretIndex = 0; fretIndex <= DEFAULT_FRETS; fretIndex++) {
      const note = stringNotes ? stringNotes[fretIndex] : null;
      const stringId = DEFAULT_STRINGS - stringIndex;
      const finger = voicingMap ? voicingMap.get(`${stringId}-${fretIndex}`) : undefined;

      const fretClasses = ['fret'];
      if (onFretClick) fretClasses.push('interactive');
      let isChordNote = false;
      let isChordRoot = false;

      if (note) {
        // Only apply scale styles if a scale root is provided
        if (scaleRootNote) {
          if (note.is_in_scale) fretClasses.push('in-scale');
          if (note.note === scaleRootNote) fretClasses.push('scale-root');
        }

        if (selectedVoicing) {
          if (finger !== undefined && finger >= 0) isChordNote = true;
        } else {
          if (note.is_in_chord) isChordNote = true;
        }

        if (isChordNote && note.note === chordRootNote) {
          isChordRoot = true;
        }
      }

      fretsArray.push(
        <div 
          key={`fret-${stringIndex}-${fretIndex}`} 
          className={fretClasses.join(' ')}
          onClick={() => onFretClick && onFretClick(stringId, fretIndex)}
        >
          <div className="note-name">{note ? note.note : ''}</div>
          {isChordRoot && <div className="chord-note-marker chord-root-marker"></div>}
          {isChordNote && !isChordRoot && <div className="chord-note-marker"></div>}
          {finger !== undefined && finger > 0 && <div className="finger-number">{finger}</div>}
        </div>
      );
    }
    return fretsArray;
  };

  const renderStrings = () => {
    const stringsArray = [];
    for (let i = 0; i < DEFAULT_STRINGS; i++) {
      const stringId = DEFAULT_STRINGS - i;
      const fret = stringStatusMap ? stringStatusMap.get(stringId) : undefined;
      let indicator = null;

      if (fret !== undefined) {
        if (fret >= 0) indicator = 'o';
        else if (fret === -1) indicator = 'x';
      }

      stringsArray.push(
        <div key={`string-row-${i}`} className="string-row">
          <div className="strum-indicator">{indicator}</div>
          {renderFrets(i)}
        </div>
      );
    }
    return stringsArray;
  };

  return (
    <div className="fretboard-container">
      <div className="fretboard">{renderStrings()}</div>
    </div>
  );
};

export default Fretboard;
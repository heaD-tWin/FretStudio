import './Fretboard.css';
import type { FretboardAPIResponse, Voicing } from '../apiService';

interface FretboardProps {
  fretboardData: FretboardAPIResponse | null;
  selectedVoicing: Voicing | null;
  scaleRootNote: string;
  chordRootNote: string | null;
}

const DEFAULT_STRINGS = 6;
const DEFAULT_FRETS = 12;

const Fretboard = ({ fretboardData, selectedVoicing, scaleRootNote, chordRootNote }: FretboardProps) => {
  const voicingMap = selectedVoicing 
    ? new Map(selectedVoicing.map(([string, fret, finger]) => [`${string}-${fret}`, finger]))
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
      let isChordNote = false;
      let isChordRoot = false;

      if (note) {
        if (note.is_in_scale) fretClasses.push('in-scale');
        if (note.note === scaleRootNote) fretClasses.push('scale-root');

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
        <div key={`fret-${stringIndex}-${fretIndex}`} className={fretClasses.join(' ')}>
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
      stringsArray.push(<div key={`string-${i}`} className="string-row">{renderFrets(i)}</div>);
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
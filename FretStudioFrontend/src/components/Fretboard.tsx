import './Fretboard.css';
import type { FretboardAPIResponse, Voicing } from '../apiService';
import type { AccidentalType } from '../contexts/AccidentalTypeContext';
import { formatNote } from '../utils/noteUtils';

interface FretboardProps {
  fretboardData: FretboardAPIResponse | null;
  selectedVoicing: Voicing | null;
  scaleRootNote?: string;
  chordRootNote?: string | null;
  validNotes?: string[];
  onFretClick?: (string: number, fret: number) => void;
  activeFret?: [number, number] | null;
  onFingerSelect?: (finger: number) => void;
  onStrumToggle?: (stringId: number) => void;
  isLeftHanded?: boolean;
  accidentalType?: AccidentalType;
}

const DEFAULT_STRINGS = 6;
const DEFAULT_FRETS = 24;

const Fretboard = ({ 
  fretboardData, 
  selectedVoicing, 
  scaleRootNote, 
  chordRootNote, 
  validNotes, 
  onFretClick, 
  activeFret, 
  onFingerSelect, 
  onStrumToggle,
  isLeftHanded,
  accidentalType
}: FretboardProps) => {

  const voicingMap = selectedVoicing ? new Map(selectedVoicing.fingering.map(([s, f, fin]) => [`${s}-${f}`, fin])) : null;
  const stringStatusMap = selectedVoicing ? new Map(selectedVoicing.fingering.map(([s, f]) => [s, f])) : null;

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
        if (scaleRootNote) { // Main Scale Visualizer Mode
          if (note.is_in_scale) fretClasses.push('in-scale');
          if (note.note === scaleRootNote) fretClasses.push('scale-root');
          if (selectedVoicing) {
            if (finger !== undefined && finger >= 0) isChordNote = true;
          } else {
            if (note.is_in_chord) isChordNote = true;
          }
          if (isChordNote && note.note === chordRootNote) isChordRoot = true;
        } else if (validNotes) { // Editor or Chord Visualizer Mode
          const isNoteInChord = validNotes.includes(note.note);

          if (isNoteInChord) {
            fretClasses.push('in-scale');
          }
          
          // Add the darker background for the chord's root note.
          if (note.note === chordRootNote) {
            fretClasses.push('scale-root');
          }

          if (selectedVoicing) {
            if (finger !== undefined && finger >= 0) {
              isChordNote = true;
            }
          } else {
            if (isNoteInChord) {
              isChordNote = true;
            }
          }

          if (isChordNote && note.note === chordRootNote) isChordRoot = true;
        }
      }
      
      const isActive = activeFret && activeFret[0] === stringId && activeFret[1] === fretIndex;

      fretsArray.push(
        <div key={`fret-${stringIndex}-${fretIndex}`} className={fretClasses.join(' ')} onClick={() => onFretClick && onFretClick(stringId, fretIndex)}>
          <div className="note-name">{note ? formatNote(note.note, accidentalType) : ''}</div>
          {isChordRoot && <div className="chord-note-marker chord-root-marker"></div>}
          {isChordNote && !isChordRoot && <div className="chord-note-marker"></div>}
          {finger !== undefined && finger > 0 && <div className="finger-number">{finger}</div>}
          {isActive && onFingerSelect && (
            <div className="finger-selector">
              {[1, 2, 3, 4].map(f => <button key={f} onClick={() => onFingerSelect(f)}>{f}</button>)}
              <button className="remove" onClick={() => onFingerSelect(0)}>X</button>
            </div>
          )}
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
      let indicatorClass = 'strum-indicator';

      if (fret !== undefined) {
        if (fret === 0) indicator = 'o';
        else if (fret === -1) {
          indicator = 'x';
          indicatorClass += ' muted';
        }
      }
      
      if (onStrumToggle) indicatorClass += ' interactive';

      stringsArray.push(
        <div key={`string-row-${i}`} className="string-row">
          <div className={indicatorClass} onClick={() => onStrumToggle && onStrumToggle(stringId)}>
            {indicator}
          </div>
          {renderFrets(i)}
        </div>
      );
    }
    return stringsArray;
  };

  const fretboardClassName = `fretboard ${isLeftHanded ? 'left-handed' : ''}`;

  return (
    <div className="fretboard-container">
      <div className={fretboardClassName}>{renderStrings()}</div>
    </div>
  );
};

export default Fretboard;
import './Fretboard.css';
import type { FretboardAPIResponse, Voicing } from '../apiService';

interface FretboardProps {
  fretboardData: FretboardAPIResponse | null;
  selectedVoicing: Voicing | null;
  scaleRootNote?: string;
  chordRootNote?: string | null;
  validNotes?: string[];
  onFretClick?: (string: number, fret: number) => void;
  activeFret?: [number, number] | null;
  onFingerSelect?: (finger: number) => void;
  mutedStrings?: Set<number>; // NEW: Prop for muted strings set
  onMuteToggle?: (stringId: number) => void; // NEW: Prop for mute toggle handler
}

const DEFAULT_STRINGS = 6;
const DEFAULT_FRETS = 24;

const Fretboard = ({ fretboardData, selectedVoicing, scaleRootNote, chordRootNote, validNotes, onFretClick, activeFret, onFingerSelect, mutedStrings, onMuteToggle }: FretboardProps) => {
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
        if (scaleRootNote) {
          if (note.is_in_scale) fretClasses.push('in-scale');
          if (note.note === scaleRootNote) fretClasses.push('scale-root');
          if (selectedVoicing) {
            if (finger !== undefined && finger >= 0) isChordNote = true;
          } else {
            if (note.is_in_chord) isChordNote = true;
          }
          if (isChordNote && note.note === chordRootNote) isChordRoot = true;
        } else if (validNotes) {
          if (validNotes.includes(note.note)) fretClasses.push('valid-note');
          if (finger !== undefined) isChordNote = true;
        }
      }
      
      const isActive = activeFret && activeFret[0] === stringId && activeFret[1] === fretIndex;

      fretsArray.push(
        <div key={`fret-${stringIndex}-${fretIndex}`} className={fretClasses.join(' ')} onClick={() => onFretClick && onFretClick(stringId, fretIndex)}>
          <div className="note-name">{note ? note.note : ''}</div>
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
      if (fret !== undefined) {
        if (fret >= 0) indicator = 'o';
        else if (fret === -1) indicator = 'x';
      }
      stringsArray.push(
        <div key={`string-row-${i}`} className="string-row">
          <div className="strum-indicator">{indicator}</div>
          {renderFrets(i)}
          {/* NEW: Mute toggle button for editor mode */}
          {onMuteToggle && (
            <div className="mute-toggle-container">
              <button 
                className={`mute-toggle ${mutedStrings?.has(stringId) ? 'muted' : ''}`}
                onClick={() => onMuteToggle(stringId)}
                title={mutedStrings?.has(stringId) ? "Unmute String" : "Mute String"}
              >
                X
              </button>
            </div>
          )}
        </div>
      );
    }
    return stringsArray;
  };

  return (
    <div className="fretboard-container"><div className="fretboard">{renderStrings()}</div></div>
  );
};

export default Fretboard;
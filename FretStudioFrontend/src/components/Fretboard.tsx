import type { FretboardAPIResponse, Voicing } from '../apiService';
import { formatNote } from '../utils/noteUtils';
import type { AccidentalType } from '../contexts/AccidentalTypeContext';
import './Fretboard.css';

interface FretboardProps {
  fretboardData: FretboardAPIResponse | null;
  isLeftHanded: boolean;
  accidentalType: AccidentalType;
  
  // For displaying voicings or highlighted notes
  selectedVoicing?: Voicing | null;
  validNotes?: string[];
  scaleRootNote?: string;
  chordRootNote?: string | null;
  disableHighlighting?: boolean;

  // For editing fingerings
  editableFingering?: [number, number, number][];
  onFingeringChange?: (newFingering: [number, number, number][]) => void;
  
  activeFret?: [number, number] | null;
  onFretClick?: (string: number, fret: number) => void;
  onFingerSelect?: (finger: number) => void;
  onStrumToggle?: (stringId: number) => void;
}

const Fretboard = ({
  fretboardData,
  isLeftHanded,
  accidentalType,
  selectedVoicing = null,
  validNotes = [],
  scaleRootNote,
  chordRootNote,
  disableHighlighting = false,
  editableFingering,
  onFingeringChange,
  activeFret,
  onFretClick,
  onFingerSelect,
  onStrumToggle,
}: FretboardProps) => {

  const handleLegacyFretClick = (string: number, fret: number) => {
    if (!onFingeringChange || !editableFingering) return;

    const existingIndex = editableFingering.findIndex(([s, f]) => s === string && f === fret);
    const newFingering = [...editableFingering];

    if (existingIndex > -1) {
      newFingering.splice(existingIndex, 1);
    } else {
      newFingering.push([string, fret, 0]);
    }
    onFingeringChange(newFingering);
  };

  const getDisplayFingering = () => {
    if (editableFingering) return editableFingering;
    if (selectedVoicing) return selectedVoicing.fingering;
    return [];
  };

  const displayFingering = getDisplayFingering();

  if (!fretboardData) {
    return <div className="fretboard-container loading">Loading Fretboard...</div>;
  }

  // Sort descending for conventional layout (string 6 at top)
  const stringNumbers = Object.keys(fretboardData).map(Number).sort((b, a) => b - a);
  const numFrets = fretboardData[stringNumbers[0]]?.length || 25;
  const fretNumbers = Array.from({ length: numFrets }, (_, i) => i);

  return (
    <div className={`fretboard-container ${isLeftHanded ? 'left-handed' : ''}`}>
      <div className="fretboard-layout">
        <div className="fretboard-body">
          <div className="strum-indicators">
            {stringNumbers.map(stringNum => {
              const fingeringInfo = displayFingering.find(([s]) => s === stringNum);
              let indicator = ' ';
              if (fingeringInfo) {
                const fret = fingeringInfo[1];
                if (fret === 0) indicator = 'O';
                else if (fret === -1) indicator = 'X';
              }
              return (
                <div 
                  key={stringNum} 
                  className={`strum-indicator ${onStrumToggle ? 'interactive' : ''}`}
                  onClick={() => onStrumToggle && onStrumToggle(stringNum)}
                >
                  {indicator}
                </div>
              );
            })}
          </div>
          <div className="fretboard">
            {stringNumbers.map(stringNum => (
              <div key={stringNum} className="string">
                {fretNumbers.map(fret => {
                  const noteInfo = fretboardData[stringNum]?.[fret];
                  if (!noteInfo) return null;

                  const highlightClasses = ['fret-highlight'];
                  if (!disableHighlighting) {
                    if (scaleRootNote) {
                      if (noteInfo.is_in_scale) {
                        highlightClasses.push(noteInfo.note === scaleRootNote ? 'scale-root-highlight' : 'in-scale-highlight');
                      }
                    } else {
                      if (validNotes.includes(noteInfo.note)) {
                        highlightClasses.push(noteInfo.note === chordRootNote ? 'scale-root-highlight' : 'in-scale-highlight');
                      }
                    }
                  }
                  
                  const isEditable = !!onFretClick;
                  const showAllTonesMode = !selectedVoicing && validNotes.length > 0 && !isEditable;
                  const fingeringInfo = displayFingering.find(([s, f]) => s === stringNum && f === fret);
                  
                  const isFrettedByVoicing = !!fingeringInfo;
                  const isFrettedByAllTones = showAllTonesMode && validNotes.includes(noteInfo.note);
                  const isFretted = isFrettedByVoicing || isFrettedByAllTones;

                  const noteMarkerClasses = ['note-marker'];
                  if (isFretted) {
                    noteMarkerClasses.push('fretted');
                    if (noteInfo.note === chordRootNote) {
                      noteMarkerClasses.push('chord-root');
                    }
                  }
                  
                  const finger = fingeringInfo ? fingeringInfo[2] : 0;
                  const isActive = activeFret && activeFret[0] === stringNum && activeFret[1] === fret;

                  return (
                    <div
                      key={fret}
                      className={`fret ${isEditable ? 'editable' : ''}`}
                      onClick={() => onFretClick ? onFretClick(stringNum, fret) : handleLegacyFretClick(stringNum, fret)}
                    >
                      <div className={highlightClasses.join(' ')}></div>
                      <span className="note-name">{formatNote(noteInfo.note, accidentalType)}</span>
                      {isFretted && !isActive && (
                        <div className={noteMarkerClasses.join(' ')}>
                          {finger > 0 && <span className="finger">{finger}</span>}
                        </div>
                      )}
                      {isActive && onFingerSelect && (
                        <div className="finger-selector">
                          {[0, 1, 2, 3, 4].map(f => <button key={f} onMouseDown={(e) => { e.stopPropagation(); onFingerSelect(f); }}>{f}</button>)}
                          <button className="remove" onMouseDown={(e) => { e.stopPropagation(); onFingerSelect(-1); }}>X</button>
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            ))}
          </div>
        </div>
        <div className="fret-numbers">
          {fretNumbers.map(fret => (
            <div key={fret} className="fret-number">{fret}</div>
          ))}
        </div>
      </div>
    </div>
  );
};

export default Fretboard;
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
  chordRootNote?: string | null; // Allow null

  // For editing fingerings
  editableFingering?: [number, number, number][];
  onFingeringChange?: (newFingering: [number, number, number][]) => void;
}

const Fretboard = ({
  fretboardData,
  isLeftHanded,
  accidentalType,
  selectedVoicing = null,
  validNotes = [],
  scaleRootNote,
  chordRootNote,
  editableFingering,
  onFingeringChange,
}: FretboardProps) => {

  const handleFretClick = (string: number, fret: number) => {
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

  const stringNumbers = Object.keys(fretboardData).map(Number).sort((a, b) => a - b);
  const numFrets = fretboardData[stringNumbers[0]]?.length || 25;
  const fretNumbers = Array.from({ length: numFrets }, (_, i) => i);

  return (
    <div className={`fretboard-container ${isLeftHanded ? 'left-handed' : ''}`}>
      <div className="fretboard-grid">
        <div className="fret-numbers">
          {fretNumbers.map(fret => (
            <div key={fret} className="fret-number">{fret}</div>
          ))}
        </div>
        <div className="fretboard">
          {stringNumbers.map(stringNum => (
            <div key={stringNum} className="string">
              {fretNumbers.map(fret => {
                const noteInfo = fretboardData[stringNum]?.[fret];
                if (!noteInfo) return null;

                // --- Highlighting Logic ---
                const highlightClasses = ['fret-highlight'];
                if (noteInfo.is_in_scale) {
                  highlightClasses.push(noteInfo.note === scaleRootNote ? 'scale-root-highlight' : 'in-scale-highlight');
                }
                
                // --- Fingering/Marker Logic ---
                const showAllTonesMode = !selectedVoicing && validNotes.length > 0;
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

                return (
                  <div
                    key={fret}
                    className={`fret ${onFingeringChange ? 'editable' : ''}`}
                    onClick={() => onFingeringChange && handleFretClick(stringNum, fret)}
                  >
                    <div className={highlightClasses.join(' ')}></div>
                    <span className="note-name">{formatNote(noteInfo.note, accidentalType)}</span>
                    {isFretted && (
                      <div className={noteMarkerClasses.join(' ')}>
                        {finger > 0 && <span className="finger">{finger}</span>}
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          ))}
        </div>
      </div>
      <div className="strum-indicators">
        {stringNumbers.map(stringNum => {
          const fingeringInfo = displayFingering.find(([s]) => s === stringNum);
          let indicator = ' ';
          if (fingeringInfo) {
            const fret = fingeringInfo[1];
            if (fret === 0) indicator = 'O';
            if (fret === -1) indicator = 'X';
          }
          return <div key={stringNum} className="strum-indicator">{indicator}</div>;
        })}
      </div>
    </div>
  );
};

export default Fretboard;
import type { FretboardAPIResponse, Voicing } from '../apiService';
import { formatNote, getNoteClass } from '../utils/noteUtils';
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
  chordRootNote?: string;

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
    if (!onFingeringChange || !editableFingering) return; // Not in edit mode

    const existingIndex = editableFingering.findIndex(([s, f]) => s === string && f === fret);

    const newFingering = [...editableFingering];
    if (existingIndex > -1) {
      // Note exists, remove it
      newFingering.splice(existingIndex, 1);
    } else {
      // Note doesn't exist, add it (with finger 0 as a placeholder for 'open' or 'not specified')
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
      <div className="fret-numbers">
        {fretNumbers.map(fret => (
          <div key={fret} className="fret-number">{fret}</div>
        ))}
      </div>
      <div className="fretboard">
        {stringNumbers.map(stringNum => (
          <div key={stringNum} className="string">
            {fretNumbers.map(fret => {
              const noteInfo = fretboardData[stringNum][fret];
              if (!noteInfo) return null;

              const fingeringInfo = displayFingering.find(([s, f]) => s === stringNum && f === fret);
              const isFretted = !!fingeringInfo;
              const finger = fingeringInfo ? fingeringInfo[2] : 0;

              const noteClass = getNoteClass(
                noteInfo.note,
                validNotes,
                scaleRootNote,
                chordRootNote
              );

              const isEditable = !!onFingeringChange;

              return (
                <div
                  key={fret}
                  className={`fret ${isEditable ? 'editable' : ''}`}
                  onClick={() => isEditable && handleFretClick(stringNum, fret)}
                >
                  <div className={`note ${noteClass} ${isFretted ? 'fretted' : ''}`}>
                    {formatNote(noteInfo.note, accidentalType)}
                    {isFretted && <span className="finger">{finger > 0 ? finger : 'X'}</span>}
                  </div>
                </div>
              );
            })}
          </div>
        ))}
      </div>
    </div>
  );
};

export default Fretboard;
import { useState, useEffect } from 'react';
import Fretboard from '../components/Fretboard';
import Selector from '../components/Selector';
import { 
  getChordTypes, 
  getVisualizedChordSimple,
  getChordNotesForEditor, // Import the function
  type FretboardAPIResponse,
  type Voicing,
  type ChordType
} from '../apiService';
import { useHandedness } from '../contexts/HandednessContext';
import { useAccidentalType } from '../contexts/AccidentalTypeContext';
import { getNoteNames, unformatNote } from '../utils/noteUtils';
import './ChordVisualizer.css';

const ChordVisualizer = () => {
  const { handedness } = useHandedness();
  const { accidentalType } = useAccidentalType();
  const noteOptions = getNoteNames(accidentalType);

  const [chordTypes, setChordTypes] = useState<ChordType[]>([]);
  const [fretboardData, setFretboardData] = useState<FretboardAPIResponse | null>(null);
  const [voicings, setVoicings] = useState<Voicing[]>([]);
  const [selectedVoicingIndex, setSelectedVoicingIndex] = useState<number>(-1);
  const [validNotes, setValidNotes] = useState<string[]>([]); // State for valid notes

  const [selectedRoot, setSelectedRoot] = useState<string>('C');
  const [selectedChordType, setSelectedChordType] = useState<string>('');

  useEffect(() => {
    async function fetchInitialData() {
      const types = await getChordTypes();
      setChordTypes(types);
      if (types.length > 0) {
        setSelectedChordType(types[0].name);
      }
    }
    fetchInitialData();
  }, []);

  useEffect(() => {
    async function fetchFretboard() {
      if (selectedRoot && selectedChordType) {
        const rootForAPI = unformatNote(selectedRoot);
        
        // Fetch both visualization and the list of valid notes
        const [data, notes] = await Promise.all([
          getVisualizedChordSimple(rootForAPI, selectedChordType),
          getChordNotesForEditor(rootForAPI, selectedChordType)
        ]);
        
        setValidNotes(notes);

        if (data) {
          setFretboardData(data.fretboard);
          setVoicings(data.voicings);
          setSelectedVoicingIndex(-1);
        } else {
          setFretboardData(null);
          setVoicings([]);
        }
      }
    }
    fetchFretboard();
  }, [selectedRoot, selectedChordType]);

  const handleNextVoicing = () => setSelectedVoicingIndex(prev => (prev + 1) % voicings.length);
  const handlePrevVoicing = () => setSelectedVoicingIndex(prev => (prev - 1 + voicings.length) % voicings.length);

  const currentVoicing = selectedVoicingIndex > -1 ? voicings[selectedVoicingIndex] : null;

  return (
    <div className="chord-visualizer-page">
      <div className="card">
        <h2>Chord Controls</h2>
        <div className="controls-grid">
          <Selector 
            label="Chord Type" 
            value={selectedChordType} 
            options={chordTypes.map(t => t.name)} 
            onChange={setSelectedChordType} 
          />
        </div>
        <div className="note-button-group">
          {noteOptions.map(note => (
            <button 
              key={note} 
              className={`note-button ${selectedRoot === note ? 'active' : ''}`}
              onClick={() => setSelectedRoot(note)}
            >
              {note}
            </button>
          ))}
        </div>
        {voicings.length > 0 && (
          <div className="voicing-controls">
            <button onClick={() => setSelectedVoicingIndex(-1)}>Show All Tones</button>
            <button onClick={handlePrevVoicing} disabled={voicings.length < 2}>Prev Voicing</button>
            <button onClick={handleNextVoicing} disabled={voicings.length < 2}>Next Voicing</button>
            <span>
              {currentVoicing?.name || 'All Tones'}
              {currentVoicing?.difficulty && ` (${currentVoicing.difficulty})`}
            </span>
          </div>
        )}
      </div>
      <div className="card">
        <h2>Fretboard Visualization</h2>
        <Fretboard 
          fretboardData={fretboardData} 
          selectedVoicing={currentVoicing}
          validNotes={validNotes} // Pass the valid notes for highlighting
          chordRootNote={unformatNote(selectedRoot)}
          isLeftHanded={handedness === 'left'}
          accidentalType={accidentalType}
        />
      </div>
    </div>
  );
};

export default ChordVisualizer; 
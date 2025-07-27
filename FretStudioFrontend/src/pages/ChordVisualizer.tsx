import { useState, useEffect } from 'react';
import Fretboard from '../components/Fretboard';
import Selector from '../components/Selector';
import { 
  getChordTypes, 
  getVoicingsForChord,
  getVisualizedScale,
  getChordNotesForEditor,
  type FretboardAPIResponse,
  type Voicing,
  type ChordType
} from '../apiService';
import { useHandedness } from '../contexts/HandednessContext';
import { useAccidentalType } from '../contexts/AccidentalTypeContext';
import { useTuning } from '../contexts/TuningContext'; // Import the new hook
import { getNoteNames, unformatNote } from '../utils/noteUtils';
import './ChordVisualizer.css';

const ChordVisualizer = () => {
  const { handedness } = useHandedness();
  const { accidentalType } = useAccidentalType();
  const { selectedTuning } = useTuning(); // Use the global tuning
  const noteOptions = getNoteNames(accidentalType);

  const [chordTypes, setChordTypes] = useState<ChordType[]>([]);
  const [fretboardData, setFretboardData] = useState<FretboardAPIResponse | null>(null);
  const [voicings, setVoicings] = useState<Voicing[]>([]);
  const [selectedVoicingIndex, setSelectedVoicingIndex] = useState<number>(-1);
  const [validNotes, setValidNotes] = useState<string[]>([]);

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
    async function fetchChordDetails() {
      if (selectedRoot && selectedChordType && selectedTuning) {
        const rootForAPI = unformatNote(selectedRoot);
        
        const [fetchedVoicings, notes, fretboard] = await Promise.all([
          getVoicingsForChord(selectedChordType, rootForAPI),
          getChordNotesForEditor(rootForAPI, selectedChordType),
          getVisualizedScale(selectedTuning, rootForAPI, 'Major') // Use a base scale for the fretboard notes
        ]);
        
        setVoicings(fetchedVoicings);
        setValidNotes(notes);
        setFretboardData(fretboard);
        setSelectedVoicingIndex(-1); // Reset to "All Tones"
      }
    }
    fetchChordDetails();
  }, [selectedRoot, selectedChordType, selectedTuning]);

  const handleNextVoicing = () => {
    setSelectedVoicingIndex(prev => {
      const nextIndex = prev + 1;
      return nextIndex >= voicings.length ? 0 : nextIndex;
    });
  };

  const handlePrevVoicing = () => {
    setSelectedVoicingIndex(prev => {
      const prevIndex = prev - 1;
      return prevIndex < 0 ? voicings.length - 1 : prevIndex;
    });
  };

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
            <button onClick={handlePrevVoicing} disabled={voicings.length === 0}>Prev Voicing</button>
            <button onClick={handleNextVoicing} disabled={voicings.length === 0}>Next Voicing</button>
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
          validNotes={validNotes}
          chordRootNote={unformatNote(selectedRoot)}
          isLeftHanded={handedness === 'left'}
          accidentalType={accidentalType}
        />
      </div>
    </div>
  );
};

export default ChordVisualizer;
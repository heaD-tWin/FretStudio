import { useState, useEffect } from 'react';
import Fretboard from '../components/Fretboard';
import Selector from '../components/Selector';
import {
  getChordTypes,
  getVoicingsForChord,
  getChordNotesForEditor,
  getVisualizedChord, // Import the new function
  type ChordType,
  type Voicing,
  type FretboardAPIResponse,
} from '../apiService';
import { useHandedness } from '../contexts/HandednessContext';
import { useAccidentalType } from '../contexts/AccidentalTypeContext';
import { useTuning } from '../contexts/TuningContext';
import { getNoteNames, unformatNote } from '../utils/noteUtils';
import './ChordVisualizer.css';

const ChordVisualizer = () => {
  const { handedness } = useHandedness();
  const { accidentalType } = useAccidentalType();
  const { selectedTuning } = useTuning();
  const noteOptions = getNoteNames(accidentalType);

  const [chordTypes, setChordTypes] = useState<ChordType[]>([]);
  const [selectedChordType, setSelectedChordType] = useState('');
  const [selectedRoot, setSelectedRoot] = useState('C');

  const [voicings, setVoicings] = useState<Voicing[]>([]);
  const [selectedVoicingIndex, setSelectedVoicingIndex] = useState(-1);
  
  const [fretboardData, setFretboardData] = useState<FretboardAPIResponse | null>(null);
  const [validNotes, setValidNotes] = useState<string[]>([]);

  // Fetch initial list of chord types
  useEffect(() => {
    async function fetchChordTypes() {
      const types = await getChordTypes();
      setChordTypes(types);
      if (types.length > 0) {
        setSelectedChordType(types[0].name);
      }
    }
    fetchChordTypes();
  }, []);

  // Fetch voicings, notes, and fretboard layout when chord selection changes
  useEffect(() => {
    async function fetchChordData() {
      if (selectedChordType && selectedRoot && selectedTuning) {
        const rootForAPI = unformatNote(selectedRoot);
        
        // Fetch all data in parallel
        const [fetchedVoicings, notes, fretboardLayout] = await Promise.all([
          getVoicingsForChord(selectedTuning, selectedChordType, rootForAPI),
          getChordNotesForEditor(rootForAPI, selectedChordType),
          getVisualizedChord(selectedTuning, rootForAPI, selectedChordType) // Use the new function here
        ]);

        setVoicings(fetchedVoicings || []);
        setValidNotes(notes || []);
        setFretboardData(fretboardLayout); // Set the new fretboard data
        setSelectedVoicingIndex(-1); // Reset voicing selection
      }
    }
    fetchChordData();
  }, [selectedChordType, selectedRoot, selectedTuning]);

  const handleNextVoicing = () => {
    setSelectedVoicingIndex(prev => (prev + 1) % voicings.length);
  };

  const handlePrevVoicing = () => {
    setSelectedVoicingIndex(prev => (prev - 1 + voicings.length) % voicings.length);
  };

  const currentVoicing = selectedVoicingIndex > -1 ? voicings[selectedVoicingIndex] : null;

  return (
    <div className="chord-visualizer-page">
      <Fretboard
        fretboardData={fretboardData}
        selectedVoicing={currentVoicing}
        validNotes={validNotes}
        chordRootNote={unformatNote(selectedRoot)}
        isLeftHanded={handedness === 'left'}
        accidentalType={accidentalType}
      />
      <div className="card">
        <h1>Fretboard Controls</h1>
        <div className="controls-grid">
          <Selector label="Chord Type" value={selectedChordType} options={chordTypes.map(t => t.name)} onChange={setSelectedChordType} />
          <Selector label="Root Note" value={selectedRoot} options={noteOptions} onChange={setSelectedRoot} />
        </div>
        {voicings.length > 0 && (
          <div className="voicing-controls">
            <button onClick={() => setSelectedVoicingIndex(-1)}>Show All Tones</button>
            <button onClick={handlePrevVoicing}>Prev Voicing</button>
            <button onClick={handleNextVoicing}>Next Voicing</button>
            <span>
              {currentVoicing?.name || 'All Tones'}
              {currentVoicing?.difficulty && ` (${currentVoicing.difficulty})`}
            </span>
          </div>
        )}
      </div>
    </div>
  );
};

export default ChordVisualizer;
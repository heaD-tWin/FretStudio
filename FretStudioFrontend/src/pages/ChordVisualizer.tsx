import { useState, useEffect } from 'react';
import Fretboard from '../components/Fretboard';
import Selector from '../components/Selector';
import {
  getChordTypes,
  getVoicingsForChord,
  getChordNotesForEditor,
  getVisualizedScale,
  type ChordType,
  type Voicing,
  type FretboardAPIResponse,
} from '../apiService';
import { useHandedness } from '../contexts/HandednessContext';
import { useAccidentalType } from '../contexts/AccidentalTypeContext';
import { useTuning } from '../contexts/TuningContext';
import { getNoteNames, unformatNote } from '../utils/noteUtils';
import './ChordVisualizer.css';

const ALL_TONES_OPTION = "Show All Tones";

const ChordVisualizer = () => {
  const { handedness } = useHandedness();
  const { accidentalType } = useAccidentalType();
  const { selectedTuning } = useTuning();
  const noteOptions = getNoteNames(accidentalType);

  const [chordTypes, setChordTypes] = useState<ChordType[]>([]);
  const [selectedChordType, setSelectedChordType] = useState('');
  const [selectedRoot, setSelectedRoot] = useState('C');
  
  const [voicings, setVoicings] = useState<Voicing[]>([]);
  const [selectedVoicing, setSelectedVoicing] = useState<Voicing | null>(null);
  
  const [fretboardData, setFretboardData] = useState<FretboardAPIResponse | null>(null);
  const [validNotes, setValidNotes] = useState<string[]>([]);

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
    async function fetchChordData() {
      if (selectedChordType && selectedRoot && selectedTuning) {
        const rootForAPI = unformatNote(selectedRoot);
        const [fetchedVoicings, notes, fretboardLayout] = await Promise.all([
          getVoicingsForChord(selectedTuning, selectedChordType, rootForAPI),
          getChordNotesForEditor(rootForAPI, selectedChordType),
          getVisualizedScale(selectedTuning, rootForAPI, 'Major')
        ]);
        setVoicings(fetchedVoicings || []);
        setValidNotes(notes || []);
        setFretboardData(fretboardLayout);
        setSelectedVoicing(null); // Default to "Show All Tones"
      }
    }
    fetchChordData();
  }, [selectedChordType, selectedRoot, selectedTuning]);

  const handleNextVoicing = () => {
    if (voicings.length === 0) return;
    const currentIndex = selectedVoicing ? voicings.indexOf(selectedVoicing) : -1;
    const nextIndex = (currentIndex + 1) % voicings.length;
    setSelectedVoicing(voicings[nextIndex]);
  };

  const handlePrevVoicing = () => {
    if (voicings.length === 0) return;
    const currentIndex = selectedVoicing ? voicings.indexOf(selectedVoicing) : -1;
    const prevIndex = currentIndex === -1 ? voicings.length - 1 : (currentIndex - 1 + voicings.length) % voicings.length;
    setSelectedVoicing(voicings[prevIndex]);
  };

  const getVoicingDisplayName = () => {
    if (!selectedVoicing) return ALL_TONES_OPTION;
    let name = selectedVoicing.name;
    if (selectedVoicing.difficulty) {
      name += ` (${selectedVoicing.difficulty})`;
    }
    return name;
  };

  return (
    <div className="visualizer-page chord-visualizer-page">
      <h1>Chord Visualizer</h1>
      <div className="card">
        <h2>Fretboard Controls</h2>
        <div className="controls-grid">
          <Selector label="Chord Type" value={selectedChordType} options={chordTypes.map(t => t.name)} onChange={setSelectedChordType} />
          <Selector label="Root Note" value={selectedRoot} options={noteOptions} onChange={setSelectedRoot} />
        </div>
        <div className="voicing-controls">
          <button onClick={() => setSelectedVoicing(null)}>Show All Tones</button>
          <button onClick={handlePrevVoicing} disabled={voicings.length === 0}>Prev Voicing</button>
          <button onClick={handleNextVoicing} disabled={voicings.length === 0}>Next Voicing</button>
          <span>{getVoicingDisplayName()}</span>
        </div>
      </div>
      <div className="card">
        <h2>Fretboard Visualization</h2>
        <Fretboard
          fretboardData={fretboardData}
          validNotes={validNotes}
          chordRootNote={unformatNote(selectedRoot)}
          selectedVoicing={selectedVoicing}
          isLeftHanded={handedness === 'left'}
          accidentalType={accidentalType}
        />
      </div>
    </div>
  );
};

export default ChordVisualizer;
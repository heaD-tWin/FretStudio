import { useState, useEffect } from 'react';
import { Routes, Route, Link } from 'react-router-dom';
import './App.css';
import { 
  getScales, 
  getTunings, 
  getVisualizedScale, 
  getChordsInScale,
  getVisualizedChord,
  type FretboardAPIResponse,
  type Voicing,
  type Scale
} from './apiService';
import Selector from './components/Selector';
import Fretboard from './components/Fretboard';
import ChordEditor from './pages/ChordEditor';
import ScaleEditor from './pages/ScaleEditor';
import ChordVisualizer from './pages/ChordVisualizer';
import { useHandedness } from './contexts/HandednessContext';
import { useAccidentalType } from './contexts/AccidentalTypeContext';
import { getNoteNames, unformatNote } from './utils/noteUtils';

const FULL_SCALE_OPTION = 'Show Full Scale';

const MainPage = () => {
  const { handedness } = useHandedness();
  const { accidentalType } = useAccidentalType();
  const noteOptions = getNoteNames(accidentalType);

  const [scales, setScales] = useState<Scale[]>([]);
  const [tunings, setTunings] = useState<string[]>([]);
  const [chords, setChords] = useState<string[]>([]);
  const [fretboardData, setFretboardData] = useState<FretboardAPIResponse | null>(null);
  
  const [voicings, setVoicings] = useState<Voicing[]>([]);
  const [selectedVoicingIndex, setSelectedVoicingIndex] = useState<number>(-1);

  const [selectedRoot, setSelectedRoot] = useState<string>('C');
  const [selectedScale, setSelectedScale] = useState<string>('');
  const [selectedTuning, setSelectedTuning] = useState<string>('');
  const [selectedChord, setSelectedChord] = useState<string>('');

  const chordRootNote = selectedChord ? selectedChord.split(' ')[0] : null;

  // Fetch initial data for all dropdowns
  useEffect(() => {
    async function fetchInitialData() {
      const scaleData = await getScales();
      const tuningNames = await getTunings();
      setScales(scaleData);
      setTunings(tuningNames);
      if (scaleData.length > 0) setSelectedScale(scaleData[0].name);
      if (tuningNames.length > 0) setSelectedTuning(tuningNames[0]);
    }
    fetchInitialData();
  }, []);

  // Fetch diatonic chords whenever the root or scale changes
  useEffect(() => {
    async function fetchDiatonicChords() {
      if (selectedRoot && selectedScale) {
        const diatonicChords = await getChordsInScale(selectedRoot, selectedScale);
        setChords(diatonicChords);
        // If the currently selected chord is not in the new list, reset it
        if (selectedChord && !diatonicChords.includes(selectedChord)) {
          setSelectedChord('');
        }
      }
    }
    fetchDiatonicChords();
  }, [selectedRoot, selectedScale]);

  // Fetch fretboard data based on user selection
  useEffect(() => {
    async function fetchFretboard() {
      if (selectedChord && selectedTuning && selectedRoot && selectedScale) {
        const [rootNote, ...typeParts] = selectedChord.split(' ');
        const chordTypeName = typeParts.join(' ');
        const unformattedRoot = unformatNote(rootNote);

        const data = await getVisualizedChord(chordTypeName, unformattedRoot, selectedRoot, selectedScale);
        if (data) {
          setFretboardData(data.fretboard);
          setVoicings(data.voicings);
          setSelectedVoicingIndex(-1);
        }
      } else if (selectedTuning && selectedRoot && selectedScale) {
        const data = await getVisualizedScale(selectedTuning, selectedRoot, selectedScale);
        setFretboardData(data);
        setVoicings([]);
        setSelectedVoicingIndex(-1);
      }
    }
    fetchFretboard();
  }, [selectedRoot, selectedScale, selectedTuning, selectedChord]);

  const handleNextVoicing = () => setSelectedVoicingIndex(prev => (prev + 1) % voicings.length);
  const handlePrevVoicing = () => setSelectedVoicingIndex(prev => (prev - 1 + voicings.length) % voicings.length);

  const currentVoicing = selectedVoicingIndex > -1 ? voicings[selectedVoicingIndex] : null;

  return (
    <>
      <div className="card">
        <h2>Fretboard Controls</h2>
        <div className="controls-grid">
          <Selector label="Root Note" value={selectedRoot} options={noteOptions} onChange={setSelectedRoot} />
          <Selector label="Scale" value={selectedScale} options={scales.map(s => s.name)} onChange={setSelectedScale} />
          <Selector label="Tuning" value={selectedTuning} options={tunings} onChange={setSelectedTuning} />
          <Selector label="Chord" value={selectedChord || FULL_SCALE_OPTION} options={[FULL_SCALE_OPTION, ...chords]} onChange={(value) => setSelectedChord(value === FULL_SCALE_OPTION ? '' : value)} />
        </div>
        {selectedChord && voicings.length > 0 && (
          <div className="voicing-controls">
            <button onClick={() => setSelectedVoicingIndex(-1)}>Show All Tones</button>
            <button onClick={handlePrevVoicing}>Prev Voicing</button>
            <button onClick={handleNextVoicing}>Next Voicing</button>
            <span>
              {currentVoicing?.name || (selectedVoicingIndex === -1 ? 'All Tones' : `Voicing ${selectedVoicingIndex + 1}`)}
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
          scaleRootNote={selectedRoot}
          chordRootNote={chordRootNote}
          isLeftHanded={handedness === 'left'}
          accidentalType={accidentalType}
        />
      </div>
    </>
  );
};

function App() {
  const { handedness, toggleHandedness } = useHandedness();
  const { accidentalType, toggleAccidentalType } = useAccidentalType();

  return (
    <>
      <nav className="main-nav">
        <Link to="/">Scale Visualizer</Link>
        <Link to="/visualizer/chords">Chord Visualizer</Link>
        <Link to="/editor/chords">Chord Editor</Link>
        <Link to="/editor/scales">Scale Editor</Link>
        <div className="nav-actions">
          <button onClick={toggleAccidentalType} className="nav-button">
            Use {accidentalType === 'sharps' ? 'Flats (b)' : 'Sharps (#)'}
          </button>
          <button onClick={toggleHandedness} className="nav-button">
            {handedness === 'left' ? 'Left-Handed' : 'Right-Handed'} View
          </button>
        </div>
      </nav>
      <Routes>
        <Route path="/" element={<MainPage />} />
        <Route path="/visualizer/chords" element={<ChordVisualizer />} />
        <Route path="/editor/chords" element={<ChordEditor />} />
        <Route path="/editor/scales" element={<ScaleEditor />} />
      </Routes>
    </>
  )
}

export default App;

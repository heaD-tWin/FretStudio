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
  type Voicing
} from './apiService';
import Selector from './components/Selector';
import Fretboard from './components/Fretboard';
import ChordEditor from './pages/ChordEditor'; // Import the new page

const NOTES = ["C", "C#", "D", "D#", "E", "F", "F#", "G", "G#", "A", "A#", "B"];
const FULL_SCALE_OPTION = 'Show Full Scale';

// Create a component for the main page content
const MainPage = () => {
  const [scales, setScales] = useState<string[]>([]);
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

  useEffect(() => {
    async function fetchInitialData() {
      const scaleNames = await getScales();
      const tuningNames = await getTunings();
      setScales(scaleNames);
      setTunings(tuningNames);
      if (scaleNames.length > 0) setSelectedScale(scaleNames[0]);
      if (tuningNames.length > 0) setSelectedTuning(tuningNames[0]);
    }
    fetchInitialData();
  }, []);

  useEffect(() => {
    async function fetchChords() {
      if (selectedRoot && selectedScale) {
        const chordNames = await getChordsInScale(selectedRoot, selectedScale);
        setChords(chordNames);
        setSelectedChord('');
      }
    }
    fetchChords();
  }, [selectedRoot, selectedScale]);

  useEffect(() => {
    async function fetchFretboard() {
      if (selectedChord && selectedTuning && selectedRoot && selectedScale) {
        const data = await getVisualizedChord(selectedTuning, selectedChord, selectedRoot, selectedScale);
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
          <Selector label="Root Note" value={selectedRoot} options={NOTES} onChange={setSelectedRoot} />
          <Selector label="Scale" value={selectedScale} options={scales} onChange={setSelectedScale} />
          <Selector label="Tuning" value={selectedTuning} options={tunings} onChange={setSelectedTuning} />
          <Selector
            label="Chord"
            value={selectedChord || FULL_SCALE_OPTION}
            options={[FULL_SCALE_OPTION, ...chords]}
            onChange={(value) => setSelectedChord(value === FULL_SCALE_OPTION ? '' : value)}
          />
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
        />
      </div>
    </>
  );
};

function App() {
  return (
    <>
      <nav className="main-nav">
        <Link to="/">Visualizer</Link>
        <Link to="/editor">Chord Editor</Link>
      </nav>
      <h1>FretStudio</h1>
      <Routes>
        <Route path="/" element={<MainPage />} />
        <Route path="/editor" element={<ChordEditor />} />
      </Routes>
    </>
  )
}

export default App

import { useState, useEffect } from 'react';
import './App.css';
import { 
  getScales, 
  getTunings, 
  getVisualizedScale, 
  getChordsInScale, 
  getVisualizedChord,
  type FretboardAPIResponse 
} from './apiService';
import Selector from './components/Selector';
import Fretboard from './components/Fretboard';

const NOTES = ["C", "C#", "D", "D#", "E", "F", "F#", "G", "G#", "A", "A#", "B"];
const FULL_SCALE_OPTION = 'Show Full Scale';

function App() {
  const [scales, setScales] = useState<string[]>([]);
  const [tunings, setTunings] = useState<string[]>([]);
  const [chords, setChords] = useState<string[]>([]);
  const [fretboardData, setFretboardData] = useState<FretboardAPIResponse | null>(null);

  const [selectedRoot, setSelectedRoot] = useState<string>('C');
  const [selectedScale, setSelectedScale] = useState<string>('');
  const [selectedTuning, setSelectedTuning] = useState<string>('');
  const [selectedChord, setSelectedChord] = useState<string>('');

  // Fetch initial data for dropdowns
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

  // Fetch available chords whenever the root or scale changes
  useEffect(() => {
    async function fetchChords() {
      if (selectedRoot && selectedScale) {
        const chordNames = await getChordsInScale(selectedRoot, selectedScale);
        setChords(chordNames);
        setSelectedChord(''); // Reset chord selection when scale changes
      }
    }
    fetchChords();
  }, [selectedRoot, selectedScale]);

  // Fetch fretboard data based on user selection
  useEffect(() => {
    async function fetchFretboard() {
      // If a chord is selected, visualize the chord. Otherwise, visualize the scale.
      if (selectedChord && selectedTuning) {
        const data = await getVisualizedChord(selectedTuning, selectedChord);
        setFretboardData(data);
      } else if (selectedTuning && selectedRoot && selectedScale) {
        const data = await getVisualizedScale(selectedTuning, selectedRoot, selectedScale);
        setFretboardData(data);
      }
    }
    fetchFretboard();
  }, [selectedRoot, selectedScale, selectedTuning, selectedChord]);

  return (
    <>
      <h1>FretStudio</h1>
      
      <div className="card">
        <h2>Fretboard Controls</h2>
        <div className="controls-grid">
          <Selector 
            label="Root Note"
            value={selectedRoot}
            options={NOTES}
            onChange={setSelectedRoot}
          />
          <Selector 
            label="Scale"
            value={selectedScale}
            options={scales}
            onChange={setSelectedScale}
          />
          <Selector 
            label="Tuning"
            value={selectedTuning}
            options={tunings}
            onChange={setSelectedTuning}
          />
          <Selector
            label="Chord"
            value={selectedChord || FULL_SCALE_OPTION}
            options={[FULL_SCALE_OPTION, ...chords]}
            onChange={(value) => {
              if (value === FULL_SCALE_OPTION) {
                setSelectedChord('');
              } else {
                setSelectedChord(value);
              }
            }}
          />
        </div>
      </div>

      <div className="card">
        <h2>Fretboard Visualization</h2>
        <Fretboard fretboardData={fretboardData} />
      </div>
    </>
  )
}

export default App

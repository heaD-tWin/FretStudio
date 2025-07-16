import { useState, useEffect } from 'react';
import './App.css';
import { getScales, getTunings, getVisualizedScale, type FretboardAPIResponse } from './apiService';
import Selector from './components/Selector';
import Fretboard from './components/Fretboard'; // Import the new Fretboard component

const NOTES = ["C", "C#", "D", "D#", "E", "F", "F#", "G", "G#", "A", "A#", "B"];

function App() {
  const [scales, setScales] = useState<string[]>([]);
  const [tunings, setTunings] = useState<string[]>([]);
  const [fretboardData, setFretboardData] = useState<FretboardAPIResponse | null>(null); // State for the fretboard data

  const [selectedRoot, setSelectedRoot] = useState<string>('C');
  const [selectedScale, setSelectedScale] = useState<string>('');
  const [selectedTuning, setSelectedTuning] = useState<string>('');

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

  // Fetch fretboard data whenever a selection changes
  useEffect(() => {
    async function fetchFretboard() {
      if (selectedTuning && selectedRoot && selectedScale) {
        const data = await getVisualizedScale(selectedTuning, selectedRoot, selectedScale);
        console.log('Fretboard Data:', data); // Add this line
        setFretboardData(data);
      }
    }
    fetchFretboard();
  }, [selectedRoot, selectedScale, selectedTuning]); // Dependency array

  // Transform fretboardData to highlightedFrets format
  const highlightedFrets = fretboardData
    ? Object.entries(fretboardData)
        .flatMap(([stringNum, frets]) =>
          (Array.isArray(frets) ? frets : []).map((fretNote, fretNum) =>
            fretNote.is_in_scale // Use the 'is_in_scale' property to check for highlighting
              ? { string: Number(stringNum) - 1, fret: fretNum }
              : null
          )
        )
        .filter((v): v is { string: number; fret: number } => v !== null)
    : [];

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
        </div>
      </div>

      <div className="card">
        <h2>Fretboard Visualization</h2>
        <Fretboard highlightedFrets={highlightedFrets} />
      </div>
    </>
  )
}

export default App

import React, { useState, useEffect } from 'react';
import Fretboard from '../components/Fretboard';
import './ChordEditor.css';
import { getVisualizedScale, getTunings } from '../apiService';
import type { FretboardAPIResponse } from '../apiService';

const defaultChord = {
  name: '',
  notes: [],
};

const ChordEditor = () => {
  const [chord, setChord] = useState(defaultChord);
  const [fretboardData, setFretboardData] = useState<FretboardAPIResponse | null>(null);
  const [tunings, setTunings] = useState<string[]>([]);
  const [selectedTuning, setSelectedTuning] = useState<string>('');

  // Fetch a base fretboard layout when the component mounts
  useEffect(() => {
    async function initializeEditor() {
      const tuningNames = await getTunings();
      if (tuningNames.length > 0) {
        setTunings(tuningNames);
        const defaultTuning = tuningNames[0];
        setSelectedTuning(defaultTuning);

        // Fetch a "blank" fretboard with just the note names
        const baseFretboard = await getVisualizedScale(defaultTuning, "C", "Major");
        setFretboardData(baseFretboard);
      }
    }
    initializeEditor();
  }, []);

  const handleNameChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setChord({ ...chord, name: e.target.value });
  };

  const handleNotesChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const notes = e.target.value.split(',').map(note => note.trim());
    setChord({ ...chord, notes });
  };

  const handleSave = () => {
    // TODO: Implement save logic (e.g., API call)
    alert(`Chord saved: ${chord.name} (${chord.notes.join(', ')})`);
  };

  const handleFretClick = (string: number, fret: number) => {
    console.log(`Clicked string ${string}, fret ${fret}`);
    // Logic to add/remove notes will go here
  };

  return (
    <div className="chord-editor-page">
      {/* This h1 is now consistent with the main page's title */}
      <h1>Chord Voicing Editor</h1>

      {/* CORRECTED: The Voicing Details card is now first */}
      <div className="card">
        <h2>Voicing Details</h2>
        <div className="controls-grid">
          <div className="form-group">
            <label>Voicing Name</label>
            <input type="text" value={chord.name} onChange={handleNameChange} placeholder="e.g. Cmaj7" />
          </div>
          <div className="form-group">
            <label>Difficulty</label>
            <input type="text" />
          </div>
          <div className="form-group">
            <label>Notes (comma separated)</label>
            <input type="text" value={chord.notes.join(', ')} onChange={handleNotesChange} placeholder="e.g. C, E, G, B" />
          </div>
        </div>
        <div className="editor-actions">
          <button onClick={handleSave}>Save Voicing</button>
        </div>
      </div>

      <div className="card">
        <h2>Interactive Fretboard</h2>
        <Fretboard 
          fretboardData={fretboardData}
          selectedVoicing={null}
          scaleRootNote={""}
          chordRootNote={null}
          onFretClick={handleFretClick}
        />
      </div>
    </div>
  );
};

export default ChordEditor;
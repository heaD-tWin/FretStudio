import { useState, useEffect } from 'react';
import Fretboard from '../components/Fretboard';
import Selector from '../components/Selector';
import './ChordEditor.css';
import { getVisualizedScale, getTunings, getChordTypes, addChordType, getChordNotesForEditor, addVoicingToChord } from '../apiService';
import type { FretboardAPIResponse, Voicing } from '../apiService';

const NOTES = ["C", "C#", "D", "D#", "E", "F", "F#", "G", "G#", "A", "A#", "B"];
const DIFFICULTIES = ["Beginner", "Intermediate", "Advanced"];
type FrettedNote = [number, number, number]; // [string, fret, finger]

const ChordEditor = () => {
  const [fretboardData, setFretboardData] = useState<FretboardAPIResponse | null>(null);
  
  const [chordTypes, setChordTypes] = useState<string[]>([]);
  const [selectedRootNote, setSelectedRootNote] = useState<string>(NOTES[0]);
  const [selectedChordType, setSelectedChordType] = useState<string>('');
  const [voicingName, setVoicingName] = useState('');
  const [difficulty, setDifficulty] = useState<string>(DIFFICULTIES[0]);
  
  const [newTypeName, setNewTypeName] = useState('');
  const [newTypeIntervals, setNewTypeIntervals] = useState('');

  const [validNotes, setValidNotes] = useState<string[]>([]);
  const [fingering, setFingering] = useState<FrettedNote[]>([]);
  const [activeFret, setActiveFret] = useState<[number, number] | null>(null);
  const [mutedStrings, setMutedStrings] = useState<Set<number>>(new Set()); // NEW: State for muted strings

  useEffect(() => {
    async function initializeEditor() {
      const tunings = await getTunings();
      if (tunings.length > 0) {
        const baseFretboard = await getVisualizedScale(tunings[0], "C", "Major");
        setFretboardData(baseFretboard);
      }
      const types = await getChordTypes();
      setChordTypes(types);
      if (types.length > 0) setSelectedChordType(types[0]);
    }
    initializeEditor();
  }, []);

  useEffect(() => {
    async function fetchValidNotes() {
      if (selectedRootNote && selectedChordType) {
        const notes = await getChordNotesForEditor(selectedRootNote, selectedChordType);
        setValidNotes(notes);
        setFingering([]);
        setMutedStrings(new Set()); // Reset mutes when chord changes
      }
    }
    fetchValidNotes();
  }, [selectedRootNote, selectedChordType]);

  const handleAddChordType = async () => {
    if (!newTypeName || !newTypeIntervals) return alert("Please provide a name and intervals.");
    const intervals = newTypeIntervals.split(',').map(n => parseInt(n.trim()));
    if (intervals.some(isNaN)) return alert("Intervals must be comma-separated numbers.");
    const success = await addChordType({ name: newTypeName, intervals });
    if (success) {
      setChordTypes([...chordTypes, newTypeName]);
      setNewTypeName('');
      setNewTypeIntervals('');
      alert("Chord type added!");
    } else {
      alert("Failed to add chord type.");
    }
  };

  const handleFretClick = (string: number, fret: number) => {
    const note = fretboardData?.[string.toString()]?.[fret]?.note;
    if (!note || !validNotes.includes(note)) return;
    if (mutedStrings.has(string)) return; // Cannot select a fret on a muted string
    setActiveFret(activeFret && activeFret[0] === string && activeFret[1] === fret ? null : [string, fret]);
  };

  const handleFingerSelect = (finger: number) => {
    if (!activeFret) return;
    const [string, fret] = activeFret;
    let newFingering = fingering.filter(f => f[0] !== string);
    if (finger > 0) newFingering.push([string, fret, finger]);
    setFingering(newFingering);
    setActiveFret(null);
  };

  // NEW: Handler for the mute toggle
  const handleMuteToggle = (stringId: number) => {
    setMutedStrings(prevMuted => {
      const newMuted = new Set(prevMuted);
      if (newMuted.has(stringId)) {
        newMuted.delete(stringId);
      } else {
        newMuted.add(stringId);
        // When muting, remove any selected finger on that string
        setFingering(fingering.filter(f => f[0] !== stringId));
      }
      return newMuted;
    });
  };

  const handleSaveVoicing = async () => {
    const fullChordName = `${selectedRootNote} ${selectedChordType}`;
    if (!voicingName) return alert("Please provide a voicing name.");
    
    // Combine fretted notes and muted strings into the final fingering array
    const finalFingering = [...fingering];
    mutedStrings.forEach(stringId => {
      finalFingering.push([stringId, -1, 0]);
    });

    if (finalFingering.length === 0) return alert("Please define the chord by selecting frets or muting strings.");

    const newVoicing: Voicing = { name: voicingName, difficulty, fingering: finalFingering };
    const success = await addVoicingToChord(fullChordName, newVoicing);
    if (success) {
      alert("Voicing saved successfully!");
      setVoicingName('');
      setFingering([]);
      setMutedStrings(new Set());
    } else {
      alert("Failed to save voicing.");
    }
  };

  const currentVoicing: Voicing | null = fingering.length > 0 ? { name: '', difficulty: '', fingering } : null;

  return (
    <div className="chord-editor-page">
      <h1>Chord Editor</h1>
      <div className="card">
        <h2>Create Voicing</h2>
        <div className="controls-grid">
          <Selector label="Root Note" value={selectedRootNote} options={NOTES} onChange={setSelectedRootNote} />
          <Selector label="Chord Type" value={selectedChordType} options={chordTypes} onChange={setSelectedChordType} />
          <Selector label="Difficulty" value={difficulty} options={DIFFICULTIES} onChange={setDifficulty} />
          <div className="form-group">
            <label>Voicing Name</label>
            <input type="text" value={voicingName} onChange={e => setVoicingName(e.target.value)} placeholder="e.g., Open C Shape" />
          </div>
        </div>
        <div className="editor-actions">
          <button onClick={handleSaveVoicing}>Save Voicing</button>
        </div>
      </div>

      <div className="card">
        <h2>Interactive Fretboard</h2>
        <p>Select notes for your voicing, then use the toggles on the right to mark strings as muted.</p>
        <Fretboard 
          fretboardData={fretboardData}
          selectedVoicing={currentVoicing}
          validNotes={validNotes}
          onFretClick={handleFretClick}
          activeFret={activeFret}
          onFingerSelect={handleFingerSelect}
          mutedStrings={mutedStrings}
          onMuteToggle={handleMuteToggle}
        />
      </div>

      <div className="card">
        <h2>Manage Chord Types</h2>
        <div className="controls-grid">
            <div className="form-group">
                <label>New Type Name</label>
                <input type="text" value={newTypeName} onChange={e => setNewTypeName(e.target.value)} placeholder="e.g., sus4" />
            </div>
            <div className="form-group">
                <label>Intervals (comma-separated)</label>
                <input type="text" value={newTypeIntervals} onChange={e => setNewTypeIntervals(e.target.value)} placeholder="e.g., 0, 5, 7" />
            </div>
        </div>
        <div className="editor-actions">
            <button onClick={handleAddChordType}>Add New Chord Type</button>
        </div>
      </div>
    </div>
  );
};

export default ChordEditor;
import { useState, useEffect } from 'react';
import Fretboard from '../components/Fretboard';
import Selector from '../components/Selector';
import {
  getChordTypes,
  addChordType,
  deleteChordType,
  getVoicingsForChord,
  addVoicingToChord,
  deleteVoicing,
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
import './ChordEditor.css';

const NEW_VOICING_OPTION = "Create New Voicing...";
const NEW_CHORD_TYPE_OPTION = "Create New Chord Type...";

const ChordEditor = () => {
  const { handedness } = useHandedness();
  const { accidentalType } = useAccidentalType();
  const { selectedTuning } = useTuning();
  const noteOptions = getNoteNames(accidentalType);

  // --- Chord Type State ---
  const [chordTypes, setChordTypes] = useState<ChordType[]>([]);
  const [selectedChordType, setSelectedChordType] = useState('');
  const [selectedChordTypeName, setSelectedChordTypeName] = useState<string>(NEW_CHORD_TYPE_OPTION);
  const [chordTypeName, setChordTypeName] = useState('');
  const [chordTypeIntervals, setChordTypeIntervals] = useState('');
  const [isChordTypeModified, setIsChordTypeModified] = useState(false);

  // --- Voicing State ---
  const [selectedRoot, setSelectedRoot] = useState('C');
  const [voicings, setVoicings] = useState<Voicing[]>([]);
  const [selectedVoicingName, setSelectedVoicingName] = useState(NEW_VOICING_OPTION);
  const [voicingName, setVoicingName] = useState('');
  const [voicingDifficulty, setVoicingDifficulty] = useState('Beginner');
  const [fretboardData, setFretboardData] = useState<FretboardAPIResponse | null>(null);
  const [validNotes, setValidNotes] = useState<string[]>([]);
  const [fingering, setFingering] = useState<[number, number, number][]>([]);
  const [activeFret, setActiveFret] = useState<[number, number] | null>(null);

  // Fetch initial data
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

  // Fetch voicings, notes, and fretboard layout when chord selection changes
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
        resetVoicingFields();
      }
    }
    fetchChordData();
  }, [selectedChordType, selectedRoot, selectedTuning]);

  // --- Chord Type Handlers ---
  const resetAndCreateNewChordType = () => {
    setSelectedChordTypeName(NEW_CHORD_TYPE_OPTION);
    setChordTypeName('');
    setChordTypeIntervals('');
    setIsChordTypeModified(false);
  };

  const handleSelectChordTypeForEdit = (name: string) => {
    setSelectedChordTypeName(name);
    if (name === NEW_CHORD_TYPE_OPTION) {
      resetAndCreateNewChordType();
      return;
    }
    const chordType = chordTypes.find(ct => ct.name === name);
    if (chordType) {
      setChordTypeName(chordType.name);
      setChordTypeIntervals(chordType.intervals.join(', '));
      setIsChordTypeModified(false);
    }
  };

  const handleSaveChordType = async () => {
    if (!chordTypeName || !chordTypeIntervals) return alert("Please provide a name and intervals for the chord type.");
    const intervals = chordTypeIntervals.split(',').map(n => parseInt(n.trim()));
    if (intervals.some(isNaN)) return alert("Intervals must be comma-separated numbers.");
    
    if (await addChordType({ name: chordTypeName, intervals })) {
      alert("Chord type saved!");
      const newTypes = await getChordTypes();
      setChordTypes(newTypes);
      setIsChordTypeModified(false);
    } else {
      alert("Failed to save chord type.");
    }
  };

  const handleDeleteChordType = async () => {
    if (selectedChordTypeName === NEW_CHORD_TYPE_OPTION) return;
    if (await deleteChordType(selectedChordTypeName)) {
      alert("Chord type deleted!");
      const newTypes = await getChordTypes();
      setChordTypes(newTypes);
      
      if (selectedChordType === selectedChordTypeName) {
        setSelectedChordType(newTypes.length > 0 ? newTypes[0].name : '');
      }

      resetAndCreateNewChordType();
    } else {
      alert("Failed to delete chord type.");
    }
  };

  // --- Voicing Handlers ---
  const resetVoicingFields = () => {
    setSelectedVoicingName(NEW_VOICING_OPTION);
    setVoicingName('');
    setVoicingDifficulty('Beginner');
    setFingering([]);
    setActiveFret(null);
  };

  const handleSelectVoicing = (name: string) => {
    setSelectedVoicingName(name);
    setActiveFret(null);
    if (name === NEW_VOICING_OPTION) {
      resetVoicingFields();
    } else {
      const voicing = voicings.find(v => v.name === name);
      if (voicing) {
        setVoicingName(voicing.name);
        setVoicingDifficulty(voicing.difficulty);
        setFingering(voicing.fingering);
      }
    }
  };

  const handleFretClick = (string: number, fret: number) => {
    if (activeFret && activeFret[0] === string && activeFret[1] === fret) {
      setActiveFret(null); // Toggle off if same fret is clicked
    } else {
      setActiveFret([string, fret]);
    }
  };

  const handleFingerSelect = (finger: number) => {
    if (!activeFret) return;
    const [string, fret] = activeFret;
    const newFingering = [...fingering];
    const existingIndex = newFingering.findIndex(([s, f]) => s === string && f === fret);

    if (finger === -1) { // Remove finger
      if (existingIndex > -1) newFingering.splice(existingIndex, 1);
    } else { // Add or update finger
      if (existingIndex > -1) {
        newFingering[existingIndex] = [string, fret, finger];
      } else {
        newFingering.push([string, fret, finger]);
      }
    }
    setFingering(newFingering);
    setActiveFret(null); // Close selector after selection
  };

  const handleSaveVoicing = async () => {
    if (!voicingName || !selectedChordType || !selectedRoot || !selectedTuning) return;
    const rootForAPI = unformatNote(selectedRoot);
    const newVoicing: Voicing = { name: voicingName, difficulty: voicingDifficulty, fingering };
    
    if (await addVoicingToChord(selectedTuning, selectedChordType, rootForAPI, newVoicing)) {
      alert("Voicing saved successfully!");
      const updatedVoicings = await getVoicingsForChord(selectedTuning, selectedChordType, rootForAPI);
      setVoicings(updatedVoicings || []);
      setSelectedVoicingName(voicingName);
    } else {
      alert("Failed to save voicing.");
    }
  };

  const handleDeleteVoicing = async () => {
    if (selectedVoicingName === NEW_VOICING_OPTION) return;
    const rootForAPI = unformatNote(selectedRoot);
    if (await deleteVoicing(selectedTuning, selectedChordType, rootForAPI, selectedVoicingName)) {
      alert("Voicing deleted successfully!");
      const updatedVoicings = await getVoicingsForChord(selectedTuning, selectedChordType, rootForAPI);
      setVoicings(updatedVoicings || []);
      resetVoicingFields();
    } else {
      alert("Failed to delete voicing.");
    }
  };

  const showDeleteChordTypeBtn = selectedChordTypeName !== NEW_CHORD_TYPE_OPTION && !isChordTypeModified;

  return (
    <div className="editor-page chord-editor-page">
      <h1>Chord Editor</h1>
      
      <div className="card">
        <h2>Manage Chord Types</h2>
        <div className="controls-grid">
          <Selector label="Edit Chord Type" value={selectedChordTypeName} options={[NEW_CHORD_TYPE_OPTION, ...chordTypes.map(ct => ct.name)]} onChange={handleSelectChordTypeForEdit} />
          <div className="form-group">
            <label>Chord Type Name</label>
            <input type="text" value={chordTypeName} onChange={e => { setChordTypeName(e.target.value); setIsChordTypeModified(true); }} />
          </div>
          <div className="form-group">
            <label>Intervals (comma-separated)</label>
            <input type="text" value={chordTypeIntervals} onChange={e => { setChordTypeIntervals(e.target.value); setIsChordTypeModified(true); }} />
          </div>
        </div>
        <div className="editor-actions">
          {showDeleteChordTypeBtn ? <button onClick={handleDeleteChordType} className="remove-button">Delete Chord Type</button> : <button onClick={handleSaveChordType}>Save Chord Type</button>}
        </div>
      </div>

      <div className="card">
        <h2>Select Chord to Edit Voicings (for {selectedTuning})</h2>
        <div className="controls-grid">
          <Selector label="Chord Type" value={selectedChordType} options={chordTypes.map(t => t.name)} onChange={setSelectedChordType} />
          <Selector label="Root Note" value={selectedRoot} options={noteOptions} onChange={setSelectedRoot} />
          <Selector label="Edit Voicing" value={selectedVoicingName} options={[NEW_VOICING_OPTION, ...voicings.map(v => v.name)]} onChange={handleSelectVoicing} />
        </div>
      </div>

      <div className="card">
        <h2>Voicing Details</h2>
        <div className="controls-grid">
          <div className="form-group">
            <label>Voicing Name</label>
            <input type="text" value={voicingName} onChange={e => setVoicingName(e.target.value)} />
          </div>
          <Selector label="Difficulty" value={voicingDifficulty} options={['Beginner', 'Intermediate', 'Advanced']} onChange={setVoicingDifficulty} />
        </div>
        <div className="editor-actions">
          <button onClick={handleSaveVoicing}>Save Voicing</button>
          {selectedVoicingName !== NEW_VOICING_OPTION && <button onClick={handleDeleteVoicing} className="remove-button">Delete Voicing</button>}
        </div>
      </div>

      <div className="card">
        <h2>Fretboard Editor</h2>
        <Fretboard
          fretboardData={fretboardData}
          validNotes={validNotes}
          chordRootNote={unformatNote(selectedRoot)}
          isLeftHanded={handedness === 'left'}
          accidentalType={accidentalType}
          editableFingering={fingering}
          activeFret={activeFret}
          onFretClick={handleFretClick}
          onFingerSelect={handleFingerSelect}
        />
      </div>
    </div>
  );
};

export default ChordEditor;
import { useState, useEffect } from 'react';
import Fretboard from '../components/Fretboard';
import Selector from '../components/Selector';
import './ChordEditor.css';
import { 
  getVisualizedScale, 
  getTunings, 
  getChordTypes, 
  addChordType, 
  getChordNotesForEditor, 
  addVoicingToChord, 
  getVoicingsForChord, 
  deleteVoicing,
  deleteChordType // CORRECTED: Added the missing import
} from '../apiService';
import type { FretboardAPIResponse, Voicing, ChordType } from '../apiService';

const NOTES = ["C", "C#", "D", "D#", "E", "F", "F#", "G", "G#", "A", "A#", "B"];
const DIFFICULTIES = ["Beginner", "Intermediate", "Advanced"];
const NEW_VOICING_OPTION = "Create New Voicing...";
const NEW_CHORD_TYPE_OPTION = "Create New Type...";
type FrettedNote = [number, number, number];

const createDefaultFingering = (): FrettedNote[] => [[6,-1,0], [5,-1,0], [4,-1,0], [3,-1,0], [2,-1,0], [1,-1,0]];

const ChordEditor = () => {
  const [fretboardData, setFretboardData] = useState<FretboardAPIResponse | null>(null);
  
  // Voicing Editor State
  const [selectedRootNote, setSelectedRootNote] = useState<string>(NOTES[0]);
  const [selectedChordType, setSelectedChordType] = useState<string>('');
  const [voicingName, setVoicingName] = useState('');
  const [difficulty, setDifficulty] = useState<string>(DIFFICULTIES[0]);
  const [fingering, setFingering] = useState<FrettedNote[]>(createDefaultFingering());
  const [activeFret, setActiveFret] = useState<[number, number] | null>(null);
  const [existingVoicings, setExistingVoicings] = useState<Voicing[]>([]);
  const [selectedVoicingName, setSelectedVoicingName] = useState<string>(NEW_VOICING_OPTION);
  const [isVoicingModified, setIsVoicingModified] = useState(false);
  const [validNotes, setValidNotes] = useState<string[]>([]);

  // Chord Type Editor State
  const [chordTypes, setChordTypes] = useState<ChordType[]>([]);
  const [selectedChordTypeName, setSelectedChordTypeName] = useState<string>(NEW_CHORD_TYPE_OPTION);
  const [typeName, setTypeName] = useState('');
  const [typeIntervals, setTypeIntervals] = useState('');
  const [isTypeModified, setIsTypeModified] = useState(false);

  // --- Effects ---
  useEffect(() => {
    async function initializeEditor() {
      const tunings = await getTunings();
      if (tunings.length > 0) setFretboardData(await getVisualizedScale(tunings[0], "C", "Major"));
      const types = await getChordTypes();
      setChordTypes(types);
      if (types.length > 0) setSelectedChordType(types[0].name);
    }
    initializeEditor();
  }, []);

  useEffect(() => {
    async function fetchChordData() {
      if (selectedRootNote && selectedChordType) {
        const fullChordName = `${selectedRootNote} ${selectedChordType}`;
        setValidNotes(await getChordNotesForEditor(selectedRootNote, selectedChordType));
        setExistingVoicings(await getVoicingsForChord(fullChordName));
        resetAndCreateNewVoicing();
      }
    }
    fetchChordData();
  }, [selectedRootNote, selectedChordType]);

  // --- Voicing Handlers ---
  const resetAndCreateNewVoicing = () => {
    setSelectedVoicingName(NEW_VOICING_OPTION);
    setVoicingName('');
    setDifficulty(DIFFICULTIES[0]);
    setFingering(createDefaultFingering());
    setIsVoicingModified(false);
  };

  const handleSelectExistingVoicing = (name: string) => {
    setSelectedVoicingName(name);
    if (name === NEW_VOICING_OPTION) {
      resetAndCreateNewVoicing();
      return;
    }
    const v = existingVoicings.find(v => v.name === name);
    if (v) {
      setVoicingName(v.name);
      setDifficulty(v.difficulty);
      const loadedFingering = createDefaultFingering();
      v.fingering.forEach(([s, f, fin]) => {
        const i = loadedFingering.findIndex(n => n[0] === s);
        if (i !== -1) loadedFingering[i] = [s, f, fin];
      });
      setFingering(loadedFingering);
      setIsVoicingModified(false);
    }
  };

  const handleSaveVoicing = async () => {
    const fullChordName = `${selectedRootNote} ${selectedChordType}`;
    if (!voicingName) return alert("Please provide a voicing name.");
    const newVoicing: Voicing = { name: voicingName, difficulty, fingering };
    if (await addVoicingToChord(fullChordName, newVoicing)) {
      alert("Voicing saved!");
      setExistingVoicings(await getVoicingsForChord(fullChordName));
      setIsVoicingModified(false);
    } else alert("Failed to save voicing.");
  };

  const handleDeleteVoicing = async () => {
    if (selectedVoicingName === NEW_VOICING_OPTION) return;
    const fullChordName = `${selectedRootNote} ${selectedChordType}`;
    if (await deleteVoicing(fullChordName, selectedVoicingName)) {
      alert("Voicing deleted!");
      setExistingVoicings(await getVoicingsForChord(fullChordName));
      resetAndCreateNewVoicing();
    } else alert("Failed to delete voicing.");
  };

  // --- Chord Type Handlers ---
  const resetAndCreateNewType = () => {
    setSelectedChordTypeName(NEW_CHORD_TYPE_OPTION);
    setTypeName('');
    setTypeIntervals('');
    setIsTypeModified(false);
  };

  const handleSelectChordType = (name: string) => {
    setSelectedChordTypeName(name);
    if (name === NEW_CHORD_TYPE_OPTION) {
      resetAndCreateNewType();
      return;
    }
    const type = chordTypes.find(t => t.name === name);
    if (type) {
      setTypeName(type.name);
      setTypeIntervals(type.intervals.join(', '));
      setIsTypeModified(false);
    }
  };

  const handleSaveChordType = async () => {
    if (!typeName || !typeIntervals) return alert("Please provide a name and intervals.");
    const intervals = typeIntervals.split(',').map(n => parseInt(n.trim()));
    if (intervals.some(isNaN)) return alert("Intervals must be comma-separated numbers.");
    
    if (await addChordType({ name: typeName, intervals })) {
      alert("Chord type saved!");
      const types = await getChordTypes();
      setChordTypes(types);
      setIsTypeModified(false);
    } else alert("Failed to save chord type.");
  };

  const handleDeleteChordType = async () => {
    if (selectedChordTypeName === NEW_CHORD_TYPE_OPTION) return;
    if (await deleteChordType(selectedChordTypeName)) {
      alert("Chord type deleted!");
      const types = await getChordTypes();
      setChordTypes(types);
      resetAndCreateNewType();
    } else alert("Failed to delete chord type.");
  };

  // --- Fretboard Interaction ---
  const handleFretClick = (s: number, f: number) => setActiveFret(activeFret && activeFret[0] === s && activeFret[1] === f ? null : [s, f]);
  const handleFingerSelect = (finger: number) => {
    if (!activeFret) return;
    const [string, fret] = activeFret;
    const newFingering = [...fingering];
    const i = newFingering.findIndex(f => f[0] === string);
    if (i === -1) return;
    newFingering[i] = finger > 0 ? [string, fret, finger] : [string, -1, 0];
    setFingering(newFingering);
    setIsVoicingModified(true);
    setActiveFret(null);
  };
  const handleStrumToggle = (stringId: number) => {
    const newFingering = [...fingering];
    const i = newFingering.findIndex(f => f[0] === stringId);
    if (i === -1) return;
    newFingering[i][1] = newFingering[i][1] === -1 ? 0 : -1;
    newFingering[i][2] = 0;
    setFingering(newFingering);
    setIsVoicingModified(true);
  };

  // --- Render Logic ---
  const showDeleteVoicingBtn = selectedVoicingName !== NEW_VOICING_OPTION && !isVoicingModified;
  const showDeleteTypeBtn = selectedChordTypeName !== NEW_CHORD_TYPE_OPTION && !isTypeModified;

  return (
    <div className="chord-editor-page">
      <h1>Chord Editor</h1>
      <div className="card">
        <h2>Create or Edit Voicing</h2>
        <div className="controls-grid">
          <Selector label="Root Note" value={selectedRootNote} options={NOTES} onChange={setSelectedRootNote} />
          <Selector label="Chord Type" value={selectedChordType} options={chordTypes.map(t => t.name)} onChange={setSelectedChordType} />
          <Selector label="Edit Voicing" value={selectedVoicingName} options={[NEW_VOICING_OPTION, ...existingVoicings.map(v => v.name)]} onChange={handleSelectExistingVoicing} />
        </div>
        <div className="controls-grid" style={{marginTop: '1rem'}}>
          <div className="form-group">
            <label>Voicing Name</label>
            <input type="text" value={voicingName} onChange={e => {setVoicingName(e.target.value); setIsVoicingModified(true);}} />
          </div>
          <Selector label="Difficulty" value={difficulty} options={DIFFICULTIES} onChange={d => {setDifficulty(d); setIsVoicingModified(true);}} />
        </div>
        <div className="editor-actions">
          {showDeleteVoicingBtn ? <button onClick={handleDeleteVoicing} className="remove-button">Delete Voicing</button> : <button onClick={handleSaveVoicing}>Save Voicing</button>}
        </div>
      </div>

      <div className="card">
        <h2>Interactive Fretboard</h2>
        <Fretboard 
          fretboardData={fretboardData} 
          selectedVoicing={{ name: '', difficulty: '', fingering }} 
          validNotes={validNotes}
          chordRootNote={selectedRootNote}
          onFretClick={handleFretClick} 
          activeFret={activeFret} 
          onFingerSelect={handleFingerSelect} 
          onStrumToggle={handleStrumToggle} 
        />
      </div>
      
      <div className="card">
        <h2>Manage Chord Types</h2>
        <div className="controls-grid">
          <Selector label="Edit Type" value={selectedChordTypeName} options={[NEW_CHORD_TYPE_OPTION, ...chordTypes.map(t => t.name)]} onChange={handleSelectChordType} />
          <div className="form-group"><label>Type Name</label><input type="text" value={typeName} onChange={e => {setTypeName(e.target.value); setIsTypeModified(true);}} /></div>
          <div className="form-group"><label>Intervals (comma-separated)</label><input type="text" value={typeIntervals} onChange={e => {setTypeIntervals(e.target.value); setIsTypeModified(true);}} /></div>
        </div>
        <div className="editor-actions">
          {showDeleteTypeBtn ? <button onClick={handleDeleteChordType} className="remove-button">Delete Type</button> : <button onClick={handleSaveChordType}>Save Type</button>}
        </div>
      </div>
    </div>
  );
};

export default ChordEditor;
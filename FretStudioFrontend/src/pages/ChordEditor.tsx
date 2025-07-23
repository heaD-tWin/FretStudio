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
  deleteVoicing 
} from '../apiService';
import type { FretboardAPIResponse, Voicing } from '../apiService';

const NOTES = ["C", "C#", "D", "D#", "E", "F", "F#", "G", "G#", "A", "A#", "B"];
const DIFFICULTIES = ["Beginner", "Intermediate", "Advanced"];
const NEW_VOICING_OPTION = "Create New Voicing...";
type FrettedNote = [number, number, number];

const createDefaultFingering = (): FrettedNote[] => [[6,-1,0], [5,-1,0], [4,-1,0], [3,-1,0], [2,-1,0], [1,-1,0]];

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
  const [fingering, setFingering] = useState<FrettedNote[]>(createDefaultFingering());
  const [activeFret, setActiveFret] = useState<[number, number] | null>(null);

  const [existingVoicings, setExistingVoicings] = useState<Voicing[]>([]);
  const [selectedVoicingName, setSelectedVoicingName] = useState<string>(NEW_VOICING_OPTION);
  const [isModified, setIsModified] = useState(false);

  useEffect(() => {
    async function initializeEditor() {
      const tunings = await getTunings();
      if (tunings.length > 0) setFretboardData(await getVisualizedScale(tunings[0], "C", "Major"));
      const types = await getChordTypes();
      setChordTypes(types);
      if (types.length > 0) setSelectedChordType(types[0]);
    }
    initializeEditor();
  }, []);

  useEffect(() => {
    async function fetchChordData() {
      if (selectedRootNote && selectedChordType) {
        const fullChordName = `${selectedRootNote} ${selectedChordType}`;
        setValidNotes(await getChordNotesForEditor(selectedRootNote, selectedChordType));
        setExistingVoicings(await getVoicingsForChord(fullChordName));
        resetAndCreateNew();
      }
    }
    fetchChordData();
  }, [selectedRootNote, selectedChordType]);

  const resetAndCreateNew = () => {
    setSelectedVoicingName(NEW_VOICING_OPTION);
    setVoicingName('');
    setDifficulty(DIFFICULTIES[0]);
    setFingering(createDefaultFingering());
    setIsModified(false);
  };

  const handleSelectExistingVoicing = (name: string) => {
    setSelectedVoicingName(name);
    if (name === NEW_VOICING_OPTION) {
      resetAndCreateNew();
      return;
    }
    const voicingToLoad = existingVoicings.find(v => v.name === name);
    if (voicingToLoad) {
      setVoicingName(voicingToLoad.name);
      setDifficulty(voicingToLoad.difficulty);
      const loadedFingering = createDefaultFingering();
      voicingToLoad.fingering.forEach(([s, f, fin]) => {
        const index = loadedFingering.findIndex(defaultNote => defaultNote[0] === s);
        if (index !== -1) loadedFingering[index] = [s, f, fin];
      });
      setFingering(loadedFingering);
      setIsModified(false);
    }
  };

  const setVoicingNameAndModified = (name: string) => { setVoicingName(name); setIsModified(true); };
  const setDifficultyAndModified = (diff: string) => { setDifficulty(diff); setIsModified(true); };
  const setFingeringAndModified = (fin: FrettedNote[]) => { setFingering(fin); setIsModified(true); };

  const handleFretClick = (string: number, fret: number) => {
    setActiveFret(activeFret && activeFret[0] === string && activeFret[1] === fret ? null : [string, fret]);
  };

  const handleFingerSelect = (finger: number) => {
    if (!activeFret) return;
    const [string, fret] = activeFret;
    const newFingering = [...fingering];
    const stringIndex = newFingering.findIndex(f => f[0] === string);
    if (stringIndex === -1) return;

    if (finger > 0) {
      newFingering[stringIndex] = [string, fret, finger];
    } else {
      newFingering[stringIndex] = [string, -1, 0];
    }
    setFingeringAndModified(newFingering);
    setActiveFret(null);
  };

  const handleStrumToggle = (stringId: number) => {
    const newFingering = [...fingering];
    const stringIndex = newFingering.findIndex(f => f[0] === stringId);
    if (stringIndex === -1) return;
    
    const currentFret = newFingering[stringIndex][1];
    newFingering[stringIndex][1] = currentFret === -1 ? 0 : -1;
    newFingering[stringIndex][2] = 0;
    setFingeringAndModified(newFingering);
  };

  const handleSaveVoicing = async () => {
    const fullChordName = `${selectedRootNote} ${selectedChordType}`;
    if (!voicingName || fingering.every(f => f[1] === -1)) return alert("Please provide a voicing name and at least one note.");
    const newVoicing: Voicing = { name: voicingName, difficulty, fingering };
    const success = await addVoicingToChord(fullChordName, newVoicing);
    if (success) {
      alert("Voicing saved!");
      setExistingVoicings(await getVoicingsForChord(fullChordName));
      setIsModified(false);
    } else alert("Failed to save voicing.");
  };

  const handleDeleteVoicing = async () => {
    if (selectedVoicingName === NEW_VOICING_OPTION) return;
    const fullChordName = `${selectedRootNote} ${selectedChordType}`;
    const success = await deleteVoicing(fullChordName, selectedVoicingName);
    if (success) {
      alert("Voicing deleted!");
      setExistingVoicings(await getVoicingsForChord(fullChordName));
      resetAndCreateNew();
    } else alert("Failed to delete voicing.");
  };

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

  const showDeleteButton = selectedVoicingName !== NEW_VOICING_OPTION && !isModified;
  const voicingOptions = [NEW_VOICING_OPTION, ...existingVoicings.map(v => v.name)];

  return (
    <div className="chord-editor-page">
      <h1>Chord Editor</h1>
      <div className="card">
        <h2>Create or Edit Voicing</h2>
        <div className="controls-grid">
          <Selector label="Root Note" value={selectedRootNote} options={NOTES} onChange={setSelectedRootNote} />
          <Selector label="Chord Type" value={selectedChordType} options={chordTypes} onChange={setSelectedChordType} />
          <Selector label="Edit Existing" value={selectedVoicingName} options={voicingOptions} onChange={handleSelectExistingVoicing} />
        </div>
        <div className="controls-grid" style={{marginTop: '1rem'}}>
          <div className="form-group">
            <label>Voicing Name</label>
            <input type="text" value={voicingName} onChange={e => setVoicingNameAndModified(e.target.value)} />
          </div>
          <Selector label="Difficulty" value={difficulty} options={DIFFICULTIES} onChange={setDifficultyAndModified} />
        </div>
        <div className="editor-actions">
          {showDeleteButton ? (
            <button onClick={handleDeleteVoicing} className="remove-button">Delete Voicing</button>
          ) : (
            <button onClick={handleSaveVoicing}>Save Voicing</button>
          )}
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
            <div className="form-group"><label>New Type Name</label><input type="text" value={newTypeName} onChange={e => setNewTypeName(e.target.value)} /></div>
            <div className="form-group"><label>Intervals (comma-separated)</label><input type="text" value={newTypeIntervals} onChange={e => setNewTypeIntervals(e.target.value)} /></div>
        </div>
        <div className="editor-actions"><button onClick={handleAddChordType}>Add New Chord Type</button></div>
      </div>
    </div>
  );
};

export default ChordEditor;
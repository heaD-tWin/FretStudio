import { useState, useEffect } from 'react';
import Fretboard from '../components/Fretboard';
import Selector from '../components/Selector';
import {
  getChordTypes,
  addChordType,
  deleteChordType,
  reorderChordType,
  getVoicingsForChord,
  addVoicingToChord,
  deleteVoicing,
  reorderVoicing,
  getChordNotesForEditor,
  getVisualizedChord,
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

const ALL_INTERVALS = Array.from({ length: 12 }, (_, i) => i + 1);

const ChordEditor = () => {
  const { handedness } = useHandedness();
  const { accidentalType } = useAccidentalType();
  const { selectedTuning } = useTuning();
  const noteOptions = getNoteNames(accidentalType);

  const [chordTypes, setChordTypes] = useState<ChordType[]>([]);
  const [selectedChordType, setSelectedChordType] = useState('');
  const [selectedChordTypeName, setSelectedChordTypeName] = useState<string>(NEW_CHORD_TYPE_OPTION);
  const [chordTypeName, setChordTypeName] = useState('');
  const [chordTypeIntervals, setChordTypeIntervals] = useState<number[]>([]);
  const [isChordTypeModified, setIsChordTypeModified] = useState(false);

  const [selectedRoot, setSelectedRoot] = useState('C');
  const [voicings, setVoicings] = useState<Voicing[]>([]);
  const [selectedVoicingName, setSelectedVoicingName] = useState(NEW_VOICING_OPTION);
  const [voicingName, setVoicingName] = useState('');
  const [voicingDifficulty, setVoicingDifficulty] = useState('Beginner');
  const [fretboardData, setFretboardData] = useState<FretboardAPIResponse | null>(null);
  const [validNotes, setValidNotes] = useState<string[]>([]);
  const [fingering, setFingering] = useState<[number, number, number][]>([]);
  const [activeFret, setActiveFret] = useState<[number, number] | null>(null);

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
          getVisualizedChord(selectedTuning, rootForAPI, selectedChordType)
        ]);
        setVoicings(fetchedVoicings || []);
        setValidNotes(notes || []);
        setFretboardData(fretboardLayout);
        resetVoicingFields();
      }
    }
    fetchChordData();
  }, [selectedChordType, selectedRoot, selectedTuning]);

  const handleIntervalChange = (intervalNumber: number) => {
    setChordTypeIntervals(prev =>
      prev.includes(intervalNumber)
        ? prev.filter(num => num !== intervalNumber)
        : [...prev, intervalNumber]
    );
    setIsChordTypeModified(true);
  };

  const resetAndCreateNewChordType = () => {
    setSelectedChordTypeName(NEW_CHORD_TYPE_OPTION);
    setChordTypeName('');
    setChordTypeIntervals([]);
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
      setChordTypeIntervals(chordType.intervals);
      setIsChordTypeModified(false);
    }
  };

  const handleSaveChordType = async () => {
    if (!chordTypeName || chordTypeIntervals.length === 0) {
      alert("Please provide a name and select at least one interval for the chord type.");
      return;
    }
    const sortedIntervals = [...chordTypeIntervals].sort((a, b) => a - b);
    const chordTypeToSave: ChordType = { name: chordTypeName, intervals: sortedIntervals };
    
    if (await addChordType(chordTypeToSave)) {
      alert("Chord type saved!");
      const newTypes = await getChordTypes();
      setChordTypes(newTypes);
      setIsChordTypeModified(false);
      if (selectedChordType === '' || selectedChordType === chordTypeName) {
        setSelectedChordType(chordTypeName);
      }
    } else {
      alert("Failed to save chord type.");
    }
  };

  const handleDeleteChordType = async () => {
    if (selectedChordTypeName === NEW_CHORD_TYPE_OPTION) return;
    if (window.confirm(`Are you sure you want to delete the chord type: ${selectedChordTypeName}?`)) {
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
    }
  };

  const handleReorderChordType = async (direction: 'up' | 'down') => {
    if (selectedChordTypeName === NEW_CHORD_TYPE_OPTION) return;
    if (await reorderChordType(selectedChordTypeName, direction)) {
      const freshData = await getChordTypes();
      setChordTypes(freshData);
    } else {
      alert(`Failed to move chord type ${direction}.`);
    }
  };

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
      setActiveFret(null);
    } else {
      setActiveFret([string, fret]);
    }
  };

  const handleFingerSelect = (finger: number) => {
    if (!activeFret) return;
    const [string, fret] = activeFret;
    const newFingering = [...fingering];
    const existingIndex = newFingering.findIndex(([s, f]) => s === string && f === fret);

    if (finger === -1) {
      if (existingIndex > -1) newFingering.splice(existingIndex, 1);
    } else {
      if (existingIndex > -1) {
        newFingering[existingIndex] = [string, fret, finger];
      } else {
        newFingering.push([string, fret, finger]);
      }
    }
    setFingering(newFingering);
    setActiveFret(null);
  };

  const handleStrumToggle = (stringId: number) => {
    const newFingering = [...fingering];
    const existingIndex = newFingering.findIndex(([s]) => s === stringId);

    if (existingIndex > -1) {
      const currentFret = newFingering[existingIndex][1];
      if (currentFret === 0) {
        newFingering[existingIndex] = [stringId, -1, 0];
      } else {
        newFingering.splice(existingIndex, 1);
      }
    } else {
      newFingering.push([stringId, 0, 0]);
    }
    setFingering(newFingering);
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

  const handleReorderVoicing = async (direction: 'up' | 'down') => {
    if (selectedVoicingName === NEW_VOICING_OPTION || !selectedTuning || !selectedChordType || !selectedRoot) return;
    const rootForAPI = unformatNote(selectedRoot);
    if (await reorderVoicing(selectedTuning, selectedChordType, rootForAPI, selectedVoicingName, direction)) {
      const updatedVoicings = await getVoicingsForChord(selectedTuning, selectedChordType, rootForAPI);
      setVoicings(updatedVoicings || []);
    } else {
      alert(`Failed to move voicing ${direction}.`);
    }
  };

  const showDeleteChordTypeBtn = selectedChordTypeName !== NEW_CHORD_TYPE_OPTION && !isChordTypeModified;
  const selectedChordTypeIndex = chordTypes.findIndex(ct => ct.name === selectedChordTypeName);
  const selectedVoicingIndex = voicings.findIndex(v => v.name === selectedVoicingName);

  return (
    <div className="chord-editor-page">
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
            onStrumToggle={handleStrumToggle}
            forceIntervalsVisible={true}
          />

    <div className="card">
        <h1>Select Chord to Edit Voicings (for {selectedTuning})</h1>
        <div className="controls-grid">
            <div className="form-group">
                <label>Chord Type</label>
                <Selector label="Chord Type" value={selectedChordType} options={chordTypes.map(t => t.name)} onChange={setSelectedChordType} />
            </div>
            <div className="form-group">
                <label>Root Note</label>
                <Selector label="Root Note" value={selectedRoot} options={noteOptions} onChange={setSelectedRoot} />
            </div>
            <div className="form-group">
                <label>Select Voicing to Edit</label>
                <Selector label="Edit Voicing" value={selectedVoicingName} options={[NEW_VOICING_OPTION, ...voicings.map(v => v.name)]} onChange={handleSelectVoicing} />
            </div>
        </div>
        <div className="controls-grid">
            <div className="form-group">
            <label>Difficulty Level</label>
            <Selector label="Difficulty" value={voicingDifficulty} options={['Beginner', 'Intermediate', 'Advanced']} onChange={setVoicingDifficulty} />
            </div>
            <div className="form-group">
                <label>Voicing Name</label>
                <input type="text" value={voicingName} onChange={e => setVoicingName(e.target.value)} />
            </div>
        </div>
        <div className="editor-actions">
          <div className="reorder-buttons">
            <button
              onClick={() => handleReorderVoicing('up')}
              disabled={selectedVoicingIndex < 1}
            >
              Move Up
            </button>
            <button
              onClick={() => handleReorderVoicing('down')}
              disabled={selectedVoicingIndex === -1 || selectedVoicingIndex === voicings.length - 1}
            >
              Move Down
            </button>
          </div>
          <div className="save-delete-buttons">
            <button onClick={handleSaveVoicing}>Save Voicing</button>
            {selectedVoicingName !== NEW_VOICING_OPTION && <button className="remove-button" onClick={handleDeleteVoicing}>Delete Voicing</button>}
          </div>
        </div>
    </div>
      
      <div className="card">
        <h1>Manage Chord Types</h1>
        <div className="controls-grid">
          <div className="form-group">
            <label>Select Chord Type to Edit</label>
            <Selector label="Edit Chord Type" value={selectedChordTypeName} options={[NEW_CHORD_TYPE_OPTION, ...chordTypes.map(ct => ct.name)]} onChange={handleSelectChordTypeForEdit} />
          </div>
          <div className="form-group">
            <label>Chord Type Name</label>
            <input type="text" value={chordTypeName} onChange={e => { setChordTypeName(e.target.value); setIsChordTypeModified(true); }} />
          </div>
        </div>
        <div className="form-group">
            <label>Intervals</label>
            <div className="interval-checkbox-row">
                {ALL_INTERVALS.map(num => (
                    <div key={num} className="checkbox-container">
                        <input
                            type="checkbox"
                            id={`chord-interval-${num}`}
                            checked={chordTypeIntervals.includes(num)}
                            onChange={() => handleIntervalChange(num)}
                        />
                        <label htmlFor={`chord-interval-${num}`}>{num}</label>
                    </div>
                ))}
            </div>
        </div>
        <div className="editor-actions">
          <div className="reorder-buttons">
            <button
              onClick={() => handleReorderChordType('up')}
              disabled={selectedChordTypeIndex < 1}
            >
              Move Up
            </button>
            <button
              onClick={() => handleReorderChordType('down')}
              disabled={selectedChordTypeIndex === -1 || selectedChordTypeIndex === chordTypes.length - 1}
            >
              Move Down
            </button>
          </div>
          <div className="save-delete-buttons">
            {showDeleteChordTypeBtn ? <button className="remove-button" onClick={handleDeleteChordType}>Delete Chord Type</button> : <button onClick={handleSaveChordType}>Save Chord Type</button>}
          </div>
        </div>
      </div>
    </div>
  );
};

export default ChordEditor;
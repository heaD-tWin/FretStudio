import { useState, useEffect } from 'react';
import Selector from '../components/Selector';
import './ChordEditor.css';
import { getChordTypes, getScales, addScale, deleteScale } from '../apiService';
import type { ChordType, Scale } from '../apiService';
import { useAccidentalType } from '../contexts/AccidentalTypeContext';
import { getNoteNames, getScaleNotes, formatNote } from '../utils/noteUtils'; // Use centralized functions

const NEW_SCALE_OPTION = "Create New Scale...";

const ScaleEditor = () => {
  const { accidentalType } = useAccidentalType();
  const noteOptions = getNoteNames(accidentalType);

  const [allScales, setAllScales] = useState<Scale[]>([]);
  const [allChordTypes, setAllChordTypes] = useState<ChordType[]>([]);
  
  const [selectedScaleName, setSelectedScaleName] = useState<string>(NEW_SCALE_OPTION);
  const [scaleName, setScaleName] = useState('');
  const [scaleIntervals, setScaleIntervals] = useState('');
  const [allowedChordTypes, setAllowedChordTypes] = useState<string[]>([]);
  const [isModified, setIsModified] = useState(false);

  const [previewRoot, setPreviewRoot] = useState<string>('C');
  const [previewNotes, setPreviewNotes] = useState<string[]>([]);

  useEffect(() => {
    async function initialize() {
      setAllScales(await getScales());
      setAllChordTypes(await getChordTypes());
    }
    initialize();
  }, []);

  useEffect(() => {
    const intervals = scaleIntervals.split(',').map((n: string) => parseInt(n.trim())).filter((n: number) => !isNaN(n));
    const calculatedNotes = getScaleNotes(previewRoot, intervals);
    setPreviewNotes(calculatedNotes.map(note => formatNote(note, accidentalType)));
  }, [scaleIntervals, previewRoot, accidentalType]);

  const resetAndCreateNew = () => {
    setSelectedScaleName(NEW_SCALE_OPTION);
    setScaleName('');
    setScaleIntervals('');
    setAllowedChordTypes([]);
    setIsModified(false);
  };

  const handleSelectScale = (name: string) => {
    setSelectedScaleName(name);
    if (name === NEW_SCALE_OPTION) {
      resetAndCreateNew();
      return;
    }
    const scale = allScales.find((s: Scale) => s.name === name);
    if (scale) {
      setScaleName(scale.name);
      setScaleIntervals(scale.intervals.join(', '));
      setAllowedChordTypes(scale.allowed_chord_types || []);
      setIsModified(false);
    }
  };

  const handleToggleChordType = (typeName: string) => {
    const newAllowedTypes = allowedChordTypes.includes(typeName)
      ? allowedChordTypes.filter((t: string) => t !== typeName)
      : [...allowedChordTypes, typeName];
    setAllowedChordTypes(newAllowedTypes);
    setIsModified(true);
  };

  const handleSave = async () => {
    if (!scaleName || !scaleIntervals) return alert("Please provide a name and intervals.");
    const intervals = scaleIntervals.split(',').map((n: string) => parseInt(n.trim()));
    if (intervals.some(isNaN)) return alert("Intervals must be comma-separated numbers.");

    const newScale: Scale = { name: scaleName, intervals, allowed_chord_types: allowedChordTypes };
    if (await addScale(newScale)) {
      alert("Scale saved!");
      setAllScales(await getScales());
      setIsModified(false);
    } else {
      alert("Failed to save scale.");
    }
  };

  const handleDelete = async () => {
    if (selectedScaleName === NEW_SCALE_OPTION) return;
    if (window.confirm(`Are you sure you want to delete the "${selectedScaleName}" scale?`)) {
      if (await deleteScale(selectedScaleName)) {
        alert("Scale deleted!");
        setAllScales(await getScales());
        resetAndCreateNew();
      } else {
        alert("Failed to delete scale.");
      }
    }
  };

  const showDeleteButton = selectedScaleName !== NEW_SCALE_OPTION && !isModified;

  return (
    <div className="chord-editor-page">
      <h1>Scale Editor</h1>
      <div className="card">
        <h2>Create or Edit Scale</h2>
        <div className="controls-grid">
          <Selector label="Edit Scale" value={selectedScaleName} options={[NEW_SCALE_OPTION, ...allScales.map((s: Scale) => s.name)]} onChange={handleSelectScale} />
          <div className="form-group">
            <label>Scale Name</label>
            <input type="text" value={scaleName} onChange={e => { setScaleName(e.target.value); setIsModified(true); }} />
          </div>
          <div className="form-group">
            <label>Intervals (comma-separated)</label>
            <input type="text" value={scaleIntervals} onChange={e => { setScaleIntervals(e.target.value); setIsModified(true); }} placeholder="e.g., 0, 2, 4, 5, 7, 9, 11" />
          </div>
        </div>
        <div className="editor-actions">
          {showDeleteButton ? <button onClick={handleDelete} className="remove-button">Delete Scale</button> : <button onClick={handleSave}>Save Scale</button>}
        </div>
      </div>

      <div className="card">
        <h2>Scale Preview</h2>
        <div className="controls-grid">
          <Selector label="Preview Root" value={previewRoot} options={noteOptions} onChange={setPreviewRoot} />
          <div className="form-group">
            <label>Notes in Scale</label>
            <div className="note-display">{previewNotes.join(' - ')}</div>
          </div>
        </div>
      </div>

      <div className="card">
        <h2>Allowed Chord Types for this Scale</h2>
        <div className="checkbox-grid">
          {allChordTypes.map((type: ChordType) => (
            <div key={type.name} className="checkbox-item">
              <input
                type="checkbox"
                id={`type-${type.name}`}
                checked={allowedChordTypes.includes(type.name)}
                onChange={() => handleToggleChordType(type.name)}
              />
              <label htmlFor={`type-${type.name}`}>{type.name}</label>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};

export default ScaleEditor;
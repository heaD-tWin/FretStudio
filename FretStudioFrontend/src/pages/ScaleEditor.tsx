import { useState, useEffect } from 'react';
import { 
  getScales, addScale, deleteScale, type Scale,
  getTunings, addTuning, deleteTuning, type Tuning 
} from '../apiService';
import Selector from '../components/Selector';
import './ScaleEditor.css';

const NEW_SCALE_OPTION = "Create New Scale...";
const NEW_TUNING_OPTION = "Create New Tuning...";

// An array representing intervals 1 through 12 for the checkboxes
const ALL_INTERVALS = Array.from({ length: 12 }, (_, i) => i + 1);

const ScaleEditor = () => {
  // --- State for Scale Editor ---
  const [scales, setScales] = useState<Scale[]>([]);
  const [selectedScaleName, setSelectedScaleName] = useState(NEW_SCALE_OPTION);
  const [editedScaleName, setEditedScaleName] = useState('');
  // State for intervals is now an array of numbers
  const [selectedIntervals, setSelectedIntervals] = useState<number[]>([]);

  // --- State for Tuning Editor (UNCHANGED) ---
  const [tunings, setTunings] = useState<Tuning[]>([]);
  const [selectedTuningName, setSelectedTuningName] = useState(NEW_TUNING_OPTION);
  const [editedTuningName, setEditedTuningName] = useState('');
  const [editedTuningNotes, setEditedTuningNotes] = useState('');

  // Fetch initial data for both editors
  useEffect(() => {
    async function fetchInitialData() {
      const scalesData = await getScales();
      setScales(scalesData);
      const tuningsData = await getTunings();
      setTunings(tuningsData);
    }
    fetchInitialData();
  }, []);

  // Effect to populate scale form
  useEffect(() => {
    if (selectedScaleName === NEW_SCALE_OPTION) {
      setEditedScaleName('');
      setSelectedIntervals([]);
    } else {
      const scale = scales.find(s => s.name === selectedScaleName);
      if (scale) {
        setEditedScaleName(scale.name);
        setSelectedIntervals(scale.intervals); // Use the array directly
      }
    }
  }, [selectedScaleName, scales]);

  // Effect to populate tuning form (UNCHANGED)
  useEffect(() => {
    if (selectedTuningName === NEW_TUNING_OPTION) {
      setEditedTuningName('');
      setEditedTuningNotes('');
    } else {
      const tuning = tunings.find(t => t.name === selectedTuningName);
      if (tuning) {
        setEditedTuningName(tuning.name);
        setEditedTuningNotes(tuning.notes.join(', '));
      }
    }
  }, [selectedTuningName, tunings]);

  // --- Handlers for Scale Editor ---
  const handleIntervalChange = (intervalNumber: number) => {
    setSelectedIntervals(prev =>
      prev.includes(intervalNumber)
        ? prev.filter(num => num !== intervalNumber)
        : [...prev, intervalNumber]
    );
  };

  const handleSaveScale = async () => {
    if (!editedScaleName || selectedIntervals.length === 0) {
      alert('Please provide a scale name and select at least one interval.');
      return;
    }
    const sortedIntervals = [...selectedIntervals].sort((a, b) => a - b);
    const scaleToSave: Scale = { name: editedScaleName, intervals: sortedIntervals };

    if (await addScale(scaleToSave)) {
      alert('Scale saved!');
      const freshData = await getScales();
      setScales(freshData);
      setSelectedScaleName(editedScaleName);
    } else {
      alert('Failed to save scale.');
    }
  };

  const handleDeleteScale = async () => {
    if (selectedScaleName === NEW_SCALE_OPTION) return;
    if (window.confirm(`Delete scale: ${selectedScaleName}?`)) {
      if (await deleteScale(selectedScaleName)) {
        alert('Scale deleted!');
        const freshData = await getScales();
        setScales(freshData);
        setSelectedScaleName(NEW_SCALE_OPTION);
      } else {
        alert('Failed to delete scale.');
      }
    }
  };

  // --- Handlers for Tuning Editor (UNCHANGED) ---
  const handleSaveTuning = async () => {
    if (!editedTuningName || !editedTuningNotes) {
      alert('Please provide a tuning name and notes.');
      return;
    }
    const notes = editedTuningNotes.split(',').map(n => n.trim().toUpperCase());
    const tuningToSave: Tuning = { name: editedTuningName, notes };

    if (await addTuning(tuningToSave)) {
      alert('Tuning saved!');
      const freshData = await getTunings();
      setTunings(freshData);
      setSelectedTuningName(editedTuningName);
    } else {
      alert('Failed to save tuning.');
    }
  };

  const handleDeleteTuning = async () => {
    if (selectedTuningName === NEW_TUNING_OPTION) return;
    if (window.confirm(`Delete tuning: ${selectedTuningName}?`)) {
      if (await deleteTuning(selectedTuningName)) {
        alert('Tuning deleted!');
        const freshData = await getTunings();
        setTunings(freshData);
        setSelectedTuningName(NEW_TUNING_OPTION);
      } else {
        alert('Failed to delete tuning.');
      }
    }
  };

  return (
    <div className="editor-page">
      {/* --- Scale Editor Card --- */}
      <div className="card">
        <h1>Scale Editor</h1>
        <div className="controls-grid">
          <Selector
            label="Select Scale"
            value={selectedScaleName}
            options={[NEW_SCALE_OPTION, ...scales.map(s => s.name)]}
            onChange={setSelectedScaleName}
          />
          <div className="form-group">
            <label htmlFor="scale-name">Scale Name</label>
            <input
              id="scale-name"
              type="text"
              value={editedScaleName}
              onChange={(e) => setEditedScaleName(e.target.value)}
            />
          </div>
        </div>
        <div className="form-group">
          <label>Intervals</label>
          <div className="interval-checkbox-row">
            {ALL_INTERVALS.map(num => (
              <div key={num} className="checkbox-container">
                <input
                  type="checkbox"
                  id={`interval-${num}`}
                  checked={selectedIntervals.includes(num)}
                  onChange={() => handleIntervalChange(num)}
                />
                <label htmlFor={`interval-${num}`}>{num}</label>
              </div>
            ))}
          </div>
        </div>
        <div className="editor-actions">
          <button onClick={handleSaveScale}>Save Scale</button>
          {selectedScaleName !== NEW_SCALE_OPTION && (
            <button className="remove-button" onClick={handleDeleteScale}>Delete Scale</button>
          )}
        </div>
      </div>

      {/* --- Tuning Editor Card (UNCHANGED) --- */}
      <div className="card">
        <h1>Tuning Editor</h1>
        <div className="controls-grid">
          <Selector
            label="Select Tuning"
            value={selectedTuningName}
            options={[NEW_TUNING_OPTION, ...tunings.map(t => t.name)]}
            onChange={setSelectedTuningName}
          />
          <div className="form-group">
            <label htmlFor="tuning-name">Tuning Name</label>
            <input
              id="tuning-name"
              type="text"
              value={editedTuningName}
              onChange={(e) => setEditedTuningName(e.target.value)}
            />
          </div>
          <div className="form-group">
            <label htmlFor="tuning-notes">Notes (comma-separated)</label>
            <input
              id="tuning-notes"
              type="text"
              value={editedTuningNotes}
              onChange={(e) => setEditedTuningNotes(e.target.value)}
            />
          </div>
        </div>
        <div className="editor-actions">
          <button onClick={handleSaveTuning}>Save Tuning</button>
          {selectedTuningName !== NEW_TUNING_OPTION && (
            <button className="remove-button" onClick={handleDeleteTuning}>Delete Tuning</button>
          )}
        </div>
      </div>
    </div>
  );
};

export default ScaleEditor;
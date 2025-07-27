import { useState, useEffect } from 'react';
import Selector from '../components/Selector';
import { 
  getScales, 
  addScale, 
  deleteScale,
  getTunings,
  addTuning,
  deleteTuning,
  type Scale,
  type Tuning
} from '../apiService';
import { useTuning } from '../contexts/TuningContext'; // Import the context hook
import './ScaleEditor.css';

const NEW_SCALE_OPTION = "Create New Scale...";
const NEW_TUNING_OPTION = "Create New Tuning...";

const ScaleEditor = () => {
  // --- Global State ---
  const { selectedTuning, setSelectedTuning } = useTuning();

  // --- Scale State ---
  const [scales, setScales] = useState<Scale[]>([]);
  const [selectedScaleName, setSelectedScaleName] = useState<string>(NEW_SCALE_OPTION);
  const [scaleName, setScaleName] = useState('');
  const [scaleIntervals, setScaleIntervals] = useState('');
  const [isScaleModified, setIsScaleModified] = useState(false);

  // --- Tuning State ---
  const [tunings, setTunings] = useState<Tuning[]>([]);
  const [selectedTuningName, setSelectedTuningName] = useState<string>(NEW_TUNING_OPTION);
  const [tuningName, setTuningName] = useState('');
  const [tuningNotes, setTuningNotes] = useState('');
  const [isTuningModified, setIsTuningModified] = useState(false);

  // --- Effects ---
  useEffect(() => {
    async function fetchData() {
      const scalesData = await getScales();
      const tuningsData = await getTunings();
      setScales(scalesData);
      setTunings(tuningsData);
    }
    fetchData();
  }, []);

  // --- Scale Handlers ---
  const resetAndCreateNewScale = () => {
    setSelectedScaleName(NEW_SCALE_OPTION);
    setScaleName('');
    setScaleIntervals('');
    setIsScaleModified(false);
  };

  const handleSelectScale = (name: string) => {
    setSelectedScaleName(name);
    if (name === NEW_SCALE_OPTION) {
      resetAndCreateNewScale();
      return;
    }
    const scale = scales.find(s => s.name === name);
    if (scale) {
      setScaleName(scale.name);
      setScaleIntervals(scale.intervals.join(', '));
      setIsScaleModified(false);
    }
  };

  const handleSaveScale = async () => {
    if (!scaleName || !scaleIntervals) return alert("Please provide a name and intervals for the scale.");
    const intervals = scaleIntervals.split(',').map(n => parseInt(n.trim()));
    if (intervals.some(isNaN)) return alert("Intervals must be comma-separated numbers.");
    
    if (await addScale({ name: scaleName, intervals })) {
      alert("Scale saved!");
      setScales(await getScales());
      setIsScaleModified(false);
    } else {
      alert("Failed to save scale.");
    }
  };

  const handleDeleteScale = async () => {
    if (selectedScaleName === NEW_SCALE_OPTION) return;
    if (await deleteScale(selectedScaleName)) {
      alert("Scale deleted!");
      setScales(await getScales());
      resetAndCreateNewScale();
    } else {
      alert("Failed to delete scale.");
    }
  };

  // --- Tuning Handlers ---
  const resetAndCreateNewTuning = () => {
    setSelectedTuningName(NEW_TUNING_OPTION);
    setTuningName('');
    setTuningNotes('');
    setIsTuningModified(false);
  };

  const handleSelectTuning = (name: string) => {
    setSelectedTuningName(name);
    if (name === NEW_TUNING_OPTION) {
      resetAndCreateNewTuning();
      return;
    }
    const tuning = tunings.find(t => t.name === name);
    if (tuning) {
      setTuningName(tuning.name);
      setTuningNotes(tuning.notes.join(', '));
      setIsTuningModified(false);
    }
  };

  const handleSaveTuning = async () => {
    if (!tuningName || !tuningNotes) return alert("Please provide a name and notes for the tuning.");
    const notes = tuningNotes.split(',').map(n => n.trim().toUpperCase());
    
    if (await addTuning({ name: tuningName, notes })) {
      alert("Tuning saved!");
      setTunings(await getTunings());
      setIsTuningModified(false);
    } else {
      alert("Failed to save tuning.");
    }
  };

  const handleDeleteTuning = async () => {
    if (selectedTuningName === NEW_TUNING_OPTION) return;
    if (await deleteTuning(selectedTuningName)) {
      alert("Tuning deleted!");
      // If the deleted tuning was the globally selected one, reset the global context
      if (selectedTuning === selectedTuningName) {
        setSelectedTuning('Standard Guitar');
      }
      setTunings(await getTunings());
      resetAndCreateNewTuning();
    } else {
      alert("Failed to delete tuning.");
    }
  };

  // --- Render Logic ---
  const showDeleteScaleBtn = selectedScaleName !== NEW_SCALE_OPTION && !isScaleModified;
  const showDeleteTuningBtn = selectedTuningName !== NEW_TUNING_OPTION && !isTuningModified;

  return (
    <div className="editor-page">
      <div className="card">
        <h2>Manage Scales</h2>
        <div className="controls-grid">
          <Selector label="Edit Scale" value={selectedScaleName} options={[NEW_SCALE_OPTION, ...scales.map(s => s.name)]} onChange={handleSelectScale} />
          <div className="form-group">
            <label>Scale Name</label>
            <input type="text" value={scaleName} onChange={e => { setScaleName(e.target.value); setIsScaleModified(true); }} />
          </div>
          <div className="form-group">
            <label>Intervals (comma-separated)</label>
            <input type="text" value={scaleIntervals} onChange={e => { setScaleIntervals(e.target.value); setIsScaleModified(true); }} />
          </div>
        </div>
        <div className="editor-actions">
          {showDeleteScaleBtn ? <button onClick={handleDeleteScale} className="remove-button">Delete Scale</button> : <button onClick={handleSaveScale}>Save Scale</button>}
        </div>
      </div>

      <div className="card">
        <h2>Manage Tunings</h2>
        <div className="controls-grid">
          <Selector label="Edit Tuning" value={selectedTuningName} options={[NEW_TUNING_OPTION, ...tunings.map(t => t.name)]} onChange={handleSelectTuning} />
          <div className="form-group">
            <label>Tuning Name</label>
            <input type="text" value={tuningName} onChange={e => { setTuningName(e.target.value); setIsTuningModified(true); }} />
          </div>
          <div className="form-group">
            <label>Notes (comma-separated, e.g., E,A,D,G,B,E)</label>
            <input type="text" value={tuningNotes} onChange={e => { setTuningNotes(e.target.value); setIsTuningModified(true); }} />
          </div>
        </div>
        <div className="editor-actions">
          {showDeleteTuningBtn ? <button onClick={handleDeleteTuning} className="remove-button">Delete Tuning</button> : <button onClick={handleSaveTuning}>Save Tuning</button>}
        </div>
      </div>
    </div>
  );
};

export default ScaleEditor;
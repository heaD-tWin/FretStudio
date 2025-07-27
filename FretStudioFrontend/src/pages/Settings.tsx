import React, { useState, useEffect } from 'react';
import { useHandedness } from '../contexts/HandednessContext';
import { useAccidentalType } from '../contexts/AccidentalTypeContext';
import { useTuning } from '../contexts/TuningContext';
import { getTunings, type Tuning } from '../apiService';
import Selector from '../components/Selector';
import './Settings.css';

const Settings: React.FC = () => {
  const { handedness, toggleHandedness } = useHandedness();
  const { accidentalType, toggleAccidentalType } = useAccidentalType();
  const { selectedTuning, setSelectedTuning } = useTuning();
  
  const [allTunings, setAllTunings] = useState<Tuning[]>([]);

  useEffect(() => {
    async function fetchTunings() {
      const tuningsData = await getTunings();
      setAllTunings(tuningsData);
    }
    fetchTunings();
  }, []);

  return (
    <div className="settings-page">
      <h1>Settings</h1>
      <div className="card">
        <h2>General Settings</h2>
        <div className="setting-item">
          <span>Active Tuning</span>
          <Selector 
            label="" 
            value={selectedTuning} 
            options={allTunings.map(t => t.name)} 
            onChange={setSelectedTuning} 
          />
        </div>
        <div className="setting-item">
          <span>Note Display</span>
          <button onClick={toggleAccidentalType}>
            Use {accidentalType === 'sharps' ? 'Flats (b)' : 'Sharps (#)'}
          </button>
        </div>
        <div className="setting-item">
          <span>Fretboard View</span>
          <button onClick={toggleHandedness}>
            {handedness === 'left' ? 'Left-Handed' : 'Right-Handed'}
          </button>
        </div>
      </div>
    </div>
  );
};

export default Settings;
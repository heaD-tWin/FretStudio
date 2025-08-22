import { useState, useEffect } from 'react';
import { 
  getAllDataForSaveLoad, 
  generateSaveFile, 
  type AllData, 
  type SaveSelectionsPayload 
} from '../apiService';
import './SaveLoadPage.css';

// Interface to hold the state of all user selections
interface Selections {
  scales: Set<string>;
  chordTypes: Set<string>;
  tunings: Set<string>;
  voicings: Set<string>; 
}

const SaveLoadPage = () => {
  const [allData, setAllData] = useState<AllData | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  // State to manage all checkbox selections
  const [selections, setSelections] = useState<Selections>({
    scales: new Set(),
    chordTypes: new Set(),
    tunings: new Set(),
    voicings: new Set(),
  });

  // Fetch data on component mount
  useEffect(() => {
    const fetchData = async () => {
      setIsLoading(true);
      const data = await getAllDataForSaveLoad();
      setAllData(data);
      setIsLoading(false);
    };
    fetchData();
  }, []);

  // --- Checkbox Handlers ---

  const handleScaleChange = (scaleName: string) => {
    const newSelections = new Set(selections.scales);
    if (newSelections.has(scaleName)) {
      newSelections.delete(scaleName);
    } else {
      newSelections.add(scaleName);
    }
    setSelections(prev => ({ ...prev, scales: newSelections }));
  };

  const handleChordTypeChange = (typeName: string) => {
    const newSelections = new Set(selections.chordTypes);
    if (newSelections.has(typeName)) {
      newSelections.delete(typeName);
    } else {
      newSelections.add(typeName);
    }
    setSelections(prev => ({ ...prev, chordTypes: newSelections }));
  };

  const handleTuningChange = (tuningName: string) => {
    const newSelections = new Set(selections.tunings);
    if (newSelections.has(tuningName)) {
      newSelections.delete(tuningName);
    } else {
      newSelections.add(tuningName);
    }
    setSelections(prev => ({ ...prev, tunings: newSelections }));
  };

  // Handles the hierarchical logic when a voicing is checked
  const handleVoicingChange = (tuningName: string, chordTypeName: string, voicingName: string) => {
    const voicingId = `${tuningName}::${chordTypeName}::${voicingName}`;
    const newVoicingSelections = new Set(selections.voicings);
    const newTuningSelections = new Set(selections.tunings);
    const newChordTypeSelections = new Set(selections.chordTypes);

    if (newVoicingSelections.has(voicingId)) {
      newVoicingSelections.delete(voicingId);
    } else {
      // When checking a voicing, automatically check its parent tuning and chord type
      newVoicingSelections.add(voicingId);
      newTuningSelections.add(tuningName);
      newChordTypeSelections.add(chordTypeName);
    }
    setSelections({ ...selections, voicings: newVoicingSelections, tunings: newTuningSelections, chordTypes: newChordTypeSelections });
  };

  // --- Locking Logic ---

  // A chord type is locked if any of its voicings are selected
  const isChordTypeLocked = (typeName: string) => {
    for (const voicingId of selections.voicings) {
      if (voicingId.split('::')[1] === typeName) return true;
    }
    return false;
  };

  // A tuning is locked if any of its voicings are selected
  const isTuningLocked = (tuningName: string) => {
    for (const voicingId of selections.voicings) {
      if (voicingId.startsWith(tuningName)) return true;
    }
    return false;
  };

  // --- Select/Deselect All Handlers ---

  const handleSelectAll = (select: boolean) => {
    if (!allData) return;
    if (select) {
      // Select everything
      const allVoicingIds = new Set<string>();
      allData.tunings.forEach(tuning => {
        Object.entries(allData.voicings_library[tuning.name] || {}).forEach(([chordTypeName, rootNotes]) => {
          Object.values(rootNotes).forEach(voicingsData => {
            voicingsData.voicings.forEach(voicing => allVoicingIds.add(`${tuning.name}::${chordTypeName}::${voicing.name}`));
          });
        });
      });
      setSelections({
        scales: new Set(allData.scales.map(s => s.name)),
        chordTypes: new Set(allData.chord_types.map(ct => ct.name)),
        tunings: new Set(allData.tunings.map(t => t.name)),
        voicings: allVoicingIds,
      });
    } else {
      // Deselect everything
      setSelections({ scales: new Set(), chordTypes: new Set(), tunings: new Set(), voicings: new Set() });
    }
  };

  const handleSelectAllScales = (select: boolean) => {
    if (!allData) return;
    setSelections(prev => ({ ...prev, scales: select ? new Set(allData.scales.map(s => s.name)) : new Set() }));
  };

  const handleSelectAllChordTypes = (select: boolean) => {
    if (!allData) return;
    const newChordTypeSelections = new Set(selections.chordTypes);
    if (select) {
      allData.chord_types.forEach(ct => newChordTypeSelections.add(ct.name));
    } else {
      // Only deselect chord types that are not locked by a voicing selection
      allData.chord_types.forEach(ct => {
        if (!isChordTypeLocked(ct.name)) newChordTypeSelections.delete(ct.name);
      });
    }
    setSelections(prev => ({ ...prev, chordTypes: newChordTypeSelections }));
  };

  const handleSelectAllForTuning = (tuningName: string, select: boolean) => {
    if (!allData) return;
    const newVoicingSelections = new Set(selections.voicings);
    const newTuningSelections = new Set(selections.tunings);
    const newChordTypeSelections = new Set(selections.chordTypes);

    const tuningVoicings = Object.entries(allData.voicings_library[tuningName] || {}).flatMap(
      ([chordTypeName, rootNotes]) => Object.values(rootNotes).flatMap(
        voicingsData => voicingsData.voicings.map(
          voicing => ({ voicingId: `${tuningName}::${chordTypeName}::${voicing.name}`, chordTypeName })
        )
      )
    );

    if (select) {
      newTuningSelections.add(tuningName);
      tuningVoicings.forEach(({ voicingId, chordTypeName }) => {
        newVoicingSelections.add(voicingId);
        newChordTypeSelections.add(chordTypeName);
      });
    } else {
      // Respect locks on deselect
      if (!isTuningLocked(tuningName)) newTuningSelections.delete(tuningName);
      tuningVoicings.forEach(({ voicingId }) => newVoicingSelections.delete(voicingId));
    }
    setSelections(prev => ({ ...prev, voicings: newVoicingSelections, tunings: newTuningSelections, chordTypes: newChordTypeSelections }));
  };

  const handleSelectAllForVoicingSubgroup = (tuningName: string, chordTypeName: string, select: boolean) => {
    if (!allData) return;
    const newVoicingSelections = new Set(selections.voicings);
    const newTuningSelections = new Set(selections.tunings);
    const newChordTypeSelections = new Set(selections.chordTypes);

    const subgroupVoicings = Object.values(allData.voicings_library[tuningName]?.[chordTypeName] || {}).flatMap(
      voicingsData => voicingsData.voicings.map(voicing => `${tuningName}::${chordTypeName}::${voicing.name}`)
    );

    if (select) {
      newTuningSelections.add(tuningName);
      newChordTypeSelections.add(chordTypeName);
      subgroupVoicings.forEach(voicingId => newVoicingSelections.add(voicingId));
    } else {
      subgroupVoicings.forEach(voicingId => newVoicingSelections.delete(voicingId));
    }
    setSelections(prev => ({ ...prev, voicings: newVoicingSelections, tunings: newTuningSelections, chordTypes: newChordTypeSelections }));
  };

  // --- NEW: Save Handler ---
  const handleSave = async () => {
    const payload: SaveSelectionsPayload = {
      scales: Array.from(selections.scales),
      chordTypes: Array.from(selections.chordTypes),
      tunings: Array.from(selections.tunings),
      voicings: Array.from(selections.voicings),
    };

    const fileContent = await generateSaveFile(payload);
    if (fileContent) {
      const blob = new Blob([JSON.stringify(fileContent, null, 2)], { type: 'application/json' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = 'fretstudio_backup.json';
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
    } else {
      alert('Failed to generate save file.');
    }
  };

  if (isLoading) {
    return <div className="save-load-page"><h1>Loading...</h1></div>;
  }

  if (!allData) {
    return <div className="save-load-page"><h1>Error loading data. Please try again later.</h1></div>;
  }

  return (
    <div className="save-load-page">
      <div className="page-header">
        <div className="page-title-and-global-actions">
            <h1>Save/Load User Data</h1>
            <button onClick={() => handleSelectAll(true)}>Select All</button>
            <button onClick={() => handleSelectAll(false)}>Deselect All</button>
        </div>
        <div className="main-actions">
          <button>Hard Load</button>
          <button>Soft Load</button>
          <button onClick={handleSave}>Save Selections</button>
        </div>
      </div>

      <div className="card">
        <div className="card-header">
          <h2>Scales</h2>
          <div className="card-actions">
            <button onClick={() => handleSelectAllScales(true)}>Select All</button>
            <button onClick={() => handleSelectAllScales(false)}>Deselect All</button>
          </div>
        </div>
        <div className="checkbox-grid">
          {allData.scales.map(scale => (
            <div key={scale.name} className="checkbox-item">
              <input type="checkbox" id={`scale-${scale.name}`} checked={selections.scales.has(scale.name)} onChange={() => handleScaleChange(scale.name)} />
              <label htmlFor={`scale-${scale.name}`}>{scale.name}</label>
            </div>
          ))}
        </div>
      </div>

      <div className="card">
        <div className="card-header">
          <h2>Chord Types</h2>
          <div className="card-actions">
            <button onClick={() => handleSelectAllChordTypes(true)}>Select All</button>
            <button onClick={() => handleSelectAllChordTypes(false)}>Deselect All</button>
          </div>
        </div>
        <div className="checkbox-grid">
          {allData.chord_types.map(type => (
            <div key={type.name} className="checkbox-item">
              <input type="checkbox" id={`type-${type.name}`} checked={selections.chordTypes.has(type.name)} onChange={() => handleChordTypeChange(type.name)} disabled={isChordTypeLocked(type.name)} />
              <label htmlFor={`type-${type.name}`} className={isChordTypeLocked(type.name) ? 'disabled-label' : ''}>{type.name}</label>
            </div>
          ))}
        </div>
      </div>

      {allData.tunings.map(tuning => (
        <div key={tuning.name} className="card">
          <div className="card-header">
            <h2>Tuning: {tuning.name}</h2>
            <div className="card-actions">
              <button onClick={() => handleSelectAllForTuning(tuning.name, true)}>Select All</button>
              <button onClick={() => handleSelectAllForTuning(tuning.name, false)}>Deselect All</button>
            </div>
          </div>
          <div className="checkbox-item standalone-checkbox">
            <input type="checkbox" id={`tuning-${tuning.name}`} checked={selections.tunings.has(tuning.name)} onChange={() => handleTuningChange(tuning.name)} disabled={isTuningLocked(tuning.name)} />
            <label htmlFor={`tuning-${tuning.name}`} className={isTuningLocked(tuning.name) ? 'disabled-label' : ''}>Save Tuning Definition ({tuning.notes.join(', ')})</label>
          </div>

          {Object.entries(allData.voicings_library[tuning.name] || {}).map(([chordTypeName, rootNotes]) => (
            <div key={chordTypeName} className="sub-card">
              <div className="card-header">
                <h3>{chordTypeName}</h3>
                <div className="card-actions">
                  <button onClick={() => handleSelectAllForVoicingSubgroup(tuning.name, chordTypeName, true)}>Select All</button>
                  <button onClick={() => handleSelectAllForVoicingSubgroup(tuning.name, chordTypeName, false)}>Deselect All</button>
                </div>
              </div>
              <div className="checkbox-grid">
                {Object.entries(rootNotes).flatMap(([rootNote, voicingsData]) =>
                  voicingsData.voicings.map(voicing => {
                    const voicingId = `${tuning.name}::${chordTypeName}::${voicing.name}`;
                    return (
                      <div key={voicingId} className="checkbox-item">
                        <input type="checkbox" id={voicingId} checked={selections.voicings.has(voicingId)} onChange={() => handleVoicingChange(tuning.name, chordTypeName, voicing.name)} />
                        <label htmlFor={voicingId}>{rootNote}: {voicing.name}</label>
                      </div>
                    )
                  })
                )}
              </div>
            </div>
          ))}
        </div>
      ))}
    </div>
  );
};

export default SaveLoadPage;
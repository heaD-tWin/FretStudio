import { useState, useEffect, useRef } from 'react';
import { 
  getAllDataForSaveLoad, 
  generateSaveFile, 
  hardLoadFromFile,
  softLoadFromFile,
  factoryReset,
  fileSystem,
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
  const [selections, setSelections] = useState<Selections>({
    scales: new Set(),
    chordTypes: new Set(),
    tunings: new Set(),
    voicings: new Set(),
  });
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [loadMode, setLoadMode] = useState<'hard' | 'soft' | null>(null);

  const fetchData = async () => {
    setIsLoading(true);
    const data = await getAllDataForSaveLoad();
    setAllData(data);
    setIsLoading(false);
  };

  useEffect(() => {
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

  const handleVoicingChange = (tuningName: string, chordTypeName: string, rootNote: string, voicingName: string) => {
    const voicingId = `${tuningName}::${chordTypeName}::${rootNote}::${voicingName}`;
    const newVoicingSelections = new Set(selections.voicings);
    const newTuningSelections = new Set(selections.tunings);
    const newChordTypeSelections = new Set(selections.chordTypes);

    if (newVoicingSelections.has(voicingId)) {
      newVoicingSelections.delete(voicingId);
    } else {
      newVoicingSelections.add(voicingId);
      newTuningSelections.add(tuningName);
      newChordTypeSelections.add(chordTypeName);
    }
    setSelections({ ...selections, voicings: newVoicingSelections, tunings: newTuningSelections, chordTypes: newChordTypeSelections });
  };

  // --- Locking Logic ---

  const isChordTypeLocked = (typeName: string) => {
    for (const voicingId of selections.voicings) {
      if (voicingId.split('::')[1] === typeName) return true;
    }
    return false;
  };

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
          Object.entries(rootNotes).forEach(([rootNote, voicingsData]) => {
            voicingsData.voicings.forEach(voicing => allVoicingIds.add(`${tuning.name}::${chordTypeName}::${rootNote}::${voicing.name}`));
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
      ([chordTypeName, rootNotes]) => Object.entries(rootNotes).flatMap(
        ([rootNote, voicingsData]) => voicingsData.voicings.map(
          voicing => ({ voicingId: `${tuningName}::${chordTypeName}::${rootNote}::${voicing.name}`, chordTypeName })
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

    const subgroupVoicings = Object.entries(allData.voicings_library[tuningName]?.[chordTypeName] || {}).flatMap(
      ([rootNote, voicingsData]) => voicingsData.voicings.map(voicing => `${tuningName}::${chordTypeName}::${rootNote}::${voicing.name}`)
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

  // --- File Load Handlers ---
  const handleLoadClick = async (mode: 'hard' | 'soft') => {
    try {
      if (fileSystem.isNative) {
        const file = await fileSystem.loadFile();
        if (!file) return;
        await handleFileLoad(file, mode);
      } else {
        setLoadMode(mode);
        fileInputRef.current?.click();
      }
    } catch (error) {
      console.error('Load error:', error);
      alert('An error occurred while loading');
    }
  };

  const handleFileLoad = async (file: File, mode: 'hard' | 'soft') => {
    try {
      const success = mode === 'hard' 
        ? await hardLoadFromFile(file)
        : await softLoadFromFile(file);

      if (success) {
        alert(`${mode} load successful!`);
        fetchData();
      } else {
        alert('Failed to load file');
      }
    } catch (error) {
      console.error('Load error:', error);
      alert('An error occurred while loading');
    }
  };

  const handleFileChange = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file || !loadMode) return;

    try {
      let success = false;
      if (loadMode === 'hard') {
        success = await hardLoadFromFile(file);
      } else {
        success = await softLoadFromFile(file);
      }

      if (success) {
        alert(`Successfully performed ${loadMode} load! Data has been updated.`);
        fetchData();
      } else {
        alert(`Failed to perform ${loadMode} load. Please check if the file is a valid FretStudio backup.`);
      }
    } catch (error) {
      console.error('Load error:', error);
      alert('An error occurred while loading');
    }

    if(fileInputRef.current) {
      fileInputRef.current.value = '';
    }
    setLoadMode(null);
  };

  const handleFactoryReset = async () => {
    const isConfirmed = window.confirm(
      "Are you sure you want to restore the factory library?\n\nThis will overwrite all current scales, chords, tunings, and voicings. This action cannot be undone."
    );
    if (isConfirmed) {
      const success = await factoryReset();
      if (success) {
        alert("Factory library restored successfully!");
        fetchData();
      } else {
        alert("Failed to restore factory library. Please check the server and file system.");
      }
    }
  };

  // Update handleSave to use fileSystem
  const handleSave = async () => {
    // --- Debugging: Log file system state before saving ---
    console.log('Save button clicked. Checking fileSystem.isNative:', fileSystem.isNative);
    try {
      const selectedItems: SaveSelectionsPayload = {
        scales: Array.from(selections.scales),
        chordTypes: Array.from(selections.chordTypes),
        tunings: Array.from(selections.tunings),
        voicings: Array.from(selections.voicings)
      };

      const saveData = await generateSaveFile(selectedItems);
      if (!saveData) {
        alert('Failed to generate save data');
        return;
      }

      const success = await fileSystem.saveFile(saveData, 'fret_studio_save.json');
      if (success) {
        alert('Save successful!');
      } else {
        alert('Failed to save file');
      }
    } catch (error) {
      console.error('Save error:', error);
      alert('An error occurred while saving');
    }
  };

  const handleHardLoad = () => handleLoadClick('hard');
  const handleSoftLoad = () => handleLoadClick('soft');

  if (isLoading) {
    return <div className="save-load-page"><h1>Loading...</h1></div>;
  }

  if (!allData) {
    return <div className="save-load-page"><h1>Error loading data. Please try again later.</h1></div>;
  }

  return (
    <div className="save-load-page">
      <input 
        type="file" 
        ref={fileInputRef} 
        onChange={handleFileChange}
        accept=".json"
        style={{ display: 'none' }} 
      />
      <div className="page-header">
        <div className="main-actions">
            <button onClick={handleHardLoad}>Hard Load</button>
            <button onClick={handleSoftLoad}>Soft Load</button>
            <button onClick={handleSave}>Save Selections</button>
            <button onClick={handleFactoryReset}>Restore Factory Library</button>
        </div>
        <div className="main-actions">
            <button onClick={() => handleSelectAll(true)}>Select All</button>
            <button onClick={() => handleSelectAll(false)}>Deselect All</button>
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
                    const voicingId = `${tuning.name}::${chordTypeName}::${rootNote}::${voicing.name}`;
                    return (
                      <div key={voicingId} className="checkbox-item">
                        <input type="checkbox" id={voicingId} checked={selections.voicings.has(voicingId)} onChange={() => handleVoicingChange(tuning.name, chordTypeName, rootNote, voicing.name)} />
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
}

export default SaveLoadPage;
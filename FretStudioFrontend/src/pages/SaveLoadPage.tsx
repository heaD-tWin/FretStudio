import { useState, useEffect } from 'react';
import { getAllDataForSaveLoad, type AllData } from '../apiService';
import './SaveLoadPage.css';

const SaveLoadPage = () => {
  const [allData, setAllData] = useState<AllData | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const fetchData = async () => {
      setIsLoading(true);
      const data = await getAllDataForSaveLoad();
      setAllData(data);
      setIsLoading(false);
    };
    fetchData();
  }, []);

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
            <button>Select All</button>
            <button>Deselect All</button>
        </div>
        <div className="main-actions">
          <button>Hard Load</button>
          <button>Soft Load</button>
          <button>Save Selections</button>
        </div>
      </div>

      <div className="card">
        <div className="card-header">
          <h2>Scales</h2>
          <div className="card-actions">
            <button>Select All</button>
            <button>Deselect All</button>
          </div>
        </div>
        <div className="checkbox-grid">
          {allData.scales.map(scale => (
            <div key={scale.name} className="checkbox-item">
              <input type="checkbox" id={`scale-${scale.name}`} />
              <label htmlFor={`scale-${scale.name}`}>{scale.name}</label>
            </div>
          ))}
        </div>
      </div>

      <div className="card">
        <div className="card-header">
          <h2>Chord Types</h2>
          <div className="card-actions">
            <button>Select All</button>
            <button>Deselect All</button>
          </div>
        </div>
        <div className="checkbox-grid">
          {allData.chord_types.map(type => (
            <div key={type.name} className="checkbox-item">
              <input type="checkbox" id={`type-${type.name}`} />
              <label htmlFor={`type-${type.name}`}>{type.name}</label>
            </div>
          ))}
        </div>
      </div>

      {allData.tunings.map(tuning => (
        <div key={tuning.name} className="card">
          <div className="card-header">
            <h2>Tuning: {tuning.name}</h2>
            <div className="card-actions">
              <button>Select All</button>
              <button>Deselect All</button>
            </div>
          </div>
          <div className="checkbox-item standalone-checkbox">
            <input type="checkbox" id={`tuning-${tuning.name}`} />
            <label htmlFor={`tuning-${tuning.name}`}>Save Tuning Definition ({tuning.notes.join(', ')})</label>
          </div>

          {Object.entries(allData.voicings_library[tuning.name] || {}).map(([chordTypeName, rootNotes]) => (
            <div key={chordTypeName} className="sub-card">
              <div className="card-header">
                <h3>{chordTypeName}</h3>
                <div className="card-actions">
                  <button>Select All</button>
                  <button>Deselect All</button>
                </div>
              </div>
              <div className="checkbox-grid">
                {Object.entries(rootNotes).flatMap(([rootNote, voicingsData]) =>
                  voicingsData.voicings.map(voicing => {
                    const voicingId = `${tuning.name}::${chordTypeName}::${voicing.name}`;
                    return (
                      <div key={voicingId} className="checkbox-item">
                        <input type="checkbox" id={voicingId} />
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
import './SaveLoadPage.css';

const SaveLoadPage = () => {
  return (
    <div className="save-load-page">
      <div className="page-header">
        <h1>Save/Load User Data</h1>
        <div className="main-actions">
          <button>Hard Load</button>
          <button>Soft Load</button>
          <button>Save Selections</button>
        </div>
      </div>

      {/* Placeholder for Scales */}
      <div className="card">
        <div className="card-header">
          <h2>Scales</h2>
          <button>Select/Deselect All</button>
        </div>
        <p>Scale checkboxes will go here...</p>
      </div>

      {/* Placeholder for Chord Types */}
      <div className="card">
        <div className="card-header">
          <h2>Chord Types</h2>
          <button>Select/Deselect All</button>
        </div>
        <p>Chord Type checkboxes will go here...</p>
      </div>

      {/* Placeholder for a Tuning */}
      <div className="card">
        <div className="card-header">
          <h2>Tuning: Standard</h2>
          <button>Select/Deselect All</button>
        </div>
        
        <div className="sub-card">
            <div className="card-header">
                <h3>Chord Type: Major</h3>
                <button>Select/Deselect All</button>
            </div>
            <p>Voicing checkboxes for this chord type will go here...</p>
        </div>

        <div className="sub-card">
            <div className="card-header">
                <h3>Chord Type: Minor</h3>
                <button>Select/Deselect All</button>
            </div>
            <p>Voicing checkboxes for this chord type will go here...</p>
        </div>
      </div>
    </div>
  );
};

export default SaveLoadPage;
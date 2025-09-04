import { Route, Routes, NavLink } from 'react-router-dom';
import ScaleVisualizer from './pages/ScaleVisualizer';
import ChordVisualizer from './pages/ChordVisualizer';
import ChordEditor from './pages/ChordEditor';
import ScaleEditor from './pages/ScaleEditor';
import SaveLoadPage from './pages/SaveLoadPage';
import Settings from './pages/Settings';
import { useFingeringVisibility } from './contexts/FingeringVisibilityContext';
import { useIntervalVisibility } from './contexts/IntervalVisibilityContext';
import './App.css';

function App() {
  const { isFingeringVisible, toggleFingeringVisibility } = useFingeringVisibility();
  const { isIntervalVisible, toggleIntervalVisibility } = useIntervalVisibility();

  return (
    <div className="App" data-testid="app-container">
      <div className="navbar-container">
        <nav className="navbar">
          <NavLink to="/" end className={({ isActive }: { isActive: boolean }) => "nav-link" + (isActive ? " active" : "")}>Scale Visualizer</NavLink>
          <NavLink to="/chord-visualizer" className={({ isActive }: { isActive: boolean }) => "nav-link" + (isActive ? " active" : "")}>Chord Visualizer</NavLink>
          <NavLink to="/chord-editor" className={({ isActive }: { isActive: boolean }) => "nav-link" + (isActive ? " active" : "")}>Chord Editor</NavLink>
          <NavLink to="/scale-editor" className={({ isActive }: { isActive: boolean }) => "nav-link" + (isActive ? " active" : "")}>Scale Editor</NavLink>
          <NavLink to="/save-load" className={({ isActive }: { isActive: boolean }) => "nav-link" + (isActive ? " active" : "")}>Save/Load</NavLink>
          <NavLink to="/settings" className={({ isActive }: { isActive: boolean }) => "nav-link" + (isActive ? " active" : "")}>Settings</NavLink>
          
          <div className="nav-controls">
            <button 
              className={`nav-toggle-button interval-toggle ${isIntervalVisible ? 'active' : ''}`}
              onClick={toggleIntervalVisibility}
            >
              Intervals
            </button>
            <button 
              className={`nav-toggle-button fingering-toggle ${isFingeringVisible ? 'active' : ''}`}
              onClick={toggleFingeringVisibility}
            >
              Fingerings
            </button>
          </div>
        </nav>
      </div>
      <main className="content">
        <Routes>
          <Route path="/" element={<ScaleVisualizer />} />
          <Route path="/chord-visualizer" element={<ChordVisualizer />} />
          <Route path="/chord-editor" element={<ChordEditor />} />
          <Route path="/scale-editor" element={<ScaleEditor />} />
          {/* 3. Add the new route */}
          <Route path="/save-load" element={<SaveLoadPage />} />
          <Route path="/settings" element={<Settings />} />
        </Routes>
      </main>
    </div>
  );
}

export default App;

import { Route, Routes, NavLink } from 'react-router-dom';
import ScaleVisualizer from './pages/ScaleVisualizer';
import ChordVisualizer from './pages/ChordVisualizer';
import ChordEditor from './pages/ChordEditor';
import ScaleEditor from './pages/ScaleEditor';
import Settings from './pages/Settings';
import { useFingeringVisibility } from './contexts/FingeringVisibilityContext'; // Import the hook
import './App.css';

function App() {
  const { isFingeringVisible, toggleFingeringVisibility } = useFingeringVisibility(); // Use the hook

  return (
    <div className="App">
      <div className="navbar-container">
        <nav className="navbar">
          <NavLink to="/" end className={({ isActive }: { isActive: boolean }) => "nav-link" + (isActive ? " active" : "")}>Scale Visualizer</NavLink>
          <NavLink to="/chord-visualizer" className={({ isActive }: { isActive: boolean }) => "nav-link" + (isActive ? " active" : "")}>Chord Visualizer</NavLink>
          <NavLink to="/chord-editor" className={({ isActive }: { isActive: boolean }) => "nav-link" + (isActive ? " active" : "")}>Chord Editor</NavLink>
          <NavLink to="/scale-editor" className={({ isActive }: { isActive: boolean }) => "nav-link" + (isActive ? " active" : "")}>Scale Editor</NavLink>
          <NavLink to="/settings" className={({ isActive }: { isActive: boolean }) => "nav-link" + (isActive ? " active" : "")}>Settings</NavLink>
          
          {/* Add the new toggle button */}
          <button 
            className={`fingering-toggle-button ${isFingeringVisible ? 'active' : ''}`}
            onClick={toggleFingeringVisibility}
          >
            Fingerings
          </button>
        </nav>
      </div>
      <main className="content">
        <Routes>
          <Route path="/" element={<ScaleVisualizer />} />
          <Route path="/chord-visualizer" element={<ChordVisualizer />} />
          <Route path="/chord-editor" element={<ChordEditor />} />
          <Route path="/scale-editor" element={<ScaleEditor />} />
          <Route path="/settings" element={<Settings />} />
        </Routes>
      </main>
    </div>
  );
}

export default App;

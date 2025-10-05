import { Route, Routes, NavLink, useLocation } from 'react-router-dom';
import { useEffect } from 'react';
import ScaleVisualizer from './pages/ScaleVisualizer';
import ChordVisualizer from './pages/ChordVisualizer';
import ChordEditor from './pages/ChordEditor';
import ScaleEditor from './pages/ScaleEditor';
import SaveLoadPage from './pages/SaveLoadPage';
import Settings from './pages/Settings';
import { useFingeringVisibility } from './contexts/FingeringVisibilityContext';
import { useIntervalVisibility } from './contexts/IntervalVisibilityContext';
import { initializeFileSystem } from './apiService';
import './App.css';

function App() {
  const { isFingeringVisible, toggleFingeringVisibility } = useFingeringVisibility();
  const { isIntervalVisible, toggleIntervalVisibility } = useIntervalVisibility();
  const location = useLocation();

  useEffect(() => {
    const handlePyWebviewReady = () => {
      console.log("pywebviewready event fired!");
      initializeFileSystem(true);
    };

    // Listen for the event that signals the pywebview API is ready
    window.addEventListener('pywebviewready', handlePyWebviewReady);

    // Fallback for web environment
    // If the event doesn't fire after a short delay, assume we are in a browser
    const timer = setTimeout(() => {
      // Check if pywebview is still not available
      if (!(window as any).pywebview) {
        console.log("pywebviewready event did not fire, assuming web environment.");
        initializeFileSystem(false);
      }
    }, 500); // 500ms delay

    // Cleanup function to remove the event listener and timer
    return () => {
      window.removeEventListener('pywebviewready', handlePyWebviewReady);
      clearTimeout(timer);
    };
  }, []); // Empty dependency array ensures this runs only once on component mount

  // Hide toggles on non-visualizer pages
  const showToggles = location.pathname === '/' || location.pathname === '/chord-visualizer';

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
          
          {showToggles && (
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
          )}
        </nav>
      </div>
      <main className="content">
        <Routes>
          <Route path="/" element={<ScaleVisualizer />} />
          <Route path="/chord-visualizer" element={<ChordVisualizer />} />
          <Route path="/chord-editor" element={<ChordEditor />} />
          <Route path="/scale-editor" element={<ScaleEditor />} />
          <Route path="/save-load" element={<SaveLoadPage />} />
          <Route path="/settings" element={<Settings />} />
        </Routes>
      </main>
    </div>
  );
}

export default App;

import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '../test-utils'; 
import App from '../App';

// Mock all the page components to avoid API dependencies
vi.mock('../pages/ScaleVisualizer', () => ({
  default: () => <div data-testid="scale-visualizer">Scale Visualizer Page</div>
}));

vi.mock('../pages/ChordVisualizer', () => ({
  default: () => <div data-testid="chord-visualizer">Chord Visualizer Page</div>
}));

vi.mock('../pages/ChordEditor', () => ({
  default: () => <div data-testid="chord-editor">Chord Editor Page</div>
}));

vi.mock('../pages/ScaleEditor', () => ({
  default: () => <div data-testid="scale-editor">Scale Editor Page</div>
}));

vi.mock('../pages/SaveLoadPage', () => ({
  default: () => <div data-testid="save-load">Save Load Page</div>
}));

vi.mock('../pages/Settings', () => ({
  default: () => <div data-testid="settings">Settings Page</div>
}));

// Mock localStorage for HandednessContext
const localStorageMock = {
  getItem: vi.fn(() => 'right'),
  setItem: vi.fn(),
  removeItem: vi.fn(),
  clear: vi.fn(),
};
Object.defineProperty(window, 'localStorage', { value: localStorageMock });

describe('App Component', () => {
  it('should render the main application container and navigation links', () => {
    render(<App />);

    // Check for the main container using the data-testid
    const appContainer = screen.getByTestId('app-container');
    expect(appContainer).toBeInTheDocument();

    // Check for navigation links
    const scaleVisualizerLink = screen.getByText('Scale Visualizer');
    expect(scaleVisualizerLink).toBeInTheDocument();

    const chordEditorLink = screen.getByText('Chord Editor');
    expect(chordEditorLink).toBeInTheDocument();
    
    // Check for toggle buttons
    const intervalsButton = screen.getByText('Intervals');
    expect(intervalsButton).toBeInTheDocument();
    
    const fingeringsButton = screen.getByText('Fingerings');
    expect(fingeringsButton).toBeInTheDocument();
  });
});
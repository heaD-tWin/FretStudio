import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '../test-utils'; 
import { userEvent } from '@testing-library/user-event';
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

  it('should render all navigation links with correct text', () => {
    render(<App />);

    // Test all navigation links exist
    const expectedLinks = [
      'Scale Visualizer',
      'Chord Visualizer', 
      'Chord Editor',
      'Scale Editor',
      'Save/Load',
      'Settings'
    ];

    expectedLinks.forEach(linkText => {
      const link = screen.getByText(linkText);
      expect(link).toBeInTheDocument();
      expect(link.tagName).toBe('A');
    });
  });

  it('should render toggle buttons with correct initial state and CSS classes', () => {
    render(<App />);

    // Get the toggle buttons
    const intervalsButton = screen.getByText('Intervals');
    const fingeringsButton = screen.getByText('Fingerings');

    // Verify buttons exist and are button elements
    expect(intervalsButton).toBeInTheDocument();
    expect(intervalsButton.tagName).toBe('BUTTON');
    expect(fingeringsButton).toBeInTheDocument();
    expect(fingeringsButton.tagName).toBe('BUTTON');

    // Check initial state - both contexts default to true (visible/active)
    expect(intervalsButton).toHaveClass('nav-toggle-button', 'interval-toggle', 'active');
    expect(fingeringsButton).toHaveClass('nav-toggle-button', 'fingering-toggle', 'active');

    // Verify base classes are always present
    expect(intervalsButton.className).toContain('nav-toggle-button');
    expect(intervalsButton.className).toContain('interval-toggle');
    expect(fingeringsButton.className).toContain('nav-toggle-button');
    expect(fingeringsButton.className).toContain('fingering-toggle');
  });

  it('should toggle button states when clicked', async () => {
    const user = userEvent.setup();
    render(<App />);

    // Get the toggle buttons
    const intervalsButton = screen.getByText('Intervals');
    const fingeringsButton = screen.getByText('Fingerings');

    // Initial state: both should be active (contexts default to true)
    expect(intervalsButton).toHaveClass('active');
    expect(fingeringsButton).toHaveClass('active');

    // Click intervals button - should toggle to inactive
    await user.click(intervalsButton);
    expect(intervalsButton).not.toHaveClass('active');
    expect(intervalsButton).toHaveClass('nav-toggle-button', 'interval-toggle');

    // Click intervals button again - should toggle back to active
    await user.click(intervalsButton);
    expect(intervalsButton).toHaveClass('active');
    expect(intervalsButton).toHaveClass('nav-toggle-button', 'interval-toggle');

    // Click fingerings button - should toggle to inactive
    await user.click(fingeringsButton);
    expect(fingeringsButton).not.toHaveClass('active');
    expect(fingeringsButton).toHaveClass('nav-toggle-button', 'fingering-toggle');

    // Click fingerings button again - should toggle back to active
    await user.click(fingeringsButton);
    expect(fingeringsButton).toHaveClass('active');
    expect(fingeringsButton).toHaveClass('nav-toggle-button', 'fingering-toggle');

    // Verify buttons work independently
    await user.click(intervalsButton);
    expect(intervalsButton).not.toHaveClass('active');
    expect(fingeringsButton).toHaveClass('active'); // Should remain active
  });

  it('should navigate correctly and show active states for navigation links', async () => {
    const user = userEvent.setup();
    render(<App />);

    // Get navigation links (only the ones we'll actually test)
    const scaleVisualizerLink = screen.getByText('Scale Visualizer');
    const chordVisualizerLink = screen.getByText('Chord Visualizer');
    const chordEditorLink = screen.getByText('Chord Editor');
    const settingsLink = screen.getByText('Settings');

    // Initial state: Scale Visualizer should be active (route "/" with end prop)
    expect(scaleVisualizerLink).toHaveClass('nav-link', 'active');
    expect(chordVisualizerLink).toHaveClass('nav-link');
    expect(chordVisualizerLink).not.toHaveClass('active');

    // Verify initial page content is rendered
    expect(screen.getByTestId('scale-visualizer')).toBeInTheDocument();

    // Click Chord Visualizer link
    await user.click(chordVisualizerLink);
    
    // Verify navigation occurred
    expect(chordVisualizerLink).toHaveClass('nav-link', 'active');
    expect(scaleVisualizerLink).toHaveClass('nav-link');
    expect(scaleVisualizerLink).not.toHaveClass('active');
    expect(screen.getByTestId('chord-visualizer')).toBeInTheDocument();

    // Click Chord Editor link
    await user.click(chordEditorLink);
    
    // Verify navigation occurred
    expect(chordEditorLink).toHaveClass('nav-link', 'active');
    expect(chordVisualizerLink).not.toHaveClass('active');
    expect(screen.getByTestId('chord-editor')).toBeInTheDocument();

    // Click Settings link
    await user.click(settingsLink);
    
    // Verify navigation occurred
    expect(settingsLink).toHaveClass('nav-link', 'active');
    expect(chordEditorLink).not.toHaveClass('active');
    expect(screen.getByTestId('settings')).toBeInTheDocument();

    // Navigate back to Scale Visualizer
    await user.click(scaleVisualizerLink);
    
    // Verify we're back to the initial state
    expect(scaleVisualizerLink).toHaveClass('nav-link', 'active');
    expect(settingsLink).not.toHaveClass('active');
    expect(screen.getByTestId('scale-visualizer')).toBeInTheDocument();
  });
});
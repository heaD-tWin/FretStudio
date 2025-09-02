import React, { ReactElement } from 'react';
import { render, RenderOptions } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { FingeringVisibilityProvider } from './contexts/FingeringVisibilityContext';
import { IntervalVisibilityProvider } from './contexts/IntervalVisibilityContext';
import { HandednessProvider } from './contexts/HandednessContext';

// Mock the missing context providers that are referenced in pages
const MockAccidentalTypeProvider = ({ children }: { children: React.ReactNode }) => {
  const mockContext = {
    accidentalType: 'sharp' as const,
    toggleAccidentalType: () => {}
  };
  
  return (
    <div data-testid="mock-accidental-context">
      {children}
    </div>
  );
};

const MockTuningProvider = ({ children }: { children: React.ReactNode }) => {
  const mockContext = {
    selectedTuning: 'Standard Guitar',
    setSelectedTuning: () => {}
  };
  
  return (
    <div data-testid="mock-tuning-context">
      {children}
    </div>
  );
};

// This component bundles all the necessary providers for our tests.
const AllTheProviders = ({ children }: { children: React.ReactNode }) => {
  return (
    <MemoryRouter>
      <HandednessProvider>
        <FingeringVisibilityProvider>
          <IntervalVisibilityProvider>
            <MockAccidentalTypeProvider>
              <MockTuningProvider>
                {children}
              </MockTuningProvider>
            </MockAccidentalTypeProvider>
          </IntervalVisibilityProvider>
        </FingeringVisibilityProvider>
      </HandednessProvider>
    </MemoryRouter>
  );
};

// Create a custom render function that automatically uses our providers.
const customRender = (
  ui: ReactElement,
  options?: Omit<RenderOptions, 'wrapper'>
) => render(ui, { wrapper: AllTheProviders, ...options });

// Re-export everything from React Testing Library
export * from '@testing-library/react';

// Override the default render method with our custom one.
export { customRender as render };
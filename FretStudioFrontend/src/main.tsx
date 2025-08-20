import React from 'react';
import ReactDOM from 'react-dom/client';
import App from './App.tsx';
import './index.css';
import { BrowserRouter } from 'react-router-dom';
import { HandednessProvider } from './contexts/HandednessContext.tsx';
import { AccidentalTypeProvider } from './contexts/AccidentalTypeContext.tsx';
import { TuningProvider } from './contexts/TuningContext.tsx';
import { FingeringVisibilityProvider } from './contexts/FingeringVisibilityContext.tsx';
import { IntervalVisibilityProvider } from './contexts/IntervalVisibilityContext.tsx'; // 1. Import the new provider

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <BrowserRouter>
      <TuningProvider>
        <AccidentalTypeProvider>
          <HandednessProvider>
            <FingeringVisibilityProvider>
              <IntervalVisibilityProvider> {/* 2. Wrap the App component */}
                <App />
              </IntervalVisibilityProvider>
            </FingeringVisibilityProvider>
          </HandednessProvider>
        </AccidentalTypeProvider>
      </TuningProvider>
    </BrowserRouter>
  </React.StrictMode>,
)

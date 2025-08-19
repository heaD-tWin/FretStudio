import React from 'react';
import ReactDOM from 'react-dom/client';
import { BrowserRouter } from 'react-router-dom';
import App from './App';
import { HandednessProvider } from './contexts/HandednessContext';
import { AccidentalTypeProvider } from './contexts/AccidentalTypeContext';
import { TuningProvider } from './contexts/TuningContext';
import { FingeringVisibilityProvider } from './contexts/FingeringVisibilityContext'; // Import the new provider
import './index.css';

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <BrowserRouter>
      <HandednessProvider>
        <AccidentalTypeProvider>
          <TuningProvider>
            <FingeringVisibilityProvider> {/* Wrap the App with the new provider */}
              <App />
            </FingeringVisibilityProvider>
          </TuningProvider>
        </AccidentalTypeProvider>
      </HandednessProvider>
    </BrowserRouter>
  </React.StrictMode>
);

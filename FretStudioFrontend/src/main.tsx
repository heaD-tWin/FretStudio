import React from 'react';
import ReactDOM from 'react-dom/client';
import { HashRouter } from 'react-router-dom'; // Use HashRouter
import App from './App';
import './index.css';
import { HandednessProvider } from './contexts/HandednessContext';
import { AccidentalTypeProvider } from './contexts/AccidentalTypeContext';
import { TuningProvider } from './contexts/TuningContext';

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <HashRouter> {/* The single, top-level router */}
      <HandednessProvider>
        <AccidentalTypeProvider>
          <TuningProvider>
            <App />
          </TuningProvider>
        </AccidentalTypeProvider>
      </HandednessProvider>
    </HashRouter>
  </React.StrictMode>
);

import React from 'react'
import ReactDOM from 'react-dom/client'
import { BrowserRouter } from 'react-router-dom'
import App from './App.tsx'
import './index.css'
import { HandednessProvider } from './contexts/HandednessContext.tsx';

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <BrowserRouter>
      <HandednessProvider>
        <App />
      </HandednessProvider>
    </BrowserRouter>
  </React.StrictMode>,
)

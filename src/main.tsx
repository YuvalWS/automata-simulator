import React from 'react';
import ReactDOM from 'react-dom/client';
import App from './App';
import './index.css';
import { restoreTabsFromAutosave } from './hooks/use-autosave';

// Restore tabs from localStorage on startup
restoreTabsFromAutosave();

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>,
);

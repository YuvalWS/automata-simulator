import React from 'react';
import ReactDOM from 'react-dom/client';
import App from './App';
import './index.css';
import { AUTOSAVE_KEY } from './hooks/use-autosave';
import { deserializeFromJson } from './services/serialization/json-serializer';
import { useAutomatonStore } from './stores/automaton-store';

// Restore from localStorage on startup
try {
  const saved = localStorage.getItem(AUTOSAVE_KEY);
  if (saved) {
    const automaton = deserializeFromJson(saved);
    useAutomatonStore.getState().setAutomaton(automaton);
  }
} catch {
  localStorage.removeItem(AUTOSAVE_KEY);
}

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>,
);

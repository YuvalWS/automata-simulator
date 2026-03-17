import { useState, useEffect } from 'react';
import { useAutomatonStore } from '@/stores/automaton-store';
import { AutomatonType } from '@/models/types';

export function AutomatonProperties() {
  const automaton = useAutomatonStore((s) => s.automaton);
  const setName = useAutomatonStore((s) => s.setName);
  const setType = useAutomatonStore((s) => s.setType);
  const setAlphabet = useAutomatonStore((s) => s.setAlphabet);
  const [name, setLocalName] = useState(automaton.name);
  const [alphabetText, setAlphabetText] = useState(automaton.alphabet.join(', '));

  useEffect(() => {
    setLocalName(automaton.name);
    setAlphabetText(automaton.alphabet.join(', '));
  }, [automaton.name, automaton.alphabet, automaton.id]);

  const handleNameBlur = () => {
    if (name.trim()) setName(name.trim());
    else setLocalName(automaton.name);
  };

  const handleAlphabetBlur = () => {
    const symbols = alphabetText
      .split(',')
      .map((s) => s.trim())
      .filter(Boolean);
    setAlphabet([...new Set(symbols)]);
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') (e.target as HTMLInputElement).blur();
  };

  return (
    <div className="panel-section" data-testid="automaton-properties">
      <h3 className="panel-title">Automaton</h3>

      <label className="panel-field">
        <span className="panel-label">Name</span>
        <input
          type="text"
          className="panel-input"
          value={name}
          onChange={(e) => setLocalName(e.target.value)}
          onBlur={handleNameBlur}
          onKeyDown={handleKeyDown}
          data-testid="automaton-name-input"
        />
      </label>

      <label className="panel-field">
        <span className="panel-label">Type</span>
        <select
          className="panel-select"
          value={automaton.type}
          onChange={(e) => setType(e.target.value as AutomatonType)}
          data-testid="automaton-type-select"
        >
          <option value={AutomatonType.DFA}>DFA</option>
          <option value={AutomatonType.NFA}>NFA</option>
        </select>
      </label>

      <label className="panel-field">
        <span className="panel-label">Alphabet (comma-separated)</span>
        <input
          type="text"
          className="panel-input"
          value={alphabetText}
          onChange={(e) => setAlphabetText(e.target.value)}
          onBlur={handleAlphabetBlur}
          onKeyDown={handleKeyDown}
          placeholder="a, b, c"
          data-testid="automaton-alphabet-input"
        />
      </label>
    </div>
  );
}

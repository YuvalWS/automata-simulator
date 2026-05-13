import { useState, useEffect } from 'react';
import { useAutomatonStore } from '@/stores/automaton-store';
import { AutomatonType } from '@/models/types';
import type { AcceptanceMode, PdaStackMode, TmMode } from '@/models/types';

export function AutomatonProperties() {
  const automaton = useAutomatonStore((s) => s.automaton);
  const setName = useAutomatonStore((s) => s.setName);
  const setType = useAutomatonStore((s) => s.setType);
  const setAlphabet = useAutomatonStore((s) => s.setAlphabet);
  const setAcceptanceMode = useAutomatonStore((s) => s.setAcceptanceMode);
  const setPdaStackMode = useAutomatonStore((s) => s.setPdaStackMode);
  const setTmMode = useAutomatonStore((s) => s.setTmMode);
  const setTmBlankSymbol = useAutomatonStore((s) => s.setTmBlankSymbol);
  const [name, setLocalName] = useState(automaton.name);
  const [alphabetText, setAlphabetText] = useState(automaton.alphabet.join(', '));
  const [blankText, setBlankText] = useState(automaton.tmBlankSymbol ?? '_');

  useEffect(() => {
    setBlankText(automaton.tmBlankSymbol ?? '_');
  }, [automaton.tmBlankSymbol, automaton.id]);

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
          <option value={AutomatonType.PDA}>PDA</option>
          <option value={AutomatonType.TM}>TM</option>
        </select>
      </label>

      {automaton.type === AutomatonType.PDA && (
        <label className="panel-field">
          <span className="panel-label">Acceptance Mode</span>
          <select
            className="panel-select"
            value={automaton.acceptanceMode ?? 'finalState'}
            onChange={(e) => setAcceptanceMode(e.target.value as AcceptanceMode)}
            data-testid="pda-acceptance-mode-select"
          >
            <option value="finalState">Final State</option>
            <option value="emptyStack">Empty Stack</option>
          </select>
        </label>
      )}

      {automaton.type === AutomatonType.PDA && (
        <label className="panel-field">
          <span className="panel-label">Stack Mode</span>
          <select
            className="panel-select"
            value={automaton.pdaStackMode ?? 'pop'}
            onChange={(e) => setPdaStackMode(e.target.value as PdaStackMode)}
            data-testid="pda-stack-mode-select"
          >
            <option value="pop">Pop</option>
            <option value="peek">Peek</option>
          </select>
        </label>
      )}

      {automaton.type === AutomatonType.TM && (
        <>
          <label className="panel-field">
            <span className="panel-label">TM Mode</span>
            <select
              className="panel-select"
              value={automaton.tmMode ?? 'deterministic'}
              onChange={(e) => setTmMode(e.target.value as TmMode)}
              data-testid="tm-mode-select"
            >
              <option value="deterministic">Deterministic</option>
              <option value="nondeterministic">Nondeterministic</option>
            </select>
          </label>
          <label className="panel-field">
            <span className="panel-label">Acceptance Mode</span>
            <select
              className="panel-select"
              value={automaton.acceptanceMode ?? 'finalState'}
              onChange={(e) => setAcceptanceMode(e.target.value as AcceptanceMode)}
              data-testid="tm-acceptance-mode-select"
            >
              <option value="finalState">Final State</option>
              <option value="haltOnAccept">Halt on Accept</option>
            </select>
          </label>
          <label className="panel-field">
            <span className="panel-label">Blank Symbol</span>
            <input
              type="text"
              className="panel-input"
              maxLength={4}
              value={blankText}
              onChange={(e) => setBlankText(e.target.value)}
              onBlur={() => setTmBlankSymbol(blankText)}
              onKeyDown={handleKeyDown}
              data-testid="tm-blank-symbol-input"
            />
          </label>
        </>
      )}

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

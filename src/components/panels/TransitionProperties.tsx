import { useState, useEffect } from 'react';
import type { Transition } from '@/models/automaton';
import { useAutomatonStore } from '@/stores/automaton-store';

interface TransitionPropertiesProps {
  transition: Transition;
}

export function TransitionProperties({ transition }: TransitionPropertiesProps) {
  const updateTransition = useAutomatonStore((s) => s.updateTransition);
  const automaton = useAutomatonStore((s) => s.automaton);
  const [symbolsText, setSymbolsText] = useState(transition.symbols.join(', '));

  const source = automaton.states.find((s) => s.id === transition.sourceId);
  const target = automaton.states.find((s) => s.id === transition.targetId);

  useEffect(() => {
    setSymbolsText(transition.symbols.join(', '));
  }, [transition.symbols, transition.id]);

  const handleSymbolsBlur = () => {
    const symbols = symbolsText
      .split(',')
      .map((s) => s.trim())
      .filter(Boolean);
    if (symbols.length > 0) {
      updateTransition(transition.id, { symbols });
    } else {
      setSymbolsText(transition.symbols.join(', '));
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      (e.target as HTMLInputElement).blur();
    }
  };

  return (
    <div className="panel-section" data-testid="transition-properties">
      <h3 className="panel-title">Transition Properties</h3>

      <div className="panel-field">
        <span className="panel-label">From</span>
        <span className="panel-value">{source?.name ?? 'unknown'}</span>
      </div>

      <div className="panel-field">
        <span className="panel-label">To</span>
        <span className="panel-value">{target?.name ?? 'unknown'}</span>
      </div>

      <label className="panel-field">
        <span className="panel-label">Symbols (comma-separated)</span>
        <input
          type="text"
          className="panel-input"
          value={symbolsText}
          onChange={(e) => setSymbolsText(e.target.value)}
          onBlur={handleSymbolsBlur}
          onKeyDown={handleKeyDown}
          data-testid="transition-symbols-input"
        />
      </label>

      {transition.sourceId === transition.targetId && (
        <div className="panel-field">
          <span className="panel-label panel-note">Self-loop</span>
        </div>
      )}
    </div>
  );
}

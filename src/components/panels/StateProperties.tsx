import { useState, useEffect } from 'react';
import type { AutomatonState } from '@/models/automaton';
import { useAutomatonStore } from '@/stores/automaton-store';

interface StatePropertiesProps {
  state: AutomatonState;
}

export function StateProperties({ state }: StatePropertiesProps) {
  const updateState = useAutomatonStore((s) => s.updateState);
  const setInitialState = useAutomatonStore((s) => s.setInitialState);
  const toggleAccepting = useAutomatonStore((s) => s.toggleAccepting);
  const [name, setName] = useState(state.name);

  useEffect(() => {
    setName(state.name);
  }, [state.name, state.id]);

  const handleNameBlur = () => {
    if (name.trim() && name !== state.name) {
      updateState(state.id, { name: name.trim() });
    } else {
      setName(state.name);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      (e.target as HTMLInputElement).blur();
    }
  };

  return (
    <div className="panel-section" data-testid="state-properties">
      <h3 className="panel-title">State Properties</h3>

      <label className="panel-field">
        <span className="panel-label">Name</span>
        <input
          type="text"
          className="panel-input"
          value={name}
          onChange={(e) => setName(e.target.value)}
          onBlur={handleNameBlur}
          onKeyDown={handleKeyDown}
          data-testid="state-name-input"
        />
      </label>

      <label className="panel-field panel-checkbox">
        <input
          type="checkbox"
          checked={state.isInitial}
          onChange={() => setInitialState(state.id)}
          data-testid="state-initial-checkbox"
        />
        <span>Initial State</span>
      </label>

      <label className="panel-field panel-checkbox">
        <input
          type="checkbox"
          checked={state.isAccepting}
          onChange={() => toggleAccepting(state.id)}
          data-testid="state-accepting-checkbox"
        />
        <span>Accepting State</span>
      </label>

      <div className="panel-field">
        <span className="panel-label">Position</span>
        <span className="panel-value">
          ({Math.round(state.position.x)}, {Math.round(state.position.y)})
        </span>
      </div>
    </div>
  );
}

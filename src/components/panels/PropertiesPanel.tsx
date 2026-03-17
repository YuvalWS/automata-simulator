import { useEditorStore } from '@/stores/editor-store';
import { useAutomatonStore } from '@/stores/automaton-store';
import { StateProperties } from './StateProperties';
import { TransitionProperties } from './TransitionProperties';
import { AutomatonProperties } from './AutomatonProperties';
import './PropertiesPanel.css';

export function PropertiesPanel() {
  const selection = useEditorStore((s) => s.selection);
  const automaton = useAutomatonStore((s) => s.automaton);

  const selectedState = selection?.type === 'state'
    ? automaton.states.find((s) => s.id === selection.id)
    : null;

  const selectedTransition = selection?.type === 'transition'
    ? automaton.transitions.find((t) => t.id === selection.id)
    : null;

  return (
    <div className="properties-panel" data-testid="properties-panel">
      <AutomatonProperties />

      {selectedState && (
        <StateProperties state={selectedState} />
      )}

      {selectedTransition && (
        <TransitionProperties transition={selectedTransition} />
      )}

      {!selectedState && !selectedTransition && (
        <div className="panel-section">
          <div className="panel-hint">
            Select a state or transition to edit its properties.
          </div>
        </div>
      )}

      <div className="panel-section">
        <h3 className="panel-title">Stats</h3>
        <div className="panel-stats">
          <span>States: {automaton.states.length}</span>
          <span>Transitions: {automaton.transitions.length}</span>
        </div>
      </div>
    </div>
  );
}

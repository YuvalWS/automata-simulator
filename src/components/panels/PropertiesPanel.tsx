import { useEditorStore } from '@/stores/editor-store';
import { useAutomatonStore } from '@/stores/automaton-store';
import { StateProperties } from './StateProperties';
import { TransitionProperties } from './TransitionProperties';
import { AutomatonProperties } from './AutomatonProperties';
import './PropertiesPanel.css';

export function PropertiesPanel() {
  const selection = useEditorStore((s) => s.selection);
  const automaton = useAutomatonStore((s) => s.automaton);

  const singleSel = selection.length === 1 ? selection[0]! : null;

  const selectedState = singleSel?.type === 'state'
    ? automaton.states.find((s) => s.id === singleSel.id)
    : null;

  const selectedTransition = singleSel?.type === 'transition'
    ? automaton.transitions.find((t) => t.id === singleSel.id)
    : null;

  const multiCount = selection.length > 1 ? selection.length : 0;

  return (
    <div className="properties-panel" data-testid="properties-panel">
      <AutomatonProperties />

      {selectedState && (
        <StateProperties state={selectedState} />
      )}

      {selectedTransition && (
        <TransitionProperties transition={selectedTransition} />
      )}

      {multiCount > 0 && (
        <div className="panel-section">
          <div className="panel-hint">
            {multiCount} elements selected
          </div>
        </div>
      )}

      {!selectedState && !selectedTransition && multiCount === 0 && (
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

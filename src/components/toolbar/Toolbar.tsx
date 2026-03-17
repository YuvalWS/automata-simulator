import { useEditorStore } from '@/stores/editor-store';
import { useAutomatonStore } from '@/stores/automaton-store';
import { useHistoryStore } from '@/stores/history-store';
import { saveToJsonFile, loadFromJsonFile } from '@/services/serialization/file-io';
import { clearAutosave } from '@/hooks/use-autosave';
import './Toolbar.css';

export function Toolbar() {
  const setDirty = useEditorStore((s) => s.setDirty);
  const startPlacingState = useEditorStore((s) => s.startPlacingState);
  const placingNewState = useEditorStore((s) => s.placingNewState);
  const automaton = useAutomatonStore((s) => s.automaton);
  const setAutomaton = useAutomatonStore((s) => s.setAutomaton);
  const newAutomaton = useAutomatonStore((s) => s.newAutomaton);
  const undo = useAutomatonStore((s) => s.undo);
  const redo = useAutomatonStore((s) => s.redo);
  const hasPast = useHistoryStore((s) => s.past.length > 0);
  const hasFuture = useHistoryStore((s) => s.future.length > 0);

  const handleNew = () => {
    if (automaton.states.length > 0 && !confirm('Create new automaton? Unsaved changes will be lost.')) {
      return;
    }
    newAutomaton();
    clearAutosave();
    setDirty(false);
  };

  const handleSave = () => {
    saveToJsonFile(automaton);
    setDirty(false);
  };

  const handleLoad = async () => {
    const loaded = await loadFromJsonFile();
    if (loaded) {
      setAutomaton(loaded);
      setDirty(false);
    }
  };

  return (
    <div className="toolbar" data-testid="toolbar">
      <div className="toolbar-group">
        <button className="toolbar-btn" onClick={handleNew} title="New Automaton (Ctrl+N)">
          New
        </button>
        <span className="toolbar-separator" />
        <button className="toolbar-btn" onClick={handleSave} title="Save (Ctrl+S)">
          Save
        </button>
        <button className="toolbar-btn" onClick={handleLoad} title="Load (Ctrl+O)">
          Load
        </button>
        <span className="toolbar-separator" />
        <button
          className="toolbar-btn"
          onClick={undo}
          disabled={!hasPast}
          title="Undo (Ctrl+Z)"
        >
          Undo
        </button>
        <button
          className="toolbar-btn"
          onClick={redo}
          disabled={!hasFuture}
          title="Redo (Ctrl+Shift+Z)"
        >
          Redo
        </button>
      </div>

      <div className="toolbar-group toolbar-actions">
        <button
          className={`toolbar-btn toolbar-new-state ${placingNewState ? 'active' : ''}`}
          onClick={() => startPlacingState()}
          title="Add New State — click canvas to place (N)"
        >
          <span className="tool-icon">+</span>
          <span className="tool-label">New State</span>
        </button>
      </div>

      <div className="toolbar-group toolbar-info">
        <span className="automaton-type-badge">{automaton.type}</span>
        <span className="automaton-name">{automaton.name}</span>
      </div>
    </div>
  );
}

import { useEditorStore } from '@/stores/editor-store';
import { useAutomatonStore } from '@/stores/automaton-store';
import { useHistoryStore } from '@/stores/history-store';
import { useSimulationStore } from '@/stores/simulation-store';
import { saveToJsonFile, loadFromJsonFile, clearFileHandle } from '@/services/serialization/file-io';
import { clearAutosave } from '@/hooks/use-autosave';
import { useTheme } from '@/hooks/use-theme';
import { computeFitViewport } from '@/utils/fit-viewport';
import { exportAutomatonAsPng } from '@/services/export/png-export';
import './Toolbar.css';

export function Toolbar() {
  const setDirty = useEditorStore((s) => s.setDirty);
  const startPlacingState = useEditorStore((s) => s.startPlacingState);
  const placingNewState = useEditorStore((s) => s.placingNewState);
  const automaton = useAutomatonStore((s) => s.automaton);
  const setAutomaton = useAutomatonStore((s) => s.setAutomaton);
  const setViewport = useAutomatonStore((s) => s.setViewport);
  const newAutomaton = useAutomatonStore((s) => s.newAutomaton);
  const undo = useAutomatonStore((s) => s.undo);
  const redo = useAutomatonStore((s) => s.redo);
  const hasPast = useHistoryStore((s) => s.past.length > 0);
  const hasFuture = useHistoryStore((s) => s.future.length > 0);
  const simIsActive = useSimulationStore((s) => s.isActive);
  const enterSimulation = useSimulationStore((s) => s.enterSimulation);
  const exitSimulation = useSimulationStore((s) => s.exitSimulation);
  const { theme, toggleTheme } = useTheme();

  const { panX, panY, zoom } = automaton.viewport;

  const handleNew = () => {
    if (automaton.states.length > 0 && !confirm('Create new automaton? Unsaved changes will be lost.')) {
      return;
    }
    newAutomaton();
    clearAutosave();
    clearFileHandle();
    setDirty(false);
  };

  const handleSave = () => {
    saveToJsonFile(automaton);
    setDirty(false);
  };

  const handleExportPng = async () => {
    const svg = document.querySelector('.automata-canvas') as SVGSVGElement | null;
    if (!svg) return;
    try {
      await exportAutomatonAsPng(svg, automaton.states);
    } catch {
      // Export failed silently
    }
  };

  const handleLoad = async () => {
    const loaded = await loadFromJsonFile();
    if (loaded) {
      setAutomaton(loaded);
      setDirty(false);
    }
  };

  const handleFitToContent = () => {
    const svg = document.querySelector('.automata-canvas');
    if (!svg) return;
    const rect = svg.getBoundingClientRect();
    setViewport(computeFitViewport(automaton.states, rect.width, rect.height));
  };

  const handleZoom = (factor: number) => {
    const newZoom = Math.max(0.2, Math.min(5, zoom * factor));
    // Zoom relative to canvas center (approximate using viewport)
    const svg = document.querySelector('.automata-canvas');
    if (!svg) {
      setViewport({ panX, panY, zoom: newZoom });
      return;
    }
    const rect = svg.getBoundingClientRect();
    const cx = rect.width / 2;
    const cy = rect.height / 2;
    setViewport({
      panX: cx - (cx - panX) * (newZoom / zoom),
      panY: cy - (cy - panY) * (newZoom / zoom),
      zoom: newZoom,
    });
  };

  return (
    <div className="toolbar" data-testid="toolbar">
      <div className="toolbar-group">
        <button className="toolbar-btn" onClick={handleNew} disabled={simIsActive} title="New Automaton (Ctrl+N)">
          New
        </button>
        <span className="toolbar-separator" />
        <button className="toolbar-btn" onClick={handleSave} title="Save (Ctrl+S)">
          Save
        </button>
        <button className="toolbar-btn" onClick={handleLoad} disabled={simIsActive} title="Load (Ctrl+O)">
          Load
        </button>
        <button
          className="toolbar-btn"
          onClick={handleExportPng}
          disabled={automaton.states.length === 0}
          title="Export as PNG"
        >
          PNG
        </button>
        <span className="toolbar-separator" />
        <button
          className="toolbar-btn"
          onClick={undo}
          disabled={!hasPast || simIsActive}
          title="Undo (Ctrl+Z)"
        >
          Undo
        </button>
        <button
          className="toolbar-btn"
          onClick={redo}
          disabled={!hasFuture || simIsActive}
          title="Redo (Ctrl+Shift+Z)"
        >
          Redo
        </button>
      </div>

      <div className="toolbar-group toolbar-actions">
        {!simIsActive && (
          <button
            className={`toolbar-btn toolbar-new-state ${placingNewState ? 'active' : ''}`}
            onClick={() => startPlacingState()}
            title="Add New State — click canvas to place (N)"
          >
            <span className="tool-icon">+</span>
            <span className="tool-label">New State</span>
          </button>
        )}
        <button
          className={`toolbar-btn ${simIsActive ? 'toolbar-simulate-active' : 'toolbar-simulate'}`}
          onClick={simIsActive ? exitSimulation : enterSimulation}
          title={simIsActive ? 'Exit Simulation (Escape)' : 'Simulate Word'}
        >
          <span className="tool-label">{simIsActive ? 'Exit Sim' : 'Simulate'}</span>
        </button>
      </div>

      <div className="toolbar-group toolbar-zoom">
        <button className="toolbar-btn toolbar-zoom-btn" onClick={() => handleZoom(1 / 1.25)} title="Zoom Out">
          −
        </button>
        <span className="toolbar-zoom-display" title="Click to reset zoom" onClick={() => handleZoom(1 / zoom)}>
          {Math.round(zoom * 100)}%
        </span>
        <button className="toolbar-btn toolbar-zoom-btn" onClick={() => handleZoom(1.25)} title="Zoom In">
          +
        </button>
        <button
          className="toolbar-btn toolbar-zoom-btn"
          onClick={handleFitToContent}
          disabled={automaton.states.length === 0}
          title="Fit to Content"
        >
          Fit
        </button>
      </div>

      <div className="toolbar-group toolbar-info">
        <button className="toolbar-btn toolbar-theme-btn" onClick={toggleTheme} title="Toggle dark/light mode">
          {theme === 'light' ? '\u263E' : '\u2600'}
        </button>
        <span className="automaton-type-badge">{automaton.type}</span>
        <span className="automaton-name">{automaton.name}</span>
      </div>
    </div>
  );
}

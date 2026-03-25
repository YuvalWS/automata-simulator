import { useEditorStore } from '@/stores/editor-store';
import { useAutomatonStore } from '@/stores/automaton-store';
import { useHistoryStore } from '@/stores/history-store';
import { useSimulationStore } from '@/stores/simulation-store';
import { useTheme } from '@/hooks/use-theme';
import { useViewport } from '@/hooks/use-viewport';
import { useFileOperations } from '@/hooks/use-file-operations';
import { computeFitViewport } from '@/utils/fit-viewport';
import { HamburgerMenu } from '@/components/mobile/HamburgerMenu';
import { TabDropdown } from '@/components/mobile/TabDropdown';
import './Toolbar.css';

export function Toolbar() {
  const startPlacingState = useEditorStore((s) => s.startPlacingState);
  const placingNewState = useEditorStore((s) => s.placingNewState);
  const automaton = useAutomatonStore((s) => s.automaton);
  const setViewport = useAutomatonStore((s) => s.setViewport);
  const undo = useAutomatonStore((s) => s.undo);
  const redo = useAutomatonStore((s) => s.redo);
  const hasPast = useHistoryStore((s) => s.past.length > 0);
  const hasFuture = useHistoryStore((s) => s.future.length > 0);
  const simIsActive = useSimulationStore((s) => s.isActive);
  const enterSimulation = useSimulationStore((s) => s.enterSimulation);
  const exitSimulation = useSimulationStore((s) => s.exitSimulation);
  const { theme, toggleTheme } = useTheme();
  const { isPhone, isDesktop } = useViewport();
  const { handleNew, handleSave, handleLoad, handleExportPng } = useFileOperations();

  const { panX, panY, zoom } = automaton.viewport;

  const handleFitToContent = () => {
    const svg = document.querySelector('.automata-canvas');
    if (!svg) return;
    const rect = svg.getBoundingClientRect();
    setViewport(computeFitViewport(automaton.states, rect.width, rect.height));
  };

  const handleZoom = (factor: number) => {
    const newZoom = Math.max(0.2, Math.min(5, zoom * factor));
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

  // Phone: slim top bar with hamburger + tab dropdown + badge
  if (isPhone) {
    return (
      <div className="toolbar toolbar-phone" data-testid="toolbar">
        <HamburgerMenu />
        <TabDropdown />
        <span className="automaton-type-badge">{automaton.type}</span>
      </div>
    );
  }

  // Tablet: condensed toolbar with hamburger
  if (!isDesktop) {
    return (
      <div className="toolbar toolbar-tablet" data-testid="toolbar">
        <HamburgerMenu />
        <div className="toolbar-group">
          <button className="toolbar-btn" onClick={undo} disabled={!hasPast || simIsActive} title="Undo">
            Undo
          </button>
          <button className="toolbar-btn" onClick={redo} disabled={!hasFuture || simIsActive} title="Redo">
            Redo
          </button>
        </div>

        <div className="toolbar-group toolbar-actions">
          {!simIsActive && (
            <button
              className={`toolbar-btn toolbar-new-state ${placingNewState ? 'active' : ''}`}
              onClick={() => startPlacingState()}
              title="Add New State"
            >
              <span className="tool-icon">+</span>
              <span className="tool-label">New State</span>
            </button>
          )}
          <button
            className={`toolbar-btn ${simIsActive ? 'toolbar-simulate-active' : 'toolbar-simulate'}`}
            onClick={simIsActive ? exitSimulation : enterSimulation}
          >
            <span className="tool-label">{simIsActive ? 'Exit Sim' : 'Simulate'}</span>
          </button>
        </div>

        <div className="toolbar-group toolbar-zoom">
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

  // Desktop: full toolbar (unchanged)
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
        <button className="toolbar-btn" onClick={undo} disabled={!hasPast || simIsActive} title="Undo (Ctrl+Z)">
          Undo
        </button>
        <button className="toolbar-btn" onClick={redo} disabled={!hasFuture || simIsActive} title="Redo (Ctrl+Shift+Z)">
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

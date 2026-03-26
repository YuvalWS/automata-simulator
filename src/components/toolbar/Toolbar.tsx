import { useEditorStore } from '@/stores/editor-store';
import { useAutomatonStore } from '@/stores/automaton-store';
import { useHistoryStore } from '@/stores/history-store';
import { useSimulationStore } from '@/stores/simulation-store';
import { useTheme } from '@/hooks/use-theme';
import { useViewport } from '@/hooks/use-viewport';
import { useFileOperations } from '@/hooks/use-file-operations';
import { HamburgerMenu } from '@/components/mobile/HamburgerMenu';
import { TabDropdown } from '@/components/mobile/TabDropdown';
import './Toolbar.css';

export function Toolbar() {
  const startPlacingState = useEditorStore((s) => s.startPlacingState);
  const placingNewState = useEditorStore((s) => s.placingNewState);
  const automaton = useAutomatonStore((s) => s.automaton);
  const undo = useAutomatonStore((s) => s.undo);
  const redo = useAutomatonStore((s) => s.redo);
  const hasPast = useHistoryStore((s) => s.past.length > 0);
  const hasFuture = useHistoryStore((s) => s.future.length > 0);
  const simIsActive = useSimulationStore((s) => s.isActive);
  const enterSimulation = useSimulationStore((s) => s.enterSimulation);
  const exitSimulation = useSimulationStore((s) => s.exitSimulation);
  const { theme, toggleTheme } = useTheme();
  const { isPhone, isDesktop, isMobile, uiMode, setUiMode } = useViewport();
  const { handleNew, handleSave, handleLoad, handleExportPng } = useFileOperations();

  const toggleUiMode = () => {
    if (uiMode === 'auto') {
      setUiMode(isMobile ? 'desktop' : 'touch');
    } else {
      setUiMode('auto');
    }
  };
  const isUiOverridden = uiMode !== 'auto';
  const uiModeTitle = isUiOverridden
    ? `Input: ${uiMode === 'touch' ? 'Touch' : 'Desktop'} (click to reset)`
    : `Input: Auto (${isMobile ? 'Touch' : 'Desktop'})`;

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

        <div className="toolbar-group toolbar-info">
          <button
            className={`toolbar-btn toolbar-toggle-btn ${isUiOverridden ? 'toolbar-toggle-active' : ''}`}
            onClick={toggleUiMode}
            title={uiModeTitle}
          >
            {isMobile || uiMode === 'touch' ? '\uD83D\uDC46' : '\uD83D\uDDB1\uFE0F'}
          </button>
          <button className="toolbar-btn toolbar-toggle-btn" onClick={toggleTheme} title="Toggle dark/light mode">
            {theme === 'light' ? '\u263E' : '\u2600'}
          </button>
          <span className="automaton-type-badge">{automaton.type}</span>
          <span className="automaton-name">{automaton.name}</span>
        </div>
      </div>
    );
  }

  // Desktop: full toolbar
  return (
    <div className="toolbar" data-testid="toolbar">
      <div className="toolbar-group">
        <button className="toolbar-btn toolbar-icon-btn" onClick={handleNew} disabled={simIsActive} title="New Automaton (Ctrl+N)">
          <svg width="16" height="16" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"><path d="M3 2h7l3 3v9H3z"/><path d="M8 6v5M5.5 8.5h5"/></svg>
        </button>
        <button className="toolbar-btn toolbar-icon-btn" onClick={handleSave} title="Save (Ctrl+S)">
          <svg width="16" height="16" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"><path d="M3 2h8l2 2v9H3z"/><path d="M5 2v4h5V2"/><path d="M5 14v-4h6v4"/></svg>
        </button>
        <button className="toolbar-btn toolbar-icon-btn" onClick={handleLoad} disabled={simIsActive} title="Load (Ctrl+O)">
          <svg width="16" height="16" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"><path d="M2 4h4l1.5 2H14v7H2z"/></svg>
        </button>
        <button className="toolbar-btn toolbar-icon-btn" onClick={handleExportPng} disabled={automaton.states.length === 0} title="Export as PNG">
          <svg width="16" height="16" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"><rect x="2" y="2" width="12" height="12" rx="1.5"/><circle cx="5.5" cy="5.5" r="1.2"/><path d="M2 11l3-3 2.5 2.5L10 8l4 4"/></svg>
        </button>
        <span className="toolbar-separator" />
        <button className="toolbar-btn toolbar-icon-btn" onClick={undo} disabled={!hasPast || simIsActive} title="Undo (Ctrl+Z)">
          <svg width="16" height="16" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"><path d="M4 5L1 8l3 3"/><path d="M1 8h8.5a3.5 3.5 0 010 7H8"/></svg>
        </button>
        <button className="toolbar-btn toolbar-icon-btn" onClick={redo} disabled={!hasFuture || simIsActive} title="Redo (Ctrl+Shift+Z)">
          <svg width="16" height="16" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"><path d="M12 5l3 3-3 3"/><path d="M15 8H6.5a3.5 3.5 0 000 7H8"/></svg>
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

      <div className="toolbar-group toolbar-info">
        <button
          className={`toolbar-btn toolbar-toggle-btn ${isUiOverridden ? 'toolbar-toggle-active' : ''}`}
          onClick={toggleUiMode}
          title={uiModeTitle}
        >
          {isMobile || uiMode === 'touch' ? '\uD83D\uDC46' : '\uD83D\uDDB1\uFE0F'}
        </button>
        <button className="toolbar-btn toolbar-toggle-btn" onClick={toggleTheme} title="Toggle dark/light mode">
          {theme === 'light' ? '\u263E' : '\u2600'}
        </button>
        <span className="automaton-type-badge">{automaton.type}</span>
        <span className="automaton-name">{automaton.name}</span>
      </div>
    </div>
  );
}

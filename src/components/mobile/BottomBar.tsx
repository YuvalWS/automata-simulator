import { useEditorStore } from '@/stores/editor-store';
import { useAutomatonStore } from '@/stores/automaton-store';
import { useHistoryStore } from '@/stores/history-store';
import { useSimulationStore, getCurrentSnapshot } from '@/stores/simulation-store';
import './BottomBar.css';

export function BottomBar() {
  const placingNewState = useEditorStore((s) => s.placingNewState);
  const startPlacingState = useEditorStore((s) => s.startPlacingState);
  const stopPlacingState = useEditorStore((s) => s.stopPlacingState);
  const selection = useEditorStore((s) => s.selection);
  const clearSelection = useEditorStore((s) => s.clearSelection);
  const undo = useAutomatonStore((s) => s.undo);
  const redo = useAutomatonStore((s) => s.redo);
  const removeState = useAutomatonStore((s) => s.removeState);
  const removeTransition = useAutomatonStore((s) => s.removeTransition);
  const hasPast = useHistoryStore((s) => s.past.length > 0);
  const hasFuture = useHistoryStore((s) => s.future.length > 0);
  const simIsActive = useSimulationStore((s) => s.isActive);
  const enterSimulation = useSimulationStore((s) => s.enterSimulation);
  const exitSimulation = useSimulationStore((s) => s.exitSimulation);
  const trace = useSimulationStore((s) => s.trace);
  const stepForward = useSimulationStore((s) => s.stepForward);
  const stepBackward = useSimulationStore((s) => s.stepBackward);
  const startAutoRun = useSimulationStore((s) => s.startAutoRun);
  const stopAutoRun = useSimulationStore((s) => s.stopAutoRun);
  const autoRunning = useSimulationStore((s) => s.autoRunning);
  const stopTrace = useSimulationStore((s) => s.stopTrace);
  const snapshot = getCurrentSnapshot(useSimulationStore.getState());

  const handleDelete = () => {
    for (const item of selection) {
      if (item.type === 'state') removeState(item.id);
      else if (item.type === 'transition') removeTransition(item.id);
    }
    clearSelection();
  };

  if (simIsActive) {
    return (
      <div className="bottom-bar" data-testid="bottom-bar">
        {trace ? (
          <>
            <button className="bottom-bar-btn" onClick={stepBackward} title="Step back">
              ◀
            </button>
            <button
              className="bottom-bar-btn bottom-bar-btn-primary"
              onClick={autoRunning ? stopAutoRun : startAutoRun}
              title={autoRunning ? 'Pause' : 'Auto-run'}
            >
              {autoRunning ? '⏸' : '▶▶'}
            </button>
            <button className="bottom-bar-btn" onClick={stepForward} title="Step forward">
              ▶
            </button>
            <button className="bottom-bar-btn" onClick={stopTrace} title="Reset">
              Reset
            </button>
          </>
        ) : (
          <span className="bottom-bar-hint">Enter a word in the panel to start</span>
        )}
        <button
          className="bottom-bar-btn bottom-bar-btn-danger"
          onClick={exitSimulation}
          title="Exit simulation"
        >
          Exit
        </button>
        {snapshot && (
          <span className={`bottom-bar-status bottom-bar-status-${snapshot.status}`}>
            {snapshot.status === 'running' ? '⏳' : snapshot.status === 'accepted' ? '✔' : '✘'}
          </span>
        )}
      </div>
    );
  }

  return (
    <div className="bottom-bar" data-testid="bottom-bar">
      <button
        className={`bottom-bar-btn ${placingNewState ? 'bottom-bar-btn-active' : 'bottom-bar-btn-primary'}`}
        onClick={() => (placingNewState ? stopPlacingState() : startPlacingState())}
        title="New State (tap canvas to place)"
      >
        + State
      </button>
      <button
        className="bottom-bar-btn bottom-bar-btn-accent"
        onClick={enterSimulation}
        title="Simulate"
      >
        Simulate
      </button>
      <button className="bottom-bar-btn" onClick={undo} disabled={!hasPast} title="Undo">
        ↩
      </button>
      <button className="bottom-bar-btn" onClick={redo} disabled={!hasFuture} title="Redo">
        ↪
      </button>
      <button
        className="bottom-bar-btn bottom-bar-btn-danger"
        onClick={handleDelete}
        disabled={selection.length === 0}
        title="Delete selected"
      >
        🗑
      </button>
    </div>
  );
}

import { useCallback } from 'react';
import { useSimulationStore, getCurrentSnapshot } from '@/stores/simulation-store';
import { useAutomatonStore } from '@/stores/automaton-store';
import { AutomatonType } from '@/models/types';
import { DEFAULT_BLANK_SYMBOL, toDisplayBlank } from '@/models/epsilon';
import { generateRandomWord } from '@/utils/random-word';
import './SimulationPanel.css';

export function SimulationPanel() {
  const wordInput = useSimulationStore((s) => s.wordInput);
  const setWordInput = useSimulationStore((s) => s.setWordInput);
  const startSimulation = useSimulationStore((s) => s.startSimulation);
  const exitSimulation = useSimulationStore((s) => s.exitSimulation);
  const stopTrace = useSimulationStore((s) => s.stopTrace);
  const stepForward = useSimulationStore((s) => s.stepForward);
  const stepBackward = useSimulationStore((s) => s.stepBackward);
  const goToStep = useSimulationStore((s) => s.goToStep);
  const startAutoRun = useSimulationStore((s) => s.startAutoRun);
  const stopAutoRun = useSimulationStore((s) => s.stopAutoRun);
  const autoRunning = useSimulationStore((s) => s.autoRunning);
  const autoRunSpeed = useSimulationStore((s) => s.autoRunSpeed);
  const setAutoRunSpeed = useSimulationStore((s) => s.setAutoRunSpeed);
  const trace = useSimulationStore((s) => s.trace);
  const currentStep = useSimulationStore((s) => s.currentStep);
  const word = useSimulationStore((s) => s.word);
  const validationMessages = useSimulationStore((s) => s.validationMessages);
  const batchMode = useSimulationStore((s) => s.batchMode);
  const setBatchMode = useSimulationStore((s) => s.setBatchMode);
  const batchInput = useSimulationStore((s) => s.batchInput);
  const setBatchInput = useSimulationStore((s) => s.setBatchInput);
  const runBatch = useSimulationStore((s) => s.runBatch);
  const batchResults = useSimulationStore((s) => s.batchResults);
  const clearBatchResults = useSimulationStore((s) => s.clearBatchResults);

  const automaton = useAutomatonStore((s) => s.automaton);
  const alphabet = automaton.alphabet;
  const setType = useAutomatonStore((s) => s.setType);
  const setTmMode = useAutomatonStore((s) => s.setTmMode);
  const reenterSimulation = useSimulationStore((s) => s.enterSimulation);
  const isTM = automaton.type === AutomatonType.TM;
  const blank = automaton.tmBlankSymbol && automaton.tmBlankSymbol.length > 0
    ? automaton.tmBlankSymbol
    : DEFAULT_BLANK_SYMBOL;

  const handleAction = useCallback(
    (key: string) => {
      if (key === 'switch-nfa') {
        setType(AutomatonType.NFA);
        reenterSimulation();
      } else if (key === 'switch-ntm') {
        setTmMode('nondeterministic');
        reenterSimulation();
      }
    },
    [setType, setTmMode, reenterSimulation],
  );
  const snapshot = getCurrentSnapshot(useSimulationStore.getState());
  const hasErrors = validationMessages.some((m) => m.type === 'error');

  const handleKeyDown = useCallback(
    (e: React.KeyboardEvent) => {
      if (e.key === 'Enter' && !batchMode) {
        e.preventDefault();
        startSimulation();
      }
    },
    [startSimulation, batchMode],
  );

  return (
    <div className="properties-panel simulation-panel">
      <div className="panel-section">
        <h3 className="panel-title">Simulation</h3>

        {/* Mode toggle */}
        <div className="sim-mode-toggle">
          <button
            className={`sim-mode-btn ${!batchMode ? 'sim-mode-btn-active' : ''}`}
            onClick={() => setBatchMode(false)}
          >
            Single
          </button>
          <button
            className={`sim-mode-btn ${batchMode ? 'sim-mode-btn-active' : ''}`}
            onClick={() => setBatchMode(true)}
          >
            Batch
          </button>
        </div>

        {/* Single word input */}
        {!batchMode && (
          <div className="sim-input-group">
            <label className="panel-label">Word (symbols)</label>
            <div className="sim-input-row">
              <input
                className="panel-input sim-word-input"
                value={wordInput}
                onChange={(e) => setWordInput(e.target.value)}
                onKeyDown={handleKeyDown}
                placeholder="e.g. a,b,a or aba"
                disabled={!!trace}
              />
              <button
                className="sim-btn sim-btn-random"
                onClick={() => setWordInput(generateRandomWord(alphabet).join(','))}
                disabled={!!trace || alphabet.length === 0}
                title={alphabet.length === 0 ? 'No alphabet defined — add transitions with symbols first' : 'Generate random word'}
              >
                Random
              </button>
              {!trace ? (
                <button
                  className="sim-btn sim-btn-primary"
                  onClick={startSimulation}
                  disabled={hasErrors && validationMessages.length > 0 && !wordInput}
                >
                  Run
                </button>
              ) : (
                <button className="sim-btn sim-btn-secondary" onClick={stopTrace}>
                  Reset
                </button>
              )}
            </div>
            <span className="sim-hint">Separate multi-char symbols with commas or spaces</span>
          </div>
        )}

        {/* Batch input */}
        {batchMode && (
          <div className="sim-input-group">
            <label className="panel-label">Words (one per line)</label>
            <textarea
              className="panel-input sim-batch-input"
              value={batchInput}
              onChange={(e) => setBatchInput(e.target.value)}
              placeholder={'aba\na,b,b\nbb\n(empty line = \u03B5)'}
              rows={6}
              disabled={!!batchResults}
            />
            <div className="sim-input-row">
              {!batchResults ? (
                <button className="sim-btn sim-btn-primary" style={{ flex: 1 }} onClick={runBatch}>
                  Run All
                </button>
              ) : (
                <button className="sim-btn sim-btn-secondary" style={{ flex: 1 }} onClick={clearBatchResults}>
                  Clear Results
                </button>
              )}
            </div>
            <span className="sim-hint">Same format as single mode: commas, spaces, or char-by-char</span>
          </div>
        )}
      </div>

      {/* Validation messages */}
      {validationMessages.length > 0 && (
        <div className="panel-section sim-validation">
          {validationMessages.map((msg, i) => (
            <div key={i} className={`sim-msg sim-msg-${msg.type}`}>
              <span className="sim-msg-icon">{msg.type === 'error' ? '\u2716' : '\u26A0'}</span>
              {msg.message}
              {msg.action && (
                <button
                  className="sim-msg-action"
                  onClick={() => handleAction(msg.action!.key)}
                >
                  {msg.action.label}
                </button>
              )}
            </div>
          ))}
          {alphabet.length === 0 && (
            <button className="sim-btn sim-btn-secondary sim-btn-back" onClick={exitSimulation}>
              Back to Editing
            </button>
          )}
        </div>
      )}

      {/* Batch results */}
      {batchMode && batchResults && (
        <div className="panel-section">
          <h3 className="panel-title">
            Results ({batchResults.filter((r) => r.status === 'accepted').length}/{batchResults.length} accepted)
          </h3>
          <div className="sim-batch-results">
            {batchResults.map((result, i) => (
              <div key={i} className={`sim-batch-row sim-batch-row-${result.status}`}>
                <span className="sim-batch-word">{result.wordDisplay}</span>
                <span className={`sim-batch-badge sim-batch-badge-${result.status}`}>
                  {result.status === 'accepted' ? '\u2714' : '\u2716'}
                </span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Trace controls (single mode only) */}
      {!batchMode && trace && (
        <>
          <div className="panel-section">
            <h3 className="panel-title">Step {currentStep} / {trace.snapshots.length - 1}</h3>

            {/* Word display with highlighted current symbol (DFA/NFA/PDA only — TM
                doesn't consume the word symbol-by-symbol). */}
            {word.length > 0 && (
              <div className="sim-word-display">
                {word.map((sym, i) => (
                  <span
                    key={i}
                    className={`sim-symbol ${
                      !isTM && snapshot && i === snapshot.symbolIndex
                        ? 'sim-symbol-current'
                        : !isTM && snapshot && i < snapshot.symbolIndex
                          ? 'sim-symbol-consumed'
                          : ''
                    }`}
                  >
                    {sym}
                  </span>
                ))}
              </div>
            )}

            {/* Status badge */}
            {snapshot && (
              <div className={`sim-status sim-status-${snapshot.status}`}>
                {snapshot.status === 'running' && 'Running...'}
                {snapshot.status === 'accepted' && 'Accepted'}
                {snapshot.status === 'rejected' && 'Rejected'}
                {snapshot.status === 'timeout' && 'Timeout (step cap reached)'}
              </div>
            )}

            {/* Active states */}
            {snapshot && snapshot.activeStateIds.length > 0 && (
              <div className="sim-active-states">
                <span className="panel-label">Active states:</span>
                <span className="sim-state-list">
                  {snapshot.activeStateIds.join(', ')}
                </span>
              </div>
            )}

            {/* PDA Stack visualization */}
            {snapshot && snapshot.configurations && snapshot.configurations.length > 0 && (
              <div className="sim-stack-section">
                <span className="panel-label">Configurations ({snapshot.configurations.length}):</span>
                <div className="sim-configs-list">
                  {snapshot.configurations.slice(0, 10).map((config, i) => {
                    const stateName = automaton.states.find((s) => s.id === config.stateId)?.name ?? '?';
                    return (
                      <div key={i} className="sim-config-item">
                        <span className="sim-config-state">{stateName}</span>
                        <span className="sim-config-stack" title={`Stack: [${config.stack.join(', ')}]`}>
                          [{config.stack.join(', ')}]
                        </span>
                      </div>
                    );
                  })}
                  {snapshot.configurations.length > 10 && (
                    <div className="sim-config-more">
                      and {snapshot.configurations.length - 10} more...
                    </div>
                  )}
                </div>
              </div>
            )}

            {/* TM Tape visualization */}
            {snapshot && snapshot.tmConfigurations && snapshot.tmConfigurations.length > 0 && (
              <div className="sim-tm-section" data-testid="sim-tm-section">
                <span className="panel-label">Configurations ({snapshot.tmConfigurations.length}):</span>
                <div className="sim-configs-list">
                  {snapshot.tmConfigurations.slice(0, 10).map((cfg, i) => {
                    const stateName = automaton.states.find((s) => s.id === cfg.stateId)?.name ?? '?';
                    const WINDOW = 15;
                    const half = Math.floor(WINDOW / 2);
                    const cells: { sym: string; isHead: boolean }[] = [];
                    for (let off = -half; off <= half; off++) {
                      const idx = cfg.headIndex + off;
                      const rawSym = idx >= 0 && idx < cfg.tape.length ? cfg.tape[idx]! : DEFAULT_BLANK_SYMBOL;
                      cells.push({ sym: toDisplayBlank(rawSym, blank), isHead: off === 0 });
                    }
                    return (
                      <div key={i} className="sim-tm-config">
                        <span className="sim-config-state">{stateName}</span>
                        <div className="sim-tm-tape" data-testid={i === 0 ? 'sim-tm-tape' : undefined}>
                          {cells.map((c, j) => (
                            <span
                              key={j}
                              className={`sim-tm-cell ${c.isHead ? 'sim-tm-cell-head' : ''}`}
                            >{c.sym}</span>
                          ))}
                        </div>
                      </div>
                    );
                  })}
                  {snapshot.tmConfigurations.length > 10 && (
                    <div className="sim-config-more">
                      and {snapshot.tmConfigurations.length - 10} more...
                    </div>
                  )}
                </div>
              </div>
            )}
          </div>

          <div className="panel-section">
            <h3 className="panel-title">Controls</h3>
            <div className="sim-controls">
              <button className="sim-btn sim-ctrl-btn" onClick={() => goToStep(0)} title="Go to start">
                {'\u23EE'}
              </button>
              <button className="sim-btn sim-ctrl-btn" onClick={stepBackward} title="Step back">
                {'\u25C0'}
              </button>
              <button
                className="sim-btn sim-ctrl-btn sim-ctrl-play"
                onClick={autoRunning ? stopAutoRun : startAutoRun}
                title={autoRunning ? 'Pause' : 'Auto-run'}
              >
                {autoRunning ? '\u23F8' : '\u25B6'}
              </button>
              <button className="sim-btn sim-ctrl-btn" onClick={stepForward} title="Step forward">
                {'\u25B6'}
              </button>
              <button
                className="sim-btn sim-ctrl-btn"
                onClick={() => goToStep(trace.snapshots.length - 1)}
                title="Go to end"
              >
                {'\u23ED'}
              </button>
            </div>

            <div className="sim-speed">
              <label className="panel-label">Speed: {autoRunSpeed}ms</label>
              <input
                type="range"
                min={100}
                max={2000}
                step={100}
                value={autoRunSpeed}
                onChange={(e) => setAutoRunSpeed(Number(e.target.value))}
                className="sim-speed-slider"
              />
            </div>
          </div>
        </>
      )}

      <div className="panel-section">
        <button className="sim-btn sim-btn-exit" onClick={exitSimulation}>
          Exit Simulation
        </button>
      </div>
    </div>
  );
}

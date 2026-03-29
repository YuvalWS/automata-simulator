import { useEffect, useRef, useState } from 'react';
import { useViewport } from '@/hooks/use-viewport';
import './ShortcutsTooltip.css';

const shortcuts = [
  { key: 'N', action: 'New State (click canvas to place)' },
  { key: 'Space', action: 'Toggle accepting (when state selected)' },
  { key: 'Delete', action: 'Delete selected element' },
  { key: 'Escape', action: 'Cancel / Exit simulation' },
  { key: 'Ctrl+Z', action: 'Undo' },
  { key: 'Ctrl+Shift+Z', action: 'Redo' },
  { key: 'Ctrl+S', action: 'Save to file' },
  { key: 'Ctrl+O', action: 'Load from file' },
  { key: 'Ctrl+A', action: 'Select all states' },
  { key: 'Ctrl+N', action: 'New automaton' },
  { key: 'Ctrl+T', action: 'New tab' },
  { key: 'Ctrl+W', action: 'Close tab' },
  { key: 'Ctrl+PgDn/PgUp', action: 'Switch tab' },
];

const simShortcuts = [
  { key: 'Space', action: 'Step forward / Run' },
  { key: 'Enter', action: 'Toggle auto-run' },
  { key: '\u2190 / \u2192', action: 'Step backward / forward' },
  { key: 'Escape', action: 'Exit simulation' },
];

const touchGestures = [
  { gesture: 'Tap', action: 'Select state or transition' },
  { gesture: 'Double-tap state', action: 'Create self-loop' },
  { gesture: 'Double-tap transition', action: 'Edit symbols' },
  { gesture: 'Long-press', action: 'Context menu (delete, toggle accepting/initial)' },
  { gesture: 'Drag state', action: 'Move state' },
  { gesture: 'Drag empty area', action: 'Pan canvas' },
  { gesture: 'Pinch', action: 'Zoom in/out' },
];

const desktopInstructions = [
  'Click "+ New State" or press N, then click the canvas to place a state.',
  'Click a state, then click another state within 3s to create a transition.',
  'Double-click a state to create a self-loop.',
  'Drag the arrow handle (appears on hover) from one state to another, or to empty space to create a new state.',
  'Double-click a transition to edit its symbols.',
  'Drag states to move them \u2014 they snap to alignment with other states.',
  'Shift+click states to add/remove from multi-selection. Shift+drag on canvas for rubber-band selection.',
  'Scroll to zoom, drag empty canvas to pan.',
  'Select element(s) and press Delete to remove them. Ctrl+A to select all.',
  'Click Simulate to enter simulation mode. Run auto-plays the trace.',
  'Use "Random" to generate a random word from the alphabet.',
  'Switch to Batch mode to test multiple words at once.',
  'Click "Fit" in the zoom controls to fit all states in view.',
  'Click the sun/moon icon to toggle dark mode.',
  'Click "PNG" to export the diagram as an image.',
  'Use the \u03B5 button in the transition editor to add epsilon transitions (NFA only).',
];

const mobileInstructions = [
  'Tap "+ State" in the bottom bar, then tap the canvas to place a state.',
  'Tap a state, then tap another state within 3s to create a transition.',
  'Double-tap a state to create a self-loop.',
  'Tap the arrow handle on a state to start a transition, then tap the target state.',
  'Double-tap a transition to edit its symbols.',
  'Drag states to move them \u2014 they snap to alignment with other states.',
  'Long-press a state or transition for a context menu (delete, toggle accepting/initial).',
  'Pinch to zoom, drag empty canvas to pan.',
  'Select an element and tap Delete in the bottom bar to remove it.',
  'Tap Simulate in the bottom bar to enter simulation mode.',
  'Use "Random" to generate a random word from the alphabet.',
  'Switch to Batch mode to test multiple words at once.',
  'Use the \u03B5 button in the transition editor to add epsilon transitions (NFA only).',
  'Open the hamburger menu to Save, Load, or Export PNG.',
  'Toggle dark mode or switch between touch/desktop UI from the hamburger menu.',
];

export function ShortcutsTooltip() {
  const [isOpen, setIsOpen] = useState(() => {
    return !localStorage.getItem('automata-help-seen');
  });

  const { isMobile } = useViewport();

  useEffect(() => {
    if (isOpen && !localStorage.getItem('automata-help-seen')) {
      localStorage.setItem('automata-help-seen', '1');
    }
  }, []);

  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!isOpen) return;
    function handleClick(e: MouseEvent | TouchEvent) {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setIsOpen(false);
      }
    }
    document.addEventListener('mousedown', handleClick);
    document.addEventListener('touchstart', handleClick);
    return () => {
      document.removeEventListener('mousedown', handleClick);
      document.removeEventListener('touchstart', handleClick);
    };
  }, [isOpen]);

  const instructions = isMobile ? mobileInstructions : desktopInstructions;

  return (
    <div className={`shortcuts-container ${isMobile ? 'shortcuts-container-mobile' : ''}`} ref={containerRef}>
      {isOpen && (
        <div className="shortcuts-panel">
          <button
            className="shortcuts-close"
            onClick={() => setIsOpen(false)}
            title="Close help"
          >
            ×
          </button>

          {!isMobile && (
            <>
              <div className="shortcuts-section">
                <h4 className="shortcuts-heading">Keyboard Shortcuts</h4>
                <table className="shortcuts-table">
                  <tbody>
                    {shortcuts.map((s) => (
                      <tr key={s.key}>
                        <td className="shortcut-key"><kbd>{s.key}</kbd></td>
                        <td className="shortcut-action">{s.action}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
              <div className="shortcuts-section">
                <h4 className="shortcuts-heading">During Simulation</h4>
                <table className="shortcuts-table">
                  <tbody>
                    {simShortcuts.map((s) => (
                      <tr key={s.key}>
                        <td className="shortcut-key"><kbd>{s.key}</kbd></td>
                        <td className="shortcut-action">{s.action}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </>
          )}

          {isMobile && (
            <div className="shortcuts-section">
              <h4 className="shortcuts-heading">Touch Gestures</h4>
              <table className="shortcuts-table">
                <tbody>
                  {touchGestures.map((g) => (
                    <tr key={g.gesture}>
                      <td className="shortcut-key"><kbd>{g.gesture}</kbd></td>
                      <td className="shortcut-action">{g.action}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}

          <div className="shortcuts-section">
            <h4 className="shortcuts-heading">How to Use</h4>
            <ul className="shortcuts-instructions">
              {instructions.map((instr, i) => (
                <li key={i}>{instr}</li>
              ))}
            </ul>
          </div>
          <div className="shortcuts-credits">
            <span>Created by </span>
            <a href="https://github.com/YuvalWS" target="_blank" rel="noopener noreferrer">Yuval Weiss</a>
            <span className="shortcuts-credits-sep">{' \u00B7 '}</span>
            <a href="https://github.com/YuvalWS/automata-simulator" target="_blank" rel="noopener noreferrer">Repo</a>
            <span className="shortcuts-credits-sep">{' \u00B7 '}</span>
            <a href="https://yuweiss.dev/" target="_blank" rel="noopener noreferrer">Blog</a>
          </div>
        </div>
      )}
      <button
        className="shortcuts-toggle"
        onClick={() => setIsOpen(!isOpen)}
        title={isMobile ? 'Touch gestures & help' : 'Keyboard shortcuts & help'}
      >
        ?
      </button>
    </div>
  );
}

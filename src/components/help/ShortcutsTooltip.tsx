import { useState } from 'react';
import './ShortcutsTooltip.css';

const shortcuts = [
  { key: 'N', action: 'New State (click canvas to place)' },
  { key: 'Delete', action: 'Delete selected element' },
  { key: 'Escape', action: 'Cancel / Exit simulation' },
  { key: 'Ctrl+Z', action: 'Undo' },
  { key: 'Ctrl+Shift+Z', action: 'Redo' },
  { key: 'Ctrl+S', action: 'Save to file' },
  { key: 'Ctrl+O', action: 'Load from file' },
  { key: 'Ctrl+N', action: 'New automaton' },
];

const simShortcuts = [
  { key: 'Space', action: 'Step forward / Run' },
  { key: 'Enter', action: 'Toggle auto-run' },
  { key: '\u2190 / \u2192', action: 'Step backward / forward' },
  { key: 'Escape', action: 'Exit simulation' },
];

const instructions = [
  'Click "+ New State" or press N, then click the canvas to place a state.',
  'Click a state, then click another state within 3s to create a transition.',
  'Double-click a state to create a self-loop.',
  'Drag the arrow handle (appears on hover) from one state to another.',
  'Double-click a transition to edit its symbols.',
  'Drag states to move them — they snap to alignment with other states.',
  'Scroll to zoom, drag empty canvas to pan.',
  'Select an element and press Delete to remove it.',
  'Click Simulate to enter simulation mode. Run auto-plays the trace.',
  'Use "Random" to generate a random word from the alphabet.',
  'Switch to Batch mode to test multiple words at once.',
  'Click "Fit" in the zoom controls to fit all states in view.',
  'Click the sun/moon icon to toggle dark mode.',
  'Click "PNG" to export the diagram as an image.',
  'Use the \u03B5 button in the transition editor to add epsilon transitions (NFA only).',
];

export function ShortcutsTooltip() {
  const [isOpen, setIsOpen] = useState(() => {
    const seen = localStorage.getItem('automata-help-seen');
    if (!seen) {
      localStorage.setItem('automata-help-seen', '1');
      return true;
    }
    return false;
  });

  return (
    <div className="shortcuts-container">
      {isOpen && (
        <div className="shortcuts-panel">
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
          <div className="shortcuts-section">
            <h4 className="shortcuts-heading">How to Use</h4>
            <ul className="shortcuts-instructions">
              {instructions.map((instr, i) => (
                <li key={i}>{instr}</li>
              ))}
            </ul>
          </div>
        </div>
      )}
      <button
        className="shortcuts-toggle"
        onClick={() => setIsOpen(!isOpen)}
        title="Keyboard shortcuts & help"
      >
        ?
      </button>
    </div>
  );
}

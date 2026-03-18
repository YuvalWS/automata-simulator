import { useState, useRef, useEffect } from 'react';
import { EPSILON } from '@/models/epsilon';
import './TransitionSymbolModal.css';

interface TransitionSymbolModalProps {
  position: { x: number; y: number };
  initialSymbols?: string[];
  onSubmit: (symbols: string[]) => void;
  onCancel: () => void;
}

export function TransitionSymbolModal({ position, initialSymbols, onSubmit, onCancel }: TransitionSymbolModalProps) {
  const [value, setValue] = useState(initialSymbols?.join(', ') ?? '');
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    inputRef.current?.focus();
    inputRef.current?.select();
  }, []);

  const handleSubmit = () => {
    const symbols = value.split(',').map((s) => s.trim()).filter(Boolean);
    if (symbols.length > 0) {
      onSubmit(symbols);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      handleSubmit();
    } else if (e.key === 'Escape') {
      e.preventDefault();
      onCancel();
    }
  };

  // Clamp position to viewport
  const x = Math.min(position.x, window.innerWidth - 260);
  const y = Math.min(position.y, window.innerHeight - 120);

  return (
    <div className="symbol-modal-overlay" onMouseDown={onCancel}>
      <div
        className="symbol-modal"
        style={{ left: x, top: y }}
        onMouseDown={(e) => e.stopPropagation()}
      >
        <div className="symbol-modal-title">
          {initialSymbols ? 'Edit Transition Symbols' : 'Enter Transition Symbols'}
        </div>
        <div className="symbol-modal-input-row">
          <input
            ref={inputRef}
            type="text"
            className="symbol-modal-input"
            value={value}
            onChange={(e) => setValue(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder={'a, b, ' + EPSILON}
          />
          <button
            type="button"
            className="symbol-modal-btn epsilon"
            onClick={() => setValue((v) => v.trim() ? `${v}, ${EPSILON}` : EPSILON)}
            title={'Add epsilon (' + EPSILON + ') transition'}
          >
            {'\u03B5'}
          </button>
        </div>
        <div className="symbol-modal-hint">{'Comma-separated. Use ' + EPSILON + ' for epsilon transitions. Enter to confirm.'}</div>
        <div className="symbol-modal-actions">
          <button className="symbol-modal-btn cancel" onClick={onCancel}>Cancel</button>
          <button className="symbol-modal-btn confirm" onClick={handleSubmit}>Confirm</button>
        </div>
      </div>
    </div>
  );
}

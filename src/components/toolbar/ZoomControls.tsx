import { useAutomatonStore } from '@/stores/automaton-store';
import { computeFitViewport } from '@/utils/fit-viewport';
import './ZoomControls.css';

export function ZoomControls() {
  const automaton = useAutomatonStore((s) => s.automaton);
  const setViewport = useAutomatonStore((s) => s.setViewport);
  const { panX, panY, zoom } = automaton.viewport;

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

  const handleFitToContent = () => {
    const svg = document.querySelector('.automata-canvas');
    if (!svg) return;
    const rect = svg.getBoundingClientRect();
    setViewport(computeFitViewport(automaton.states, rect.width, rect.height));
  };

  return (
    <div className="zoom-controls" data-testid="zoom-controls">
      <button className="zoom-controls-btn" onClick={() => handleZoom(1 / 1.25)} title="Zoom Out">
        −
      </button>
      <span
        className="zoom-controls-display"
        title="Click to reset zoom"
        onClick={() => handleZoom(1 / zoom)}
      >
        {Math.round(zoom * 100)}%
      </span>
      <button className="zoom-controls-btn" onClick={() => handleZoom(1.25)} title="Zoom In">
        +
      </button>
      <button
        className="zoom-controls-btn zoom-controls-fit"
        onClick={handleFitToContent}
        disabled={automaton.states.length === 0}
        title="Fit to Content"
      >
        Fit
      </button>
    </div>
  );
}

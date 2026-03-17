import type { AutomatonState } from '@/models/automaton';
import type { Viewport } from '@/models/geometry';

const STATE_RADIUS = 28;
const DEFAULT_PADDING = 40;

/**
 * Compute a viewport that fits all states within the given canvas dimensions.
 * Returns default viewport if no states exist.
 */
export function computeFitViewport(
  states: AutomatonState[],
  canvasWidth: number,
  canvasHeight: number,
  padding = DEFAULT_PADDING,
): Viewport {
  if (states.length === 0) {
    return { panX: 0, panY: 0, zoom: 1 };
  }

  const margin = STATE_RADIUS + padding;

  let minX = Infinity;
  let minY = Infinity;
  let maxX = -Infinity;
  let maxY = -Infinity;

  for (const s of states) {
    if (s.position.x < minX) minX = s.position.x;
    if (s.position.y < minY) minY = s.position.y;
    if (s.position.x > maxX) maxX = s.position.x;
    if (s.position.y > maxY) maxY = s.position.y;
  }

  const bboxWidth = maxX - minX + 2 * margin;
  const bboxHeight = maxY - minY + 2 * margin;

  const zoom = Math.max(0.2, Math.min(5, Math.min(canvasWidth / bboxWidth, canvasHeight / bboxHeight)));

  const centerX = (minX + maxX) / 2;
  const centerY = (minY + maxY) / 2;

  const panX = canvasWidth / 2 - centerX * zoom;
  const panY = canvasHeight / 2 - centerY * zoom;

  return { panX, panY, zoom };
}

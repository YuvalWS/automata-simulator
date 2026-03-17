import type { Point } from '@/models/geometry';
import type { AutomatonState } from '@/models/automaton';

const SNAP_THRESHOLD = 8;

export interface SnapGuide {
  axis: 'x' | 'y';
  position: number;
}

export function snapToAlignment(
  pos: Point,
  draggedId: string,
  states: AutomatonState[],
): Point {
  let snappedX = pos.x;
  let snappedY = pos.y;
  let bestDx = SNAP_THRESHOLD;
  let bestDy = SNAP_THRESHOLD;

  for (const s of states) {
    if (s.id === draggedId) continue;
    const dx = Math.abs(s.position.x - pos.x);
    const dy = Math.abs(s.position.y - pos.y);
    if (dx < bestDx) {
      bestDx = dx;
      snappedX = s.position.x;
    }
    if (dy < bestDy) {
      bestDy = dy;
      snappedY = s.position.y;
    }
  }

  return { x: snappedX, y: snappedY };
}

export function computeSnapGuides(
  pos: Point,
  draggedId: string,
  states: AutomatonState[],
): SnapGuide[] {
  const guides: SnapGuide[] = [];
  for (const s of states) {
    if (s.id === draggedId) continue;
    if (s.position.x === pos.x) guides.push({ axis: 'x', position: pos.x });
    if (s.position.y === pos.y) guides.push({ axis: 'y', position: pos.y });
  }
  return guides;
}

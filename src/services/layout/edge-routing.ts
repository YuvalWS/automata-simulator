import type { Point } from '@/models/geometry';
import type { AutomatonState, Transition } from '@/models/automaton';
import { perpendicular, normalize, scale, add, midpoint } from '@/utils/math';

const STATE_RADIUS = 28;
const PARALLEL_OFFSET = 25;
const LABEL_HEIGHT = 18;
const LABEL_CHAR_WIDTH = 9;
const LABEL_PADDING = 8;
const LABEL_GAP = 4;

export interface EdgePath {
  transitionId: string;
  startPoint: Point;
  endPoint: Point;
  controlPoint: Point;
  labelPosition: Point;
  labelWidth: number;
  isSelfLoop: boolean;
  selfLoopCp1?: Point;
  selfLoopCp2?: Point;
  path: string;
}

function computeLabelWidth(symbols: string[]): number {
  const label = symbols.join(', ');
  return label.length * LABEL_CHAR_WIDTH + LABEL_PADDING;
}

interface LabelRect {
  x: number;
  y: number;
  width: number;
  height: number;
}

function labelRect(pos: Point, width: number): LabelRect {
  return {
    x: pos.x - width / 2,
    y: pos.y - LABEL_HEIGHT / 2,
    width,
    height: LABEL_HEIGHT,
  };
}

function rectsOverlap(a: LabelRect, b: LabelRect): boolean {
  return (
    a.x < b.x + b.width &&
    a.x + a.width > b.x &&
    a.y < b.y + b.height &&
    a.y + a.height > b.y
  );
}

function resolveOverlaps(paths: EdgePath[]): void {
  for (let pass = 0; pass < 3; pass++) {
    let hadOverlap = false;
    for (let i = 0; i < paths.length; i++) {
      for (let j = i + 1; j < paths.length; j++) {
        const a = paths[i]!;
        const b = paths[j]!;
        const ra = labelRect(a.labelPosition, a.labelWidth);
        const rb = labelRect(b.labelPosition, b.labelWidth);

        if (rectsOverlap(ra, rb)) {
          hadOverlap = true;
          const nudgeTarget = a.isSelfLoop ? b : b.isSelfLoop ? a : b;
          const overlapY = Math.min(ra.y + ra.height, rb.y + rb.height) - Math.max(ra.y, rb.y);
          const nudgeAmount = overlapY + LABEL_GAP;

          if (nudgeTarget === b) {
            b.labelPosition = { ...b.labelPosition, y: b.labelPosition.y + nudgeAmount };
          } else {
            a.labelPosition = { ...a.labelPosition, y: a.labelPosition.y + nudgeAmount };
          }
        }
      }
    }
    if (!hadOverlap) break;
  }
}

/**
 * Compute the best angle for a self-loop by placing it opposite to the
 * average direction of all other edges connected to this state.
 * Returns the base angle in radians (0 = right, -PI/2 = top, PI/2 = bottom).
 */
function bestSelfLoopAngle(
  stateId: string,
  stateMap: Map<string, AutomatonState>,
  transitions: Transition[],
): number {
  const state = stateMap.get(stateId)!;
  const angles: number[] = [];

  for (const t of transitions) {
    if (t.sourceId === t.targetId) continue;
    if (t.sourceId === stateId) {
      const target = stateMap.get(t.targetId);
      if (target) {
        angles.push(Math.atan2(target.position.y - state.position.y, target.position.x - state.position.x));
      }
    }
    if (t.targetId === stateId) {
      const source = stateMap.get(t.sourceId);
      if (source) {
        angles.push(Math.atan2(source.position.y - state.position.y, source.position.x - state.position.x));
      }
    }
  }

  // If state is initial, treat the initial arrow (from left, angle π) as a connected edge
  if (state.isInitial) {
    angles.push(Math.PI);
  }

  if (angles.length === 0) return -Math.PI / 2; // default: top

  // Average angle of connected edges
  const avgAngle = Math.atan2(
    angles.reduce((s, a) => s + Math.sin(a), 0),
    angles.reduce((s, a) => s + Math.cos(a), 0),
  );

  // Place self-loop opposite to the average
  return avgAngle + Math.PI;
}

export function computeEdgePaths(
  states: AutomatonState[],
  transitions: Transition[],
): EdgePath[] {
  const stateMap = new Map(states.map((s) => [s.id, s]));
  const paths: EdgePath[] = [];

  const bidirectionalPairs = new Set<string>();
  for (const t of transitions) {
    const reverseExists = transitions.some(
      (other) => other.sourceId === t.targetId && other.targetId === t.sourceId,
    );
    if (reverseExists && t.sourceId !== t.targetId) {
      bidirectionalPairs.add([t.sourceId, t.targetId].sort().join('::'));
    }
  }

  // Compute fan-out offsets for edges sharing a source/target that go in similar directions
  const FAN_OFFSET = 15;
  const fanOffsets = new Map<string, number>(); // transition id -> offset

  // Group non-self-loop, non-bidirectional edges by source
  const edgesBySource = new Map<string, Transition[]>();
  for (const t of transitions) {
    if (t.sourceId === t.targetId) continue;
    const pairKey = [t.sourceId, t.targetId].sort().join('::');
    if (bidirectionalPairs.has(pairKey)) continue;
    const list = edgesBySource.get(t.sourceId) ?? [];
    list.push(t);
    edgesBySource.set(t.sourceId, list);
  }

  for (const [sourceId, group] of edgesBySource) {
    if (group.length < 2) continue;
    const source = stateMap.get(sourceId);
    if (!source) continue;

    // Sort by angle to target
    const sorted = group
      .map((t) => {
        const target = stateMap.get(t.targetId);
        if (!target) return null;
        const angle = Math.atan2(target.position.y - source.position.y, target.position.x - source.position.x);
        return { t, angle };
      })
      .filter((e): e is { t: Transition; angle: number } => e !== null)
      .sort((a, b) => a.angle - b.angle);

    // Apply offsets centered around 0 for the group
    for (let i = 0; i < sorted.length; i++) {
      const offset = (i - (sorted.length - 1) / 2) * FAN_OFFSET;
      fanOffsets.set(sorted[i]!.t.id, offset);
    }
  }

  for (const t of transitions) {
    const source = stateMap.get(t.sourceId);
    const target = stateMap.get(t.targetId);
    if (!source || !target) continue;

    if (t.sourceId === t.targetId) {
      const angle = bestSelfLoopAngle(t.sourceId, stateMap, transitions);
      paths.push(computeSelfLoop(t, source, angle));
    } else {
      const pairKey = [t.sourceId, t.targetId].sort().join('::');
      const isBidirectional = bidirectionalPairs.has(pairKey);
      const offsetDir = t.sourceId < t.targetId ? 1 : -1;
      const baseOffset = isBidirectional ? PARALLEL_OFFSET * offsetDir : 0;
      const fanOffset = fanOffsets.get(t.id) ?? 0;
      paths.push(
        computeEdge(t, source, target, baseOffset + fanOffset),
      );
    }
  }

  resolveOverlaps(paths);
  return paths;
}

function computeSelfLoop(
  transition: Transition,
  state: AutomatonState,
  baseAngle: number,
): EdgePath {
  const { x, y } = state.position;
  const r = STATE_RADIUS;
  const loopSize = 40;

  // Compute start/end angles relative to baseAngle
  const spread = Math.PI / 6; // 30 degrees each side
  const startAngle = baseAngle + spread;
  const endAngle = baseAngle - spread;

  const start = {
    x: x + r * Math.cos(startAngle),
    y: y + r * Math.sin(startAngle),
  };
  const end = {
    x: x + r * Math.cos(endAngle),
    y: y + r * Math.sin(endAngle),
  };

  // Control points extend outward from state center in the baseAngle direction
  const outDir = { x: Math.cos(baseAngle), y: Math.sin(baseAngle) };
  const perpDir = { x: -outDir.y, y: outDir.x };

  const cpDist = r + loopSize * 1.8;
  const cpSpread = loopSize * 1.5;

  const cp1 = {
    x: x + outDir.x * cpDist + perpDir.x * cpSpread,
    y: y + outDir.y * cpDist + perpDir.y * cpSpread,
  };
  const cp2 = {
    x: x + outDir.x * cpDist - perpDir.x * cpSpread,
    y: y + outDir.y * cpDist - perpDir.y * cpSpread,
  };

  const labelPos = {
    x: x + outDir.x * (r + loopSize * 1.6),
    y: y + outDir.y * (r + loopSize * 1.6),
  };

  const path = `M ${start.x} ${start.y} C ${cp1.x} ${cp1.y}, ${cp2.x} ${cp2.y}, ${end.x} ${end.y}`;

  return {
    transitionId: transition.id,
    startPoint: start,
    endPoint: end,
    controlPoint: { x: (cp1.x + cp2.x) / 2, y: (cp1.y + cp2.y) / 2 },
    labelPosition: labelPos,
    labelWidth: computeLabelWidth(transition.symbols),
    isSelfLoop: true,
    selfLoopCp1: cp1,
    selfLoopCp2: cp2,
    path,
  };
}

function computeEdge(
  transition: Transition,
  source: AutomatonState,
  target: AutomatonState,
  offset: number,
): EdgePath {
  const canonicalSource = source.id < target.id ? source : target;
  const canonicalTarget = source.id < target.id ? target : source;
  const canonDir = normalize({
    x: canonicalTarget.position.x - canonicalSource.position.x,
    y: canonicalTarget.position.y - canonicalSource.position.y,
  });
  const perp = perpendicular(canonDir);

  const manualOffset = transition.controlPointOffset ?? { x: 0, y: 0 };
  const mid = midpoint(source.position, target.position);
  const controlPoint = add(
    add(mid, scale(perp, offset)),
    manualOffset,
  );

  const startAngle = Math.atan2(
    controlPoint.y - source.position.y,
    controlPoint.x - source.position.x,
  );
  const endAngle = Math.atan2(
    controlPoint.y - target.position.y,
    controlPoint.x - target.position.x,
  );

  const startPoint = {
    x: source.position.x + STATE_RADIUS * Math.cos(startAngle),
    y: source.position.y + STATE_RADIUS * Math.sin(startAngle),
  };
  const endPoint = {
    x: target.position.x + STATE_RADIUS * Math.cos(endAngle),
    y: target.position.y + STATE_RADIUS * Math.sin(endAngle),
  };

  const hasOffset = Math.abs(offset) > 0 || (manualOffset.x !== 0 || manualOffset.y !== 0);
  const labelOffset = hasOffset ? 0 : -12;

  const labelPosition = {
    x: 0.25 * startPoint.x + 0.5 * controlPoint.x + 0.25 * endPoint.x,
    y: 0.25 * startPoint.y + 0.5 * controlPoint.y + 0.25 * endPoint.y + labelOffset,
  };

  const pathStr = `M ${startPoint.x} ${startPoint.y} Q ${controlPoint.x} ${controlPoint.y}, ${endPoint.x} ${endPoint.y}`;

  return {
    transitionId: transition.id,
    startPoint,
    endPoint,
    controlPoint,
    labelPosition,
    labelWidth: computeLabelWidth(transition.symbols),
    isSelfLoop: false,
    path: pathStr,
  };
}

export function computeInitialArrowPath(state: AutomatonState): string {
  const x = state.position.x - STATE_RADIUS;
  const y = state.position.y;
  const arrowLen = 40;
  return `M ${x - arrowLen} ${y} L ${x} ${y}`;
}

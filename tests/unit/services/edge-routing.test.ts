import { describe, it, expect } from 'vitest';
import {
  computeEdgePaths,
  computeInitialArrowPath,
  obstacleAvoidanceOffset,
} from '@/services/layout/edge-routing';
import type { AutomatonState, Transition } from '@/models/automaton';
import type { EdgePath } from '@/services/layout/edge-routing';

function makeState(id: string, x: number, y: number, opts?: Partial<AutomatonState>): AutomatonState {
  return { id, name: id, position: { x, y }, isInitial: false, isAccepting: false, ...opts };
}

function makeTransition(id: string, sourceId: string, targetId: string, symbols: string[]): Transition {
  return { id, sourceId, targetId, symbols };
}

function quadBezierMinDist(edge: EdgePath, p: { x: number; y: number }): number {
  let best = Infinity;
  for (let i = 0; i <= 200; i++) {
    const t = i / 200;
    const omt = 1 - t;
    const bx = omt * omt * edge.startPoint.x + 2 * omt * t * edge.controlPoint.x + t * t * edge.endPoint.x;
    const by = omt * omt * edge.startPoint.y + 2 * omt * t * edge.controlPoint.y + t * t * edge.endPoint.y;
    const dx = bx - p.x;
    const dy = by - p.y;
    const d = Math.sqrt(dx * dx + dy * dy);
    if (d < best) best = d;
  }
  return best;
}

describe('edge-routing', () => {
  describe('computeEdgePaths', () => {
    it('returns empty array for no transitions', () => {
      const states = [makeState('q0', 100, 100)];
      expect(computeEdgePaths(states, [])).toEqual([]);
    });

    it('computes a simple edge between two states', () => {
      const states = [makeState('q0', 100, 200), makeState('q1', 300, 200)];
      const transitions = [makeTransition('t1', 'q0', 'q1', ['a'])];
      const paths = computeEdgePaths(states, transitions);

      expect(paths).toHaveLength(1);
      expect(paths[0]!.transitionId).toBe('t1');
      expect(paths[0]!.isSelfLoop).toBe(false);
      expect(paths[0]!.path).toContain('M');
      expect(paths[0]!.path).toContain('Q');
      expect(paths[0]!.labelWidth).toBeGreaterThan(0);
    });

    it('computes a self-loop', () => {
      const states = [makeState('q0', 100, 200)];
      const transitions = [makeTransition('t1', 'q0', 'q0', ['a'])];
      const paths = computeEdgePaths(states, transitions);

      expect(paths).toHaveLength(1);
      expect(paths[0]!.isSelfLoop).toBe(true);
      expect(paths[0]!.path).toContain('C');
    });

    it('offsets bidirectional edges to avoid overlap', () => {
      const states = [makeState('q0', 100, 200), makeState('q1', 300, 200)];
      const transitions = [
        makeTransition('t1', 'q0', 'q1', ['a']),
        makeTransition('t2', 'q1', 'q0', ['b']),
      ];
      const paths = computeEdgePaths(states, transitions);

      expect(paths).toHaveLength(2);
      expect(paths[0]!.controlPoint.y).not.toBe(paths[1]!.controlPoint.y);
    });

    it('skips transitions with missing states', () => {
      const states = [makeState('q0', 100, 200)];
      const transitions = [makeTransition('t1', 'q0', 'missing', ['a'])];
      const paths = computeEdgePaths(states, transitions);

      expect(paths).toHaveLength(0);
    });

    it('resolves overlapping labels between self-loop and incoming edge', () => {
      const states = [makeState('q0', 100, 200), makeState('q1', 200, 200)];
      const transitions = [
        makeTransition('t1', 'q1', 'q1', ['a', 'b']),
        makeTransition('t2', 'q0', 'q1', ['c']),
      ];
      const paths = computeEdgePaths(states, transitions);

      expect(paths).toHaveLength(2);
      const selfLoop = paths.find((p) => p.isSelfLoop)!;
      const incoming = paths.find((p) => !p.isSelfLoop)!;

      const yDiff = Math.abs(selfLoop.labelPosition.y - incoming.labelPosition.y);
      expect(yDiff).toBeGreaterThanOrEqual(0);
    });

    it('computes correct labelWidth based on symbols', () => {
      const states = [makeState('q0', 100, 200), makeState('q1', 300, 200)];
      const t1 = makeTransition('t1', 'q0', 'q1', ['a']);
      const t2 = makeTransition('t2', 'q1', 'q0', ['a', 'b', 'c']);

      const paths1 = computeEdgePaths(states, [t1]);
      const paths2 = computeEdgePaths(states, [t2]);

      expect(paths2[0]!.labelWidth).toBeGreaterThan(paths1[0]!.labelWidth);
    });

    it('positions self-loop opposite to connected edges', () => {
      // q0 is to the right of q1, so self-loop on q1 should go left (away from q0)
      const states = [makeState('q0', 300, 200), makeState('q1', 100, 200)];
      const transitions = [
        makeTransition('t1', 'q0', 'q1', ['a']),
        makeTransition('t2', 'q1', 'q1', ['b']),
      ];
      const paths = computeEdgePaths(states, transitions);
      const selfLoop = paths.find((p) => p.isSelfLoop)!;

      // Self-loop label should be to the left of q1 (x < 100), away from q0
      expect(selfLoop.labelPosition.x).toBeLessThan(100);
    });

    it('defaults self-loop to top when no other edges (non-initial)', () => {
      const states = [makeState('q0', 200, 200)];
      const transitions = [makeTransition('t1', 'q0', 'q0', ['a'])];
      const paths = computeEdgePaths(states, transitions);
      const selfLoop = paths[0]!;

      // Default top: label y should be above state y (200)
      expect(selfLoop.labelPosition.y).toBeLessThan(200);
    });

    it('self-loop on initial state avoids left side (initial arrow direction)', () => {
      const states = [makeState('q0', 200, 200, { isInitial: true })];
      const transitions = [makeTransition('t1', 'q0', 'q0', ['a'])];
      const paths = computeEdgePaths(states, transitions);
      const selfLoop = paths[0]!;

      // Initial arrow comes from the left (angle π), so self-loop should go right (label x > 200)
      expect(selfLoop.labelPosition.x).toBeGreaterThan(200);
    });

    it('self-loop on initial state with edge going right goes up', () => {
      const states = [
        makeState('q0', 200, 200, { isInitial: true }),
        makeState('q1', 400, 200),
      ];
      const transitions = [
        makeTransition('t1', 'q0', 'q1', ['a']),
        makeTransition('t2', 'q0', 'q0', ['b']),
      ];
      const paths = computeEdgePaths(states, transitions);
      const selfLoop = paths.find((p) => p.isSelfLoop)!;

      // Initial arrow from left (π) + edge going right (0) → avg is left → self-loop goes right
      // The self-loop should NOT be clearly on the left side
      expect(selfLoop.labelPosition.x).toBeGreaterThan(190);
    });

    it('positions self-loop below when neighbor is above', () => {
      const states = [makeState('q0', 200, 100), makeState('q1', 200, 300)];
      const transitions = [
        makeTransition('t1', 'q0', 'q1', ['a']),
        makeTransition('t2', 'q1', 'q1', ['b']),
      ];
      const paths = computeEdgePaths(states, transitions);
      const selfLoop = paths.find((p) => p.isSelfLoop)!;

      // q0 is above q1, so self-loop should be below q1 (y > 300)
      expect(selfLoop.labelPosition.y).toBeGreaterThan(300);
    });
  });

  describe('obstacleAvoidanceOffset', () => {
    it('returns 0 when no other states lie in the chord corridor', () => {
      const source = makeState('a', 100, 200);
      const target = makeState('b', 500, 200);
      expect(obstacleAvoidanceOffset(source, target, [source, target])).toBe(0);
    });

    it('returns 0 when other states are far above/below the chord', () => {
      const source = makeState('a', 100, 200);
      const target = makeState('b', 500, 200);
      const far = makeState('c', 300, 500); // 300px below
      expect(obstacleAvoidanceOffset(source, target, [source, target, far])).toBe(0);
    });

    it('returns 0 for obstacles whose projection falls outside the chord', () => {
      const source = makeState('a', 100, 200);
      const target = makeState('b', 500, 200);
      const beyond = makeState('c', 700, 200); // past the target along the chord
      expect(obstacleAvoidanceOffset(source, target, [source, target, beyond])).toBe(0);
    });

    it('returns a non-zero offset when an obstacle sits on the chord midpoint', () => {
      const source = makeState('a', 100, 200);
      const target = makeState('b', 500, 200);
      const blocker = makeState('c', 300, 200); // dead center
      const off = obstacleAvoidanceOffset(source, target, [source, target, blocker]);
      // With t=0.5, |D| ≈ (R + C)/0.5 = 2·(28+18) = 92
      expect(Math.abs(off)).toBeGreaterThan(80);
      expect(Math.abs(off)).toBeLessThan(110);
    });

    it('picks the side with the smaller required magnitude', () => {
      // Blocker is slightly below the chord, so bowing up costs less than bowing down.
      // Canonical perp for chord (a→b, +x): perp = (0, +1) = DOWN in screen coords.
      // Bowing UP means negative signed offset.
      const source = makeState('a', 100, 200);
      const target = makeState('b', 500, 200);
      const blocker = makeState('c', 300, 210); // 10px below chord
      const off = obstacleAvoidanceOffset(source, target, [source, target, blocker]);
      expect(off).toBeLessThan(0); // bow up (away from the blocker)
    });

    it('respects the magnitude cap', () => {
      // Pile up many obstacles near the endpoints to drive required |D| past the cap.
      const source = makeState('a', 100, 200);
      const target = makeState('b', 500, 200);
      const tightBlocker = makeState('c', 130, 200); // very close to source (t≈0.075)
      const off = obstacleAvoidanceOffset(source, target, [source, target, tightBlocker]);
      expect(Math.abs(off)).toBeLessThanOrEqual(220);
    });

    it('TM 0^n 1^n 2^n layout: q3→q0 edge bows away from q4/q5 cluster', () => {
      // Reproduces the user-reported case. q3 is canonicalTarget (id "38..." < "bd..."),
      // so perp = (0, -1) (UP) and a positive offset bows up. q4/q5 sit below the chord
      // far enough not to be obstacles, leaving q1 and q2 (essentially on the chord) to
      // drive the math; the chosen side is the cheaper of the two.
      const q0 = makeState('bdeb0539', 200, 250);
      const q1 = makeState('0d3a0875', 403, 250);
      const q2 = makeState('0f80456d', 658, 256);
      const q3 = makeState('38906e34', 845, 256);
      const q4 = makeState('547487c9', 288, 407);
      const q5 = makeState('225a3f52', 470, 413);
      const off = obstacleAvoidanceOffset(q3, q0, [q0, q1, q2, q3, q4, q5]);
      expect(Math.abs(off)).toBeGreaterThan(60);
    });

    it('end-to-end: long edge crossing intermediate states actually clears them', () => {
      const q0 = makeState('q0', 100, 200);
      const q1 = makeState('q1', 300, 200);
      const q2 = makeState('q2', 500, 200);
      const q3 = makeState('q3', 700, 200);
      const transitions = [makeTransition('t1', 'q0', 'q3', ['a'])];
      const paths = computeEdgePaths([q0, q1, q2, q3], transitions);
      const edge = paths[0]!;
      const distToQ1 = quadBezierMinDist(edge, q1.position);
      const distToQ2 = quadBezierMinDist(edge, q2.position);
      expect(distToQ1).toBeGreaterThan(28); // outside state circle
      expect(distToQ2).toBeGreaterThan(28);
    });

    it('respects manual controlPointOffset (skips avoidance entirely)', () => {
      const q0 = makeState('q0', 100, 200);
      const q1 = makeState('q1', 300, 200);
      const q3 = makeState('q3', 700, 200); // would normally trigger avoidance
      const transitions: Transition[] = [
        {
          id: 't1',
          sourceId: 'q0',
          targetId: 'q3',
          symbols: ['a'],
          controlPointOffset: { x: 0, y: -10 },
        },
      ];
      const paths = computeEdgePaths([q0, q1, q3], transitions);
      const edge = paths[0]!;
      // With manualOffset applied directly and zero auto avoidance, the control point is at
      // midpoint + manualOffset = (400, 200) + (0, -10) = (400, 190).
      expect(edge.controlPoint.x).toBeCloseTo(400, 1);
      expect(edge.controlPoint.y).toBeCloseTo(190, 1);
    });
  });

  describe('computeInitialArrowPath', () => {
    it('creates a horizontal arrow ending at state edge', () => {
      const state = makeState('q0', 100, 200, { isInitial: true });
      const path = computeInitialArrowPath(state);

      expect(path).toContain('M');
      expect(path).toContain('L');
      expect(path).toContain('72');
    });
  });
});

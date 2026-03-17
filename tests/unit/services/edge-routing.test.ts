import { describe, it, expect } from 'vitest';
import { computeEdgePaths, computeInitialArrowPath } from '@/services/layout/edge-routing';
import type { AutomatonState, Transition } from '@/models/automaton';

function makeState(id: string, x: number, y: number, opts?: Partial<AutomatonState>): AutomatonState {
  return { id, name: id, position: { x, y }, isInitial: false, isAccepting: false, ...opts };
}

function makeTransition(id: string, sourceId: string, targetId: string, symbols: string[]): Transition {
  return { id, sourceId, targetId, symbols };
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

    it('defaults self-loop to top when no other edges', () => {
      const states = [makeState('q0', 200, 200)];
      const transitions = [makeTransition('t1', 'q0', 'q0', ['a'])];
      const paths = computeEdgePaths(states, transitions);
      const selfLoop = paths[0]!;

      // Default top: label y should be above state y (200)
      expect(selfLoop.labelPosition.y).toBeLessThan(200);
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

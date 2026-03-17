import { describe, it, expect } from 'vitest';
import { snapToAlignment, computeSnapGuides } from '@/utils/snap';
import type { AutomatonState } from '@/models/automaton';

function makeState(id: string, x: number, y: number): AutomatonState {
  return { id, name: id, position: { x, y }, isInitial: false, isAccepting: false };
}

describe('snapToAlignment', () => {
  it('snaps x when within threshold', () => {
    const states = [makeState('q0', 100, 200), makeState('q1', 200, 300)];
    const result = snapToAlignment({ x: 103, y: 250 }, 'dragged', states);
    expect(result.x).toBe(100);
    expect(result.y).toBe(250);
  });

  it('snaps y when within threshold', () => {
    const states = [makeState('q0', 100, 200), makeState('q1', 200, 300)];
    const result = snapToAlignment({ x: 150, y: 205 }, 'dragged', states);
    expect(result.x).toBe(150);
    expect(result.y).toBe(200);
  });

  it('snaps both axes independently', () => {
    const states = [makeState('q0', 100, 200), makeState('q1', 300, 250)];
    const result = snapToAlignment({ x: 104, y: 253 }, 'dragged', states);
    expect(result.x).toBe(100);
    expect(result.y).toBe(250);
  });

  it('does not snap when beyond threshold', () => {
    const states = [makeState('q0', 100, 200)];
    const result = snapToAlignment({ x: 120, y: 220 }, 'dragged', states);
    expect(result.x).toBe(120);
    expect(result.y).toBe(220);
  });

  it('does not snap to self', () => {
    const states = [makeState('q0', 100, 200)];
    const result = snapToAlignment({ x: 103, y: 205 }, 'q0', states);
    expect(result.x).toBe(103);
    expect(result.y).toBe(205);
  });

  it('snaps to the closest state when multiple are in range', () => {
    const states = [makeState('q0', 100, 200), makeState('q1', 105, 200)];
    const result = snapToAlignment({ x: 103, y: 250 }, 'dragged', states);
    // 103 is 3 away from 100 and 2 away from 105, should snap to 105
    expect(result.x).toBe(105);
  });
});

describe('computeSnapGuides', () => {
  it('returns guide when aligned on x', () => {
    const states = [makeState('q0', 100, 200)];
    const guides = computeSnapGuides({ x: 100, y: 300 }, 'dragged', states);
    expect(guides).toEqual([{ axis: 'x', position: 100 }]);
  });

  it('returns guide when aligned on y', () => {
    const states = [makeState('q0', 100, 200)];
    const guides = computeSnapGuides({ x: 300, y: 200 }, 'dragged', states);
    expect(guides).toEqual([{ axis: 'y', position: 200 }]);
  });

  it('returns empty when no alignment', () => {
    const states = [makeState('q0', 100, 200)];
    const guides = computeSnapGuides({ x: 150, y: 250 }, 'dragged', states);
    expect(guides).toEqual([]);
  });

  it('does not include self', () => {
    const states = [makeState('q0', 100, 200)];
    const guides = computeSnapGuides({ x: 100, y: 200 }, 'q0', states);
    expect(guides).toEqual([]);
  });
});

import { describe, it, expect } from 'vitest';
import { computeFitViewport } from '@/utils/fit-viewport';
import type { AutomatonState } from '@/models/automaton';

function makeState(x: number, y: number, id = 'q0'): AutomatonState {
  return { id, name: id, position: { x, y }, isInitial: false, isAccepting: false };
}

describe('computeFitViewport', () => {
  it('returns default viewport for no states', () => {
    const vp = computeFitViewport([], 800, 600);
    expect(vp).toEqual({ panX: 0, panY: 0, zoom: 1 });
  });

  it('centers a single state', () => {
    const vp = computeFitViewport([makeState(100, 100)], 800, 600);
    // Single state: center of bbox is (100,100), so panX = 400 - 100*zoom, panY = 300 - 100*zoom
    expect(vp.panX).toBeCloseTo(800 / 2 - 100 * vp.zoom);
    expect(vp.panY).toBeCloseTo(600 / 2 - 100 * vp.zoom);
  });

  it('computes correct zoom for spread-out states', () => {
    const states = [makeState(0, 0, 'q0'), makeState(1000, 500, 'q1')];
    const vp = computeFitViewport(states, 800, 600);
    // bbox: 0..1000 x 0..500 + margins
    expect(vp.zoom).toBeLessThan(1);
    expect(vp.zoom).toBeGreaterThan(0.2);
  });

  it('clamps zoom to maximum 5', () => {
    // States very close together, large canvas → zoom would be huge
    const states = [makeState(100, 100, 'q0'), makeState(101, 101, 'q1')];
    const vp = computeFitViewport(states, 8000, 6000);
    expect(vp.zoom).toBeLessThanOrEqual(5);
  });

  it('clamps zoom to minimum 0.2', () => {
    // States extremely spread, tiny canvas
    const states = [makeState(0, 0, 'q0'), makeState(100000, 100000, 'q1')];
    const vp = computeFitViewport(states, 100, 100);
    expect(vp.zoom).toBeGreaterThanOrEqual(0.2);
  });

  it('respects custom padding', () => {
    const states = [makeState(0, 0, 'q0'), makeState(200, 200, 'q1')];
    const vp1 = computeFitViewport(states, 800, 600, 20);
    const vp2 = computeFitViewport(states, 800, 600, 100);
    // More padding → smaller zoom (more space taken by margins)
    expect(vp2.zoom).toBeLessThan(vp1.zoom);
  });
});

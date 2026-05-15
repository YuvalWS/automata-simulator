import { describe, it, expect } from 'vitest';
import { getTransitionLabel } from '@/utils/transition-label';
import { AutomatonType } from '@/models/types';
import { DEFAULT_BLANK_SYMBOL, toDisplayBlank, fromDisplayBlank } from '@/models/epsilon';
import type { Transition } from '@/models/automaton';

function tmTransition(rules: { reads: string[]; write?: string; dir: 'L' | 'R' | 'S' }[]): Transition {
  return {
    id: 't1',
    sourceId: 'q0',
    targetId: 'q1',
    symbols: [],
    tmRules: rules.map((r) => ({
      readSymbols: r.reads,
      ...(r.write !== undefined ? { writeSymbol: r.write } : {}),
      direction: r.dir,
    })),
  };
}

describe('toDisplayBlank / fromDisplayBlank', () => {
  it('substitutes canonical for display in both directions', () => {
    expect(toDisplayBlank('0,⊔,1', '_')).toBe('0,_,1');
    expect(fromDisplayBlank('0,_,1', '_')).toBe('0,⊔,1');
  });

  it('is a no-op when display blank is undefined or equal to default', () => {
    expect(toDisplayBlank('0,⊔,1', undefined)).toBe('0,⊔,1');
    expect(toDisplayBlank('0,⊔,1', DEFAULT_BLANK_SYMBOL)).toBe('0,⊔,1');
    expect(fromDisplayBlank('0,⊔,1', undefined)).toBe('0,⊔,1');
  });

  it('round-trips through display and back', () => {
    const canonical = '0,⊔,1';
    const display = toDisplayBlank(canonical, '_');
    expect(fromDisplayBlank(display, '_')).toBe(canonical);
  });
});

describe('getTransitionLabel — TM blank display', () => {
  it('renders canonical ⊔ in label when no display preference', () => {
    const t = tmTransition([{ reads: ['0', DEFAULT_BLANK_SYMBOL], write: '1', dir: 'R' }]);
    expect(getTransitionLabel(t, AutomatonType.TM)).toBe('0,⊔ → 1, R');
  });

  it('substitutes canonical with display blank in label', () => {
    const t = tmTransition([{ reads: ['0', DEFAULT_BLANK_SYMBOL], write: DEFAULT_BLANK_SYMBOL, dir: 'L' }]);
    expect(getTransitionLabel(t, AutomatonType.TM, '_')).toBe('0,_ → _, L');
  });

  it('substitutes blank in write symbol too', () => {
    const t = tmTransition([{ reads: ['0'], write: DEFAULT_BLANK_SYMBOL, dir: 'R' }]);
    expect(getTransitionLabel(t, AutomatonType.TM, 'B')).toBe('0 → B, R');
  });
});

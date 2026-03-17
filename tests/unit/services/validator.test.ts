import { describe, it, expect } from 'vitest';
import { validateAutomaton, validateWord } from '@/services/simulation/validator';
import type { Automaton } from '@/models/automaton';
import { AutomatonType } from '@/models/types';

function makeAutomaton(overrides: Partial<Automaton> = {}): Automaton {
  return {
    id: 'test',
    name: 'Test',
    type: AutomatonType.DFA,
    alphabet: ['a', 'b'],
    states: [
      { id: 'q0', name: 'q0', position: { x: 0, y: 0 }, isInitial: true, isAccepting: false },
      { id: 'q1', name: 'q1', position: { x: 100, y: 0 }, isInitial: false, isAccepting: true },
    ],
    transitions: [
      { id: 't1', sourceId: 'q0', targetId: 'q1', symbols: ['a'] },
      { id: 't2', sourceId: 'q1', targetId: 'q1', symbols: ['b'] },
    ],
    viewport: { panX: 0, panY: 0, zoom: 1 },
    ...overrides,
  };
}

describe('validateAutomaton', () => {
  it('returns no errors for valid DFA', () => {
    const auto = makeAutomaton({
      transitions: [
        { id: 't1', sourceId: 'q0', targetId: 'q1', symbols: ['a'] },
        { id: 't2', sourceId: 'q0', targetId: 'q0', symbols: ['b'] },
        { id: 't3', sourceId: 'q1', targetId: 'q1', symbols: ['a'] },
        { id: 't4', sourceId: 'q1', targetId: 'q0', symbols: ['b'] },
      ],
    });
    const msgs = validateAutomaton(auto);
    expect(msgs.filter((m) => m.type === 'error')).toHaveLength(0);
  });

  it('errors when no initial state', () => {
    const auto = makeAutomaton({
      states: [
        { id: 'q0', name: 'q0', position: { x: 0, y: 0 }, isInitial: false, isAccepting: false },
      ],
    });
    const msgs = validateAutomaton(auto);
    expect(msgs.some((m) => m.type === 'error' && m.message.includes('No initial state'))).toBe(true);
  });

  it('warns when alphabet is empty', () => {
    const auto = makeAutomaton({ alphabet: [] });
    const msgs = validateAutomaton(auto);
    expect(msgs.some((m) => m.type === 'warning' && m.message.includes('Alphabet is empty'))).toBe(true);
  });

  it('errors on DFA symbol conflict', () => {
    const auto = makeAutomaton({
      transitions: [
        { id: 't1', sourceId: 'q0', targetId: 'q1', symbols: ['a'] },
        { id: 't2', sourceId: 'q0', targetId: 'q0', symbols: ['a'] },
      ],
    });
    const msgs = validateAutomaton(auto);
    expect(msgs.some((m) => m.type === 'error' && m.message.includes('DFA conflict'))).toBe(true);
  });

  it('warns on missing transitions for DFA', () => {
    const auto = makeAutomaton({
      transitions: [
        { id: 't1', sourceId: 'q0', targetId: 'q1', symbols: ['a'] },
        // q0 missing 'b', q1 missing both
      ],
    });
    const msgs = validateAutomaton(auto);
    const warnings = msgs.filter((m) => m.type === 'warning' && m.message.includes('no transition'));
    expect(warnings.length).toBeGreaterThanOrEqual(1);
  });

  it('does not check symbol conflicts for NFA', () => {
    const auto = makeAutomaton({
      type: AutomatonType.NFA,
      transitions: [
        { id: 't1', sourceId: 'q0', targetId: 'q1', symbols: ['a'] },
        { id: 't2', sourceId: 'q0', targetId: 'q0', symbols: ['a'] },
      ],
    });
    const msgs = validateAutomaton(auto);
    expect(msgs.filter((m) => m.type === 'error' && m.message.includes('DFA conflict'))).toHaveLength(0);
  });

  it('detects conflict in symbols list within single transition', () => {
    // A transition with ['a'] and another with ['a','b'] from same state
    const auto = makeAutomaton({
      transitions: [
        { id: 't1', sourceId: 'q0', targetId: 'q1', symbols: ['a'] },
        { id: 't2', sourceId: 'q0', targetId: 'q0', symbols: ['a', 'b'] },
      ],
    });
    const msgs = validateAutomaton(auto);
    expect(msgs.some((m) => m.type === 'error' && m.message.includes('DFA conflict') && m.message.includes('"a"'))).toBe(true);
  });

  it('warns when DFA has epsilon transitions', () => {
    const auto = makeAutomaton({
      type: AutomatonType.DFA,
      transitions: [
        { id: 't1', sourceId: 'q0', targetId: 'q1', symbols: ['\u03B5'] },
      ],
    });
    const msgs = validateAutomaton(auto);
    expect(msgs.some((m) => m.type === 'warning' && m.message.includes('\u03B5-transitions'))).toBe(true);
  });

  it('does not warn about epsilon for NFA', () => {
    const auto = makeAutomaton({
      type: AutomatonType.NFA,
      transitions: [
        { id: 't1', sourceId: 'q0', targetId: 'q1', symbols: ['\u03B5'] },
      ],
    });
    const msgs = validateAutomaton(auto);
    expect(msgs.some((m) => m.message.includes('\u03B5-transitions'))).toBe(false);
  });

  it('does not count epsilon as missing transition in DFA', () => {
    const auto = makeAutomaton({
      type: AutomatonType.DFA,
      transitions: [
        { id: 't1', sourceId: 'q0', targetId: 'q1', symbols: ['a'] },
        { id: 't2', sourceId: 'q0', targetId: 'q0', symbols: ['b'] },
        { id: 't3', sourceId: 'q1', targetId: 'q1', symbols: ['a'] },
        { id: 't4', sourceId: 'q1', targetId: 'q0', symbols: ['b'] },
      ],
    });
    const msgs = validateAutomaton(auto);
    // No warnings about missing ε transition
    expect(msgs.some((m) => m.message.includes('\u03B5'))).toBe(false);
  });
});

describe('validateWord', () => {
  it('returns no errors for valid word', () => {
    expect(validateWord(['a', 'b', 'a'], ['a', 'b'])).toHaveLength(0);
  });

  it('errors on invalid symbol', () => {
    const msgs = validateWord(['a', 'c'], ['a', 'b']);
    expect(msgs.some((m) => m.type === 'error' && m.message.includes('"c"'))).toBe(true);
  });

  it('skips validation when alphabet is empty', () => {
    expect(validateWord(['a', 'b'], [])).toHaveLength(0);
  });

  it('allows empty word', () => {
    expect(validateWord([], ['a', 'b'])).toHaveLength(0);
  });

  it('reports multiple invalid symbols', () => {
    const msgs = validateWord(['x', 'y'], ['a']);
    expect(msgs[0]!.message).toContain('"x"');
    expect(msgs[0]!.message).toContain('"y"');
  });
});

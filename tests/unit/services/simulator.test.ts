import { describe, it, expect } from 'vitest';
import { buildSimulationTrace } from '@/services/simulation/simulator';
import type { SimulationSnapshot } from '@/services/simulation/simulator';
import type { Automaton, PdaRule } from '@/models/automaton';
import { AutomatonType } from '@/models/types';
import { EPSILON, STACK_BOTTOM } from '@/models/epsilon';

/** Get last element of array (replacement for .at(-1) which needs ES2022) */
function last(arr: SimulationSnapshot[]): SimulationSnapshot {
  return arr[arr.length - 1]!;
}

function lastStatus(automaton: Automaton, word: string[]): string {
  const trace = buildSimulationTrace(automaton, word);
  return last(trace.snapshots).status;
}

function makeAutomaton(overrides: Partial<Automaton> = {}): Automaton {
  return {
    id: 'test',
    name: 'Test',
    type: AutomatonType.DFA,
    alphabet: ['a', 'b'],
    states: [],
    transitions: [],
    viewport: { panX: 0, panY: 0, zoom: 1 },
    ...overrides,
  };
}

describe('DFA simulation', () => {
  const dfaAutomaton = makeAutomaton({
    states: [
      { id: 'q0', name: 'q0', position: { x: 0, y: 0 }, isInitial: true, isAccepting: false },
      { id: 'q1', name: 'q1', position: { x: 100, y: 0 }, isInitial: false, isAccepting: false },
      { id: 'q2', name: 'q2', position: { x: 200, y: 0 }, isInitial: false, isAccepting: true },
    ],
    transitions: [
      { id: 't1', sourceId: 'q0', targetId: 'q1', symbols: ['a'] },
      { id: 't2', sourceId: 'q1', targetId: 'q2', symbols: ['b'] },
      { id: 't3', sourceId: 'q2', targetId: 'q2', symbols: ['a', 'b'] },
    ],
  });

  it('accepts word "ab"', () => {
    const trace = buildSimulationTrace(dfaAutomaton, ['a', 'b']);
    expect(trace.snapshots).toHaveLength(3);
    expect(trace.snapshots[0]!.activeStateIds).toEqual(['q0']);
    expect(trace.snapshots[0]!.status).toBe('running');
    expect(trace.snapshots[1]!.activeStateIds).toEqual(['q1']);
    expect(trace.snapshots[1]!.traversedTransitionIds).toEqual(['t1']);
    expect(trace.snapshots[2]!.activeStateIds).toEqual(['q2']);
    expect(trace.snapshots[2]!.status).toBe('accepted');
  });

  it('rejects word "a" (not accepting)', () => {
    const trace = buildSimulationTrace(dfaAutomaton, ['a']);
    expect(trace.snapshots).toHaveLength(2);
    expect(trace.snapshots[1]!.status).toBe('rejected');
    expect(trace.snapshots[1]!.activeStateIds).toEqual(['q1']);
  });

  it('rejects on missing transition', () => {
    const trace = buildSimulationTrace(dfaAutomaton, ['b']);
    expect(trace.snapshots).toHaveLength(2);
    expect(trace.snapshots[1]!.status).toBe('rejected');
    expect(trace.snapshots[1]!.activeStateIds).toEqual([]);
  });

  it('accepts empty word when initial is accepting', () => {
    const auto = makeAutomaton({
      states: [
        { id: 'q0', name: 'q0', position: { x: 0, y: 0 }, isInitial: true, isAccepting: true },
      ],
    });
    const trace = buildSimulationTrace(auto, []);
    expect(trace.snapshots).toHaveLength(1);
    expect(trace.snapshots[0]!.status).toBe('accepted');
  });

  it('rejects empty word when initial is not accepting', () => {
    const auto = makeAutomaton({
      states: [
        { id: 'q0', name: 'q0', position: { x: 0, y: 0 }, isInitial: true, isAccepting: false },
      ],
    });
    const trace = buildSimulationTrace(auto, []);
    expect(trace.snapshots).toHaveLength(1);
    expect(trace.snapshots[0]!.status).toBe('rejected');
  });

  it('rejects when no initial state', () => {
    const auto = makeAutomaton({ states: [] });
    const trace = buildSimulationTrace(auto, ['a']);
    expect(trace.snapshots).toHaveLength(1);
    expect(trace.snapshots[0]!.status).toBe('rejected');
  });

  it('handles longer accepted word "aba"', () => {
    const trace = buildSimulationTrace(dfaAutomaton, ['a', 'b', 'a']);
    expect(trace.snapshots).toHaveLength(4);
    expect(trace.snapshots[3]!.status).toBe('accepted');
    expect(trace.snapshots[3]!.activeStateIds).toEqual(['q2']);
  });

  it('step 0 has symbolIndex -1', () => {
    const trace = buildSimulationTrace(dfaAutomaton, ['a']);
    expect(trace.snapshots[0]!.symbolIndex).toBe(-1);
    expect(trace.snapshots[1]!.symbolIndex).toBe(0);
  });
});

describe('NFA simulation', () => {
  const nfaAutomaton = makeAutomaton({
    type: AutomatonType.NFA,
    states: [
      { id: 'q0', name: 'q0', position: { x: 0, y: 0 }, isInitial: true, isAccepting: false },
      { id: 'q1', name: 'q1', position: { x: 100, y: 0 }, isInitial: false, isAccepting: false },
      { id: 'q2', name: 'q2', position: { x: 200, y: 0 }, isInitial: false, isAccepting: true },
    ],
    transitions: [
      { id: 't1', sourceId: 'q0', targetId: 'q0', symbols: ['a'] },
      { id: 't2', sourceId: 'q0', targetId: 'q1', symbols: ['a'] },
      { id: 't3', sourceId: 'q1', targetId: 'q2', symbols: ['b'] },
    ],
  });

  it('tracks multiple active states', () => {
    const trace = buildSimulationTrace(nfaAutomaton, ['a']);
    expect(trace.snapshots[1]!.activeStateIds).toContain('q0');
    expect(trace.snapshots[1]!.activeStateIds).toContain('q1');
    expect(trace.snapshots[1]!.activeStateIds).toHaveLength(2);
  });

  it('accepts when any branch reaches accepting state', () => {
    const trace = buildSimulationTrace(nfaAutomaton, ['a', 'b']);
    expect(trace.snapshots[2]!.status).toBe('accepted');
    expect(trace.snapshots[2]!.activeStateIds).toContain('q2');
  });

  it('rejects when all branches die', () => {
    const trace = buildSimulationTrace(nfaAutomaton, ['b']);
    expect(trace.snapshots[1]!.status).toBe('rejected');
    expect(trace.snapshots[1]!.activeStateIds).toHaveLength(0);
  });

  it('rejects when no branch reaches accepting', () => {
    const trace = buildSimulationTrace(nfaAutomaton, ['a', 'a']);
    expect(trace.snapshots[2]!.status).toBe('rejected');
  });

  it('records traversed transition ids', () => {
    const trace = buildSimulationTrace(nfaAutomaton, ['a']);
    expect(trace.snapshots[1]!.traversedTransitionIds).toContain('t1');
    expect(trace.snapshots[1]!.traversedTransitionIds).toContain('t2');
  });

  it('deduplicates active states', () => {
    const auto = makeAutomaton({
      type: AutomatonType.NFA,
      states: [
        { id: 'q0', name: 'q0', position: { x: 0, y: 0 }, isInitial: true, isAccepting: false },
        { id: 'q1', name: 'q1', position: { x: 100, y: 0 }, isInitial: false, isAccepting: true },
      ],
      transitions: [
        { id: 't1', sourceId: 'q0', targetId: 'q1', symbols: ['a'] },
        { id: 't2', sourceId: 'q0', targetId: 'q1', symbols: ['a'] },
      ],
    });
    const trace = buildSimulationTrace(auto, ['a']);
    expect(trace.snapshots[1]!.activeStateIds).toEqual(['q1']);
  });

  it('accepts empty word if initial is accepting', () => {
    const auto = makeAutomaton({
      type: AutomatonType.NFA,
      states: [
        { id: 'q0', name: 'q0', position: { x: 0, y: 0 }, isInitial: true, isAccepting: true },
      ],
    });
    const trace = buildSimulationTrace(auto, []);
    expect(trace.snapshots[0]!.status).toBe('accepted');
  });
});

// ── Comprehensive edge-case tests with real automata ──

describe('DFA: binary divisibility by 3', () => {
  const divBy3 = makeAutomaton({
    alphabet: ['0', '1'],
    states: [
      { id: 'q0', name: 'q0', position: { x: 0, y: 0 }, isInitial: true, isAccepting: true },
      { id: 'q1', name: 'q1', position: { x: 100, y: 0 }, isInitial: false, isAccepting: false },
      { id: 'q2', name: 'q2', position: { x: 200, y: 0 }, isInitial: false, isAccepting: false },
    ],
    transitions: [
      { id: 't1', sourceId: 'q0', targetId: 'q0', symbols: ['0'] },
      { id: 't2', sourceId: 'q0', targetId: 'q1', symbols: ['1'] },
      { id: 't3', sourceId: 'q1', targetId: 'q2', symbols: ['0'] },
      { id: 't4', sourceId: 'q1', targetId: 'q0', symbols: ['1'] },
      { id: 't5', sourceId: 'q2', targetId: 'q1', symbols: ['0'] },
      { id: 't6', sourceId: 'q2', targetId: 'q2', symbols: ['1'] },
    ],
  });

  it('accepts empty string (0 is divisible by 3)', () => {
    expect(lastStatus(divBy3, [])).toBe('accepted');
  });

  it('accepts "0" (0 mod 3 = 0)', () => {
    expect(lastStatus(divBy3, ['0'])).toBe('accepted');
  });

  it('accepts "110" (6 mod 3 = 0)', () => {
    const trace = buildSimulationTrace(divBy3, ['1', '1', '0']);
    expect(trace.snapshots).toHaveLength(4);
    expect(last(trace.snapshots).status).toBe('accepted');
    expect(last(trace.snapshots).activeStateIds).toEqual(['q0']);
  });

  it('accepts "1001" (9 mod 3 = 0)', () => {
    expect(lastStatus(divBy3, ['1', '0', '0', '1'])).toBe('accepted');
  });

  it('rejects "1" (1 mod 3 = 1)', () => {
    expect(lastStatus(divBy3, ['1'])).toBe('rejected');
  });

  it('rejects "10" (2 mod 3 = 2)', () => {
    expect(lastStatus(divBy3, ['1', '0'])).toBe('rejected');
  });

  it('rejects "101" (5 mod 3 = 2)', () => {
    expect(lastStatus(divBy3, ['1', '0', '1'])).toBe('rejected');
  });

  it('has correct number of snapshots for each step', () => {
    const trace = buildSimulationTrace(divBy3, ['1', '1', '0']);
    expect(trace.snapshots).toHaveLength(4);
    for (let i = 0; i < trace.snapshots.length; i++) {
      expect(trace.snapshots[i]!.step).toBe(i);
    }
  });
});

describe('DFA: even number of "a"s', () => {
  const evenAs = makeAutomaton({
    states: [
      { id: 'even', name: 'even', position: { x: 0, y: 0 }, isInitial: true, isAccepting: true },
      { id: 'odd', name: 'odd', position: { x: 100, y: 0 }, isInitial: false, isAccepting: false },
    ],
    transitions: [
      { id: 't1', sourceId: 'even', targetId: 'odd', symbols: ['a'] },
      { id: 't2', sourceId: 'even', targetId: 'even', symbols: ['b'] },
      { id: 't3', sourceId: 'odd', targetId: 'even', symbols: ['a'] },
      { id: 't4', sourceId: 'odd', targetId: 'odd', symbols: ['b'] },
    ],
  });

  it('accepts empty string', () => {
    expect(lastStatus(evenAs, [])).toBe('accepted');
  });

  it('accepts "bb"', () => {
    expect(lastStatus(evenAs, ['b', 'b'])).toBe('accepted');
  });

  it('accepts "aa"', () => {
    expect(lastStatus(evenAs, ['a', 'a'])).toBe('accepted');
  });

  it('accepts "baba"', () => {
    expect(lastStatus(evenAs, ['b', 'a', 'b', 'a'])).toBe('accepted');
  });

  it('rejects "a"', () => {
    expect(lastStatus(evenAs, ['a'])).toBe('rejected');
  });

  it('accepts "aab" (2 a\'s is even)', () => {
    expect(lastStatus(evenAs, ['a', 'a', 'b'])).toBe('accepted');
  });

  it('rejects "aaba" (3 a\'s is odd)', () => {
    expect(lastStatus(evenAs, ['a', 'a', 'b', 'a'])).toBe('rejected');
  });
});

describe('DFA: self-loop only (single state DFA)', () => {
  const singleAccepting = makeAutomaton({
    alphabet: ['a'],
    states: [
      { id: 'q0', name: 'q0', position: { x: 0, y: 0 }, isInitial: true, isAccepting: true },
    ],
    transitions: [
      { id: 't1', sourceId: 'q0', targetId: 'q0', symbols: ['a'] },
    ],
  });

  it('accepts any number of "a"s', () => {
    expect(lastStatus(singleAccepting, [])).toBe('accepted');
    expect(lastStatus(singleAccepting, ['a'])).toBe('accepted');
    expect(lastStatus(singleAccepting, ['a', 'a', 'a'])).toBe('accepted');
  });

  it('every step stays in q0', () => {
    const trace = buildSimulationTrace(singleAccepting, ['a', 'a']);
    for (const snap of trace.snapshots) {
      expect(snap.activeStateIds).toEqual(['q0']);
    }
  });
});

describe('DFA: dead state (trap state)', () => {
  const onlyAb = makeAutomaton({
    states: [
      { id: 'q0', name: 'q0', position: { x: 0, y: 0 }, isInitial: true, isAccepting: false },
      { id: 'q1', name: 'q1', position: { x: 100, y: 0 }, isInitial: false, isAccepting: false },
      { id: 'q2', name: 'q2', position: { x: 200, y: 0 }, isInitial: false, isAccepting: true },
      { id: 'dead', name: 'dead', position: { x: 300, y: 0 }, isInitial: false, isAccepting: false },
    ],
    transitions: [
      { id: 't1', sourceId: 'q0', targetId: 'q1', symbols: ['a'] },
      { id: 't2', sourceId: 'q0', targetId: 'dead', symbols: ['b'] },
      { id: 't3', sourceId: 'q1', targetId: 'q2', symbols: ['b'] },
      { id: 't4', sourceId: 'q1', targetId: 'dead', symbols: ['a'] },
      { id: 't5', sourceId: 'q2', targetId: 'dead', symbols: ['a', 'b'] },
      { id: 't6', sourceId: 'dead', targetId: 'dead', symbols: ['a', 'b'] },
    ],
  });

  it('accepts "ab"', () => {
    expect(lastStatus(onlyAb, ['a', 'b'])).toBe('accepted');
  });

  it('rejects "a"', () => {
    expect(lastStatus(onlyAb, ['a'])).toBe('rejected');
  });

  it('rejects "aba" — goes to dead state', () => {
    const trace = buildSimulationTrace(onlyAb, ['a', 'b', 'a']);
    expect(last(trace.snapshots).status).toBe('rejected');
    expect(last(trace.snapshots).activeStateIds).toEqual(['dead']);
  });

  it('rejects "ba" — goes to dead state immediately', () => {
    const trace = buildSimulationTrace(onlyAb, ['b', 'a']);
    expect(last(trace.snapshots).status).toBe('rejected');
    expect(last(trace.snapshots).activeStateIds).toEqual(['dead']);
  });
});

describe('NFA: strings ending with "ab"', () => {
  const endsAb = makeAutomaton({
    type: AutomatonType.NFA,
    states: [
      { id: 'q0', name: 'q0', position: { x: 0, y: 0 }, isInitial: true, isAccepting: false },
      { id: 'q1', name: 'q1', position: { x: 100, y: 0 }, isInitial: false, isAccepting: false },
      { id: 'q2', name: 'q2', position: { x: 200, y: 0 }, isInitial: false, isAccepting: true },
    ],
    transitions: [
      { id: 't1', sourceId: 'q0', targetId: 'q0', symbols: ['a', 'b'] },
      { id: 't2', sourceId: 'q0', targetId: 'q1', symbols: ['a'] },
      { id: 't3', sourceId: 'q1', targetId: 'q2', symbols: ['b'] },
    ],
  });

  it('accepts "ab"', () => {
    expect(lastStatus(endsAb, ['a', 'b'])).toBe('accepted');
  });

  it('accepts "aab"', () => {
    expect(lastStatus(endsAb, ['a', 'a', 'b'])).toBe('accepted');
  });

  it('accepts "bab"', () => {
    expect(lastStatus(endsAb, ['b', 'a', 'b'])).toBe('accepted');
  });

  it('rejects "a"', () => {
    expect(lastStatus(endsAb, ['a'])).toBe('rejected');
  });

  it('rejects "ba"', () => {
    expect(lastStatus(endsAb, ['b', 'a'])).toBe('rejected');
  });

  it('rejects empty string', () => {
    expect(lastStatus(endsAb, [])).toBe('rejected');
  });

  it('tracks parallel branches after "a"', () => {
    const trace = buildSimulationTrace(endsAb, ['a']);
    expect(trace.snapshots[1]!.activeStateIds).toContain('q0');
    expect(trace.snapshots[1]!.activeStateIds).toContain('q1');
  });
});

describe('NFA: multiple initial states', () => {
  const multiInit = makeAutomaton({
    type: AutomatonType.NFA,
    states: [
      { id: 'q0', name: 'q0', position: { x: 0, y: 0 }, isInitial: true, isAccepting: false },
      { id: 'q1', name: 'q1', position: { x: 100, y: 0 }, isInitial: true, isAccepting: false },
      { id: 'q2', name: 'q2', position: { x: 200, y: 0 }, isInitial: false, isAccepting: true },
    ],
    transitions: [
      { id: 't1', sourceId: 'q0', targetId: 'q2', symbols: ['a'] },
      { id: 't2', sourceId: 'q1', targetId: 'q2', symbols: ['b'] },
    ],
  });

  it('starts with both initial states', () => {
    const trace = buildSimulationTrace(multiInit, ['a']);
    expect(trace.snapshots[0]!.activeStateIds).toContain('q0');
    expect(trace.snapshots[0]!.activeStateIds).toContain('q1');
  });

  it('accepts "a" via q0 path', () => {
    expect(lastStatus(multiInit, ['a'])).toBe('accepted');
  });

  it('accepts "b" via q1 path', () => {
    expect(lastStatus(multiInit, ['b'])).toBe('accepted');
  });
});

describe('DFA: missing transition (partial DFA)', () => {
  const partial = makeAutomaton({
    states: [
      { id: 'q0', name: 'q0', position: { x: 0, y: 0 }, isInitial: true, isAccepting: false },
      { id: 'q1', name: 'q1', position: { x: 100, y: 0 }, isInitial: false, isAccepting: true },
    ],
    transitions: [
      { id: 't1', sourceId: 'q0', targetId: 'q1', symbols: ['a'] },
    ],
  });

  it('accepts "a"', () => {
    expect(lastStatus(partial, ['a'])).toBe('accepted');
  });

  it('rejects "b" — missing transition from q0', () => {
    const trace = buildSimulationTrace(partial, ['b']);
    expect(last(trace.snapshots).status).toBe('rejected');
    expect(last(trace.snapshots).activeStateIds).toEqual([]);
  });

  it('rejects "aa" — missing transition from q1 on "a"', () => {
    const trace = buildSimulationTrace(partial, ['a', 'a']);
    expect(trace.snapshots).toHaveLength(3);
    expect(trace.snapshots[1]!.activeStateIds).toEqual(['q1']);
    expect(trace.snapshots[2]!.activeStateIds).toEqual([]);
    expect(trace.snapshots[2]!.status).toBe('rejected');
  });

  it('stops trace early on dead end', () => {
    const trace = buildSimulationTrace(partial, ['b', 'a']);
    expect(trace.snapshots).toHaveLength(2);
    expect(trace.snapshots[1]!.status).toBe('rejected');
  });
});

describe('DFA: multi-symbol transitions', () => {
  const multiSym = makeAutomaton({
    alphabet: ['a', 'b', 'c'],
    states: [
      { id: 'q0', name: 'q0', position: { x: 0, y: 0 }, isInitial: true, isAccepting: false },
      { id: 'q1', name: 'q1', position: { x: 100, y: 0 }, isInitial: false, isAccepting: true },
    ],
    transitions: [
      { id: 't1', sourceId: 'q0', targetId: 'q1', symbols: ['a', 'b'] },
      { id: 't2', sourceId: 'q1', targetId: 'q1', symbols: ['a', 'b', 'c'] },
    ],
  });

  it('accepts "a"', () => {
    expect(lastStatus(multiSym, ['a'])).toBe('accepted');
  });

  it('accepts "b"', () => {
    expect(lastStatus(multiSym, ['b'])).toBe('accepted');
  });

  it('rejects "c" — no transition from q0 on c', () => {
    expect(lastStatus(multiSym, ['c'])).toBe('rejected');
  });

  it('accepts "abc"', () => {
    expect(lastStatus(multiSym, ['a', 'b', 'c'])).toBe('accepted');
  });
});

describe('NFA: diamond-shaped (fan-out and merge)', () => {
  const diamond = makeAutomaton({
    type: AutomatonType.NFA,
    states: [
      { id: 'q0', name: 'q0', position: { x: 0, y: 0 }, isInitial: true, isAccepting: false },
      { id: 'q1', name: 'q1', position: { x: 100, y: -50 }, isInitial: false, isAccepting: false },
      { id: 'q2', name: 'q2', position: { x: 100, y: 50 }, isInitial: false, isAccepting: false },
      { id: 'q3', name: 'q3', position: { x: 200, y: 0 }, isInitial: false, isAccepting: true },
    ],
    transitions: [
      { id: 't1', sourceId: 'q0', targetId: 'q1', symbols: ['a'] },
      { id: 't2', sourceId: 'q0', targetId: 'q2', symbols: ['a'] },
      { id: 't3', sourceId: 'q1', targetId: 'q3', symbols: ['b'] },
      { id: 't4', sourceId: 'q2', targetId: 'q3', symbols: ['b'] },
    ],
  });

  it('fans out to q1 and q2 after "a"', () => {
    const trace = buildSimulationTrace(diamond, ['a']);
    expect(trace.snapshots[1]!.activeStateIds).toHaveLength(2);
    expect(trace.snapshots[1]!.activeStateIds).toContain('q1');
    expect(trace.snapshots[1]!.activeStateIds).toContain('q2');
  });

  it('merges back to single q3 after "ab"', () => {
    const trace = buildSimulationTrace(diamond, ['a', 'b']);
    expect(trace.snapshots[2]!.activeStateIds).toEqual(['q3']);
    expect(trace.snapshots[2]!.status).toBe('accepted');
  });

  it('records all traversed transitions', () => {
    const trace = buildSimulationTrace(diamond, ['a', 'b']);
    expect(trace.snapshots[1]!.traversedTransitionIds).toContain('t1');
    expect(trace.snapshots[1]!.traversedTransitionIds).toContain('t2');
    expect(trace.snapshots[2]!.traversedTransitionIds).toContain('t3');
    expect(trace.snapshots[2]!.traversedTransitionIds).toContain('t4');
  });
});

describe('trace structure integrity', () => {
  it('snapshot steps are sequential', () => {
    const auto = makeAutomaton({
      states: [
        { id: 'q0', name: 'q0', position: { x: 0, y: 0 }, isInitial: true, isAccepting: true },
      ],
      transitions: [
        { id: 't1', sourceId: 'q0', targetId: 'q0', symbols: ['a', 'b'] },
      ],
    });
    const trace = buildSimulationTrace(auto, ['a', 'b', 'a', 'b', 'a']);
    for (let i = 0; i < trace.snapshots.length; i++) {
      expect(trace.snapshots[i]!.step).toBe(i);
    }
  });

  it('symbol indices are sequential', () => {
    const auto = makeAutomaton({
      states: [
        { id: 'q0', name: 'q0', position: { x: 0, y: 0 }, isInitial: true, isAccepting: true },
      ],
      transitions: [
        { id: 't1', sourceId: 'q0', targetId: 'q0', symbols: ['a', 'b'] },
      ],
    });
    const trace = buildSimulationTrace(auto, ['a', 'b', 'a']);
    expect(trace.snapshots[0]!.symbolIndex).toBe(-1);
    expect(trace.snapshots[1]!.symbolIndex).toBe(0);
    expect(trace.snapshots[2]!.symbolIndex).toBe(1);
    expect(trace.snapshots[3]!.symbolIndex).toBe(2);
  });

  it('only last snapshot can be accepted or rejected', () => {
    const auto = makeAutomaton({
      states: [
        { id: 'q0', name: 'q0', position: { x: 0, y: 0 }, isInitial: true, isAccepting: false },
        { id: 'q1', name: 'q1', position: { x: 100, y: 0 }, isInitial: false, isAccepting: true },
      ],
      transitions: [
        { id: 't1', sourceId: 'q0', targetId: 'q1', symbols: ['a'] },
        { id: 't2', sourceId: 'q1', targetId: 'q0', symbols: ['b'] },
      ],
    });
    const trace = buildSimulationTrace(auto, ['a', 'b', 'a']);
    for (let i = 0; i < trace.snapshots.length - 1; i++) {
      expect(trace.snapshots[i]!.status).toBe('running');
    }
    expect(last(trace.snapshots).status).toBe('accepted');
  });

  it('word is preserved in trace', () => {
    const auto = makeAutomaton({
      states: [
        { id: 'q0', name: 'q0', position: { x: 0, y: 0 }, isInitial: true, isAccepting: true },
      ],
    });
    const trace = buildSimulationTrace(auto, ['x', 'y', 'z']);
    expect(trace.word).toEqual(['x', 'y', 'z']);
  });
});

describe('NFA with epsilon transitions', () => {
  const EPS = '\u03B5';

  it('accepts empty word via simple epsilon chain', () => {
    // q0 --ε--> q1 --ε--> q2(accept)
    const auto = makeAutomaton({
      type: AutomatonType.NFA,
      states: [
        { id: 'q0', name: 'q0', position: { x: 0, y: 0 }, isInitial: true, isAccepting: false },
        { id: 'q1', name: 'q1', position: { x: 100, y: 0 }, isInitial: false, isAccepting: false },
        { id: 'q2', name: 'q2', position: { x: 200, y: 0 }, isInitial: false, isAccepting: true },
      ],
      transitions: [
        { id: 't1', sourceId: 'q0', targetId: 'q1', symbols: [EPS] },
        { id: 't2', sourceId: 'q1', targetId: 'q2', symbols: [EPS] },
      ],
    });
    const trace = buildSimulationTrace(auto, []);
    expect(trace.snapshots).toHaveLength(1);
    expect(trace.snapshots[0]!.status).toBe('accepted');
    // Epsilon closure should include all three states
    expect(trace.snapshots[0]!.activeStateIds).toContain('q0');
    expect(trace.snapshots[0]!.activeStateIds).toContain('q1');
    expect(trace.snapshots[0]!.activeStateIds).toContain('q2');
  });

  it('accepts word via epsilon closure at start', () => {
    // q0 --ε--> q1 --a--> q2(accept)
    const auto = makeAutomaton({
      type: AutomatonType.NFA,
      alphabet: ['a'],
      states: [
        { id: 'q0', name: 'q0', position: { x: 0, y: 0 }, isInitial: true, isAccepting: false },
        { id: 'q1', name: 'q1', position: { x: 100, y: 0 }, isInitial: false, isAccepting: false },
        { id: 'q2', name: 'q2', position: { x: 200, y: 0 }, isInitial: false, isAccepting: true },
      ],
      transitions: [
        { id: 't1', sourceId: 'q0', targetId: 'q1', symbols: [EPS] },
        { id: 't2', sourceId: 'q1', targetId: 'q2', symbols: ['a'] },
      ],
    });
    const trace = buildSimulationTrace(auto, ['a']);
    expect(last(trace.snapshots).status).toBe('accepted');
    // Step 0 should have {q0, q1} from epsilon closure
    expect(trace.snapshots[0]!.activeStateIds).toContain('q0');
    expect(trace.snapshots[0]!.activeStateIds).toContain('q1');
  });

  it('handles epsilon cycles without infinite loop', () => {
    // q0 --ε--> q1, q1 --ε--> q0, q1 --a--> q2(accept)
    const auto = makeAutomaton({
      type: AutomatonType.NFA,
      alphabet: ['a'],
      states: [
        { id: 'q0', name: 'q0', position: { x: 0, y: 0 }, isInitial: true, isAccepting: false },
        { id: 'q1', name: 'q1', position: { x: 100, y: 0 }, isInitial: false, isAccepting: false },
        { id: 'q2', name: 'q2', position: { x: 200, y: 0 }, isInitial: false, isAccepting: true },
      ],
      transitions: [
        { id: 't1', sourceId: 'q0', targetId: 'q1', symbols: [EPS] },
        { id: 't2', sourceId: 'q1', targetId: 'q0', symbols: [EPS] },
        { id: 't3', sourceId: 'q1', targetId: 'q2', symbols: ['a'] },
      ],
    });
    const trace = buildSimulationTrace(auto, ['a']);
    expect(last(trace.snapshots).status).toBe('accepted');
    expect(last(trace.snapshots).activeStateIds).toContain('q2');
  });

  it('applies epsilon closure after consuming a symbol', () => {
    // q0 --a--> q1, q1 --ε--> q2(accept)
    const auto = makeAutomaton({
      type: AutomatonType.NFA,
      alphabet: ['a'],
      states: [
        { id: 'q0', name: 'q0', position: { x: 0, y: 0 }, isInitial: true, isAccepting: false },
        { id: 'q1', name: 'q1', position: { x: 100, y: 0 }, isInitial: false, isAccepting: false },
        { id: 'q2', name: 'q2', position: { x: 200, y: 0 }, isInitial: false, isAccepting: true },
      ],
      transitions: [
        { id: 't1', sourceId: 'q0', targetId: 'q1', symbols: ['a'] },
        { id: 't2', sourceId: 'q1', targetId: 'q2', symbols: [EPS] },
      ],
    });
    const trace = buildSimulationTrace(auto, ['a']);
    expect(last(trace.snapshots).status).toBe('accepted');
    // After consuming 'a', epsilon closure gives {q1, q2}
    expect(last(trace.snapshots).activeStateIds).toContain('q1');
    expect(last(trace.snapshots).activeStateIds).toContain('q2');
  });

  it('handles multiple epsilon paths from initial state', () => {
    // q0 --ε--> q1, q0 --ε--> q2, q1 --a--> q3(accept), q2 --b--> q3(accept)
    const auto = makeAutomaton({
      type: AutomatonType.NFA,
      alphabet: ['a', 'b'],
      states: [
        { id: 'q0', name: 'q0', position: { x: 0, y: 0 }, isInitial: true, isAccepting: false },
        { id: 'q1', name: 'q1', position: { x: 100, y: 0 }, isInitial: false, isAccepting: false },
        { id: 'q2', name: 'q2', position: { x: 100, y: 100 }, isInitial: false, isAccepting: false },
        { id: 'q3', name: 'q3', position: { x: 200, y: 50 }, isInitial: false, isAccepting: true },
      ],
      transitions: [
        { id: 't1', sourceId: 'q0', targetId: 'q1', symbols: [EPS] },
        { id: 't2', sourceId: 'q0', targetId: 'q2', symbols: [EPS] },
        { id: 't3', sourceId: 'q1', targetId: 'q3', symbols: ['a'] },
        { id: 't4', sourceId: 'q2', targetId: 'q3', symbols: ['b'] },
      ],
    });
    expect(lastStatus(auto, ['a'])).toBe('accepted');
    expect(lastStatus(auto, ['b'])).toBe('accepted');
    expect(lastStatus(auto, ['a', 'b'])).toBe('rejected');
  });

  it('backward compatible — NFA without epsilon works unchanged', () => {
    // Standard NFA: q0 --a--> q1(accept), q0 --a--> q2
    const auto = makeAutomaton({
      type: AutomatonType.NFA,
      alphabet: ['a'],
      states: [
        { id: 'q0', name: 'q0', position: { x: 0, y: 0 }, isInitial: true, isAccepting: false },
        { id: 'q1', name: 'q1', position: { x: 100, y: 0 }, isInitial: false, isAccepting: true },
        { id: 'q2', name: 'q2', position: { x: 100, y: 100 }, isInitial: false, isAccepting: false },
      ],
      transitions: [
        { id: 't1', sourceId: 'q0', targetId: 'q1', symbols: ['a'] },
        { id: 't2', sourceId: 'q0', targetId: 'q2', symbols: ['a'] },
      ],
    });
    const trace = buildSimulationTrace(auto, ['a']);
    expect(last(trace.snapshots).status).toBe('accepted');
    expect(last(trace.snapshots).activeStateIds).toContain('q1');
    expect(last(trace.snapshots).activeStateIds).toContain('q2');
  });

  it('textbook NFA-ε for (a|b)*abb', () => {
    // Classic NFA-ε that recognizes strings ending in "abb"
    // q0 --ε--> q1, q1 --a,b--> q1, q1 --a--> q2, q2 --b--> q3, q3 --b--> q4(accept)
    const auto = makeAutomaton({
      type: AutomatonType.NFA,
      alphabet: ['a', 'b'],
      states: [
        { id: 'q0', name: 'q0', position: { x: 0, y: 0 }, isInitial: true, isAccepting: false },
        { id: 'q1', name: 'q1', position: { x: 100, y: 0 }, isInitial: false, isAccepting: false },
        { id: 'q2', name: 'q2', position: { x: 200, y: 0 }, isInitial: false, isAccepting: false },
        { id: 'q3', name: 'q3', position: { x: 300, y: 0 }, isInitial: false, isAccepting: false },
        { id: 'q4', name: 'q4', position: { x: 400, y: 0 }, isInitial: false, isAccepting: true },
      ],
      transitions: [
        { id: 't0', sourceId: 'q0', targetId: 'q1', symbols: [EPS] },
        { id: 't1', sourceId: 'q1', targetId: 'q1', symbols: ['a', 'b'] },
        { id: 't2', sourceId: 'q1', targetId: 'q2', symbols: ['a'] },
        { id: 't3', sourceId: 'q2', targetId: 'q3', symbols: ['b'] },
        { id: 't4', sourceId: 'q3', targetId: 'q4', symbols: ['b'] },
      ],
    });
    expect(lastStatus(auto, ['a', 'b', 'b'])).toBe('accepted');
    expect(lastStatus(auto, ['a', 'a', 'b', 'b'])).toBe('accepted');
    expect(lastStatus(auto, ['b', 'a', 'b', 'b'])).toBe('accepted');
    expect(lastStatus(auto, ['a', 'b', 'a'])).toBe('rejected');
    expect(lastStatus(auto, ['a', 'b'])).toBe('rejected');
    expect(lastStatus(auto, [])).toBe('rejected');
  });

  it('epsilon-only path to acceptance with dead branch on symbol', () => {
    // q0 --ε--> q1 --ε--> q2(accept), q0 --a--> q3(not accepting)
    const auto = makeAutomaton({
      type: AutomatonType.NFA,
      alphabet: ['a'],
      states: [
        { id: 'q0', name: 'q0', position: { x: 0, y: 0 }, isInitial: true, isAccepting: false },
        { id: 'q1', name: 'q1', position: { x: 100, y: 0 }, isInitial: false, isAccepting: false },
        { id: 'q2', name: 'q2', position: { x: 200, y: 0 }, isInitial: false, isAccepting: true },
        { id: 'q3', name: 'q3', position: { x: 100, y: 100 }, isInitial: false, isAccepting: false },
      ],
      transitions: [
        { id: 't1', sourceId: 'q0', targetId: 'q1', symbols: [EPS] },
        { id: 't2', sourceId: 'q1', targetId: 'q2', symbols: [EPS] },
        { id: 't3', sourceId: 'q0', targetId: 'q3', symbols: ['a'] },
      ],
    });
    expect(lastStatus(auto, [])).toBe('accepted');
    expect(lastStatus(auto, ['a'])).toBe('rejected');
  });

  it('includes epsilon transition IDs in traversed transitions', () => {
    // q0 --ε--> q1 --a--> q2, q2 --ε--> q3(accept)
    const auto = makeAutomaton({
      type: AutomatonType.NFA,
      alphabet: ['a'],
      states: [
        { id: 'q0', name: 'q0', position: { x: 0, y: 0 }, isInitial: true, isAccepting: false },
        { id: 'q1', name: 'q1', position: { x: 100, y: 0 }, isInitial: false, isAccepting: false },
        { id: 'q2', name: 'q2', position: { x: 200, y: 0 }, isInitial: false, isAccepting: false },
        { id: 'q3', name: 'q3', position: { x: 300, y: 0 }, isInitial: false, isAccepting: true },
      ],
      transitions: [
        { id: 'eps1', sourceId: 'q0', targetId: 'q1', symbols: [EPS] },
        { id: 'ta', sourceId: 'q1', targetId: 'q2', symbols: ['a'] },
        { id: 'eps2', sourceId: 'q2', targetId: 'q3', symbols: [EPS] },
      ],
    });
    const trace = buildSimulationTrace(auto, ['a']);
    // Step 0: epsilon closure includes eps1
    expect(trace.snapshots[0]!.traversedTransitionIds).toContain('eps1');
    // Step 1 (after 'a'): includes ta and eps2
    expect(trace.snapshots[1]!.traversedTransitionIds).toContain('ta');
    expect(trace.snapshots[1]!.traversedTransitionIds).toContain('eps2');
    expect(last(trace.snapshots).status).toBe('accepted');
  });
});

// --- Additional edge cases for epsilon closure and NFA behavior ---

describe('epsilon closure edge cases', () => {
  const EPS = '\u03B5';

  it('deduplicates when multiple parallel epsilon paths reach the same state', () => {
    // q0 --ε--> q1, q0 --ε--> q2, q1 --ε--> q3, q2 --ε--> q3
    // Both paths reach q3 — it should appear only once in activeStateIds.
    const auto = makeAutomaton({
      type: AutomatonType.NFA,
      alphabet: ['a'],
      states: [
        { id: 'q0', name: 'q0', position: { x: 0, y: 0 }, isInitial: true, isAccepting: false },
        { id: 'q1', name: 'q1', position: { x: 100, y: 0 }, isInitial: false, isAccepting: false },
        { id: 'q2', name: 'q2', position: { x: 100, y: 100 }, isInitial: false, isAccepting: false },
        { id: 'q3', name: 'q3', position: { x: 200, y: 0 }, isInitial: false, isAccepting: true },
      ],
      transitions: [
        { id: 'e1', sourceId: 'q0', targetId: 'q1', symbols: [EPS] },
        { id: 'e2', sourceId: 'q0', targetId: 'q2', symbols: [EPS] },
        { id: 'e3', sourceId: 'q1', targetId: 'q3', symbols: [EPS] },
        { id: 'e4', sourceId: 'q2', targetId: 'q3', symbols: [EPS] },
      ],
    });
    const trace = buildSimulationTrace(auto, []);
    // q3 should appear only once despite two epsilon paths
    const q3Count = trace.snapshots[0]!.activeStateIds.filter((id) => id === 'q3').length;
    expect(q3Count).toBe(1);
    expect(last(trace.snapshots).status).toBe('accepted');
  });

  it('follows long epsilon chain (3+ transitions)', () => {
    // q0 --ε--> q1 --ε--> q2 --ε--> q3(accept)
    const auto = makeAutomaton({
      type: AutomatonType.NFA,
      alphabet: [],
      states: [
        { id: 'q0', name: 'q0', position: { x: 0, y: 0 }, isInitial: true, isAccepting: false },
        { id: 'q1', name: 'q1', position: { x: 100, y: 0 }, isInitial: false, isAccepting: false },
        { id: 'q2', name: 'q2', position: { x: 200, y: 0 }, isInitial: false, isAccepting: false },
        { id: 'q3', name: 'q3', position: { x: 300, y: 0 }, isInitial: false, isAccepting: true },
      ],
      transitions: [
        { id: 'e1', sourceId: 'q0', targetId: 'q1', symbols: [EPS] },
        { id: 'e2', sourceId: 'q1', targetId: 'q2', symbols: [EPS] },
        { id: 'e3', sourceId: 'q2', targetId: 'q3', symbols: [EPS] },
      ],
    });
    const trace = buildSimulationTrace(auto, []);
    // All four states reachable at step 0 via epsilon chain
    expect(trace.snapshots[0]!.activeStateIds).toContain('q0');
    expect(trace.snapshots[0]!.activeStateIds).toContain('q1');
    expect(trace.snapshots[0]!.activeStateIds).toContain('q2');
    expect(trace.snapshots[0]!.activeStateIds).toContain('q3');
    expect(last(trace.snapshots).status).toBe('accepted');
  });

  it('handles epsilon only from non-initial state', () => {
    // q0 --a--> q1 --ε--> q2(accept)
    // No epsilon from q0, so step 0 has only {q0}
    const auto = makeAutomaton({
      type: AutomatonType.NFA,
      alphabet: ['a'],
      states: [
        { id: 'q0', name: 'q0', position: { x: 0, y: 0 }, isInitial: true, isAccepting: false },
        { id: 'q1', name: 'q1', position: { x: 100, y: 0 }, isInitial: false, isAccepting: false },
        { id: 'q2', name: 'q2', position: { x: 200, y: 0 }, isInitial: false, isAccepting: true },
      ],
      transitions: [
        { id: 't1', sourceId: 'q0', targetId: 'q1', symbols: ['a'] },
        { id: 'e1', sourceId: 'q1', targetId: 'q2', symbols: [EPS] },
      ],
    });
    const trace = buildSimulationTrace(auto, ['a']);
    // Step 0: only q0 (no epsilon from initial)
    expect(trace.snapshots[0]!.activeStateIds).toEqual(['q0']);
    // Step 1: q1 + epsilon closure to q2
    expect(trace.snapshots[1]!.activeStateIds).toContain('q1');
    expect(trace.snapshots[1]!.activeStateIds).toContain('q2');
    expect(last(trace.snapshots).status).toBe('accepted');
  });
});

describe('NFA additional edge cases', () => {
  it('NFA where all branches die mid-word', () => {
    // q0 --a--> q1, no transitions from q1 on 'b'
    const auto = makeAutomaton({
      type: AutomatonType.NFA,
      alphabet: ['a', 'b'],
      states: [
        { id: 'q0', name: 'q0', position: { x: 0, y: 0 }, isInitial: true, isAccepting: false },
        { id: 'q1', name: 'q1', position: { x: 100, y: 0 }, isInitial: false, isAccepting: true },
      ],
      transitions: [
        { id: 't1', sourceId: 'q0', targetId: 'q1', symbols: ['a'] },
      ],
    });
    const trace = buildSimulationTrace(auto, ['a', 'b']);
    // After 'b' from q1, all branches die
    expect(last(trace.snapshots).status).toBe('rejected');
    expect(last(trace.snapshots).activeStateIds).toEqual([]);
  });

  it('NFA self-loop with both epsilon and regular symbol', () => {
    // q0 has self-loop on 'a' and epsilon to q1(accept)
    const EPS = '\u03B5';
    const auto = makeAutomaton({
      type: AutomatonType.NFA,
      alphabet: ['a'],
      states: [
        { id: 'q0', name: 'q0', position: { x: 0, y: 0 }, isInitial: true, isAccepting: false },
        { id: 'q1', name: 'q1', position: { x: 100, y: 0 }, isInitial: false, isAccepting: true },
      ],
      transitions: [
        { id: 't1', sourceId: 'q0', targetId: 'q0', symbols: ['a'] },
        { id: 'e1', sourceId: 'q0', targetId: 'q1', symbols: [EPS] },
      ],
    });
    // Even with 'a' (self-loop), epsilon to q1 means acceptance
    const trace = buildSimulationTrace(auto, ['a']);
    expect(last(trace.snapshots).status).toBe('accepted');
  });

  it('NFA with transition to non-existent target state does not crash', () => {
    // Transition references a targetId that doesn't match any state
    const auto = makeAutomaton({
      type: AutomatonType.NFA,
      alphabet: ['a'],
      states: [
        { id: 'q0', name: 'q0', position: { x: 0, y: 0 }, isInitial: true, isAccepting: false },
      ],
      transitions: [
        { id: 't1', sourceId: 'q0', targetId: 'nonexistent', symbols: ['a'] },
      ],
    });
    // Should not throw — the branch just won't find an accepting state
    const trace = buildSimulationTrace(auto, ['a']);
    expect(trace.snapshots).toBeDefined();
    expect(trace.snapshots).toHaveLength(2); // step 0 (initial) + step 1 (after 'a')
    expect(trace.snapshots[0]!.activeStateIds).toContain('q0');
    // After consuming 'a', the branch to nonexistent state dies — no active states
    expect(trace.snapshots[1]!.activeStateIds).toHaveLength(0);
    expect(last(trace.snapshots).status).toBe('rejected');
  });
});

describe('trace edge cases', () => {
  it('single-state automaton with no transitions accepts empty word if accepting', () => {
    const auto = makeAutomaton({
      states: [
        { id: 'q0', name: 'q0', position: { x: 0, y: 0 }, isInitial: true, isAccepting: true },
      ],
      transitions: [],
    });
    expect(lastStatus(auto, [])).toBe('accepted');
    // Non-empty word should be rejected (no transitions)
    expect(lastStatus(auto, ['a'])).toBe('rejected');
  });

  it('automaton with no states returns a valid rejected trace', () => {
    const auto = makeAutomaton({
      states: [],
      transitions: [],
    });
    const trace = buildSimulationTrace(auto, ['a']);
    expect(trace.snapshots).toHaveLength(1);
    expect(trace.snapshots[0]!.status).toBe('rejected');
    expect(trace.snapshots[0]!.activeStateIds).toEqual([]);
  });
});

// ── PDA simulation tests ──

function makePdaRule(input: string, pop: string, push: string[]): PdaRule {
  return { inputSymbol: input, stackPop: pop, stackPush: push };
}

describe('PDA: a^n b^n (classic)', () => {
  // PDA for { a^n b^n | n >= 1 }
  // q0: push A for each 'a', then epsilon to q1
  // q1: pop A for each 'b'
  // q2: accepting (final state) — reached when stack has only Z₀
  const anbn = makeAutomaton({
    type: AutomatonType.PDA,
    alphabet: ['a', 'b'],
    acceptanceMode: 'finalState',
    states: [
      { id: 'q0', name: 'q0', position: { x: 0, y: 0 }, isInitial: true, isAccepting: false },
      { id: 'q1', name: 'q1', position: { x: 100, y: 0 }, isInitial: false, isAccepting: false },
      { id: 'q2', name: 'q2', position: { x: 200, y: 0 }, isInitial: false, isAccepting: true },
    ],
    transitions: [
      // Read 'a', push A onto stack (regardless of stack top for first push, or A on top for subsequent)
      { id: 't1', sourceId: 'q0', targetId: 'q0', symbols: [], pdaRules: [makePdaRule('a', STACK_BOTTOM, ['A', STACK_BOTTOM])] },
      { id: 't2', sourceId: 'q0', targetId: 'q0', symbols: [], pdaRules: [makePdaRule('a', 'A', ['A', 'A'])] },
      // Epsilon transition to switch to popping phase
      { id: 't3', sourceId: 'q0', targetId: 'q1', symbols: [], pdaRules: [makePdaRule(EPSILON, 'A', ['A'])] },
      // Read 'b', pop A
      { id: 't4', sourceId: 'q1', targetId: 'q1', symbols: [], pdaRules: [makePdaRule('b', 'A', [])] },
      // When stack bottom reached, go to accepting state
      { id: 't5', sourceId: 'q1', targetId: 'q2', symbols: [], pdaRules: [makePdaRule(EPSILON, STACK_BOTTOM, [STACK_BOTTOM])] },
    ],
  });

  it('accepts "ab"', () => {
    expect(lastStatus(anbn, ['a', 'b'])).toBe('accepted');
  });

  it('accepts "aabb"', () => {
    expect(lastStatus(anbn, ['a', 'a', 'b', 'b'])).toBe('accepted');
  });

  it('accepts "aaabbb"', () => {
    expect(lastStatus(anbn, ['a', 'a', 'a', 'b', 'b', 'b'])).toBe('accepted');
  });

  it('rejects "aab" (unbalanced)', () => {
    expect(lastStatus(anbn, ['a', 'a', 'b'])).toBe('rejected');
  });

  it('rejects "abb" (too many b)', () => {
    expect(lastStatus(anbn, ['a', 'b', 'b'])).toBe('rejected');
  });

  it('rejects "ba" (wrong order)', () => {
    expect(lastStatus(anbn, ['b', 'a'])).toBe('rejected');
  });

  it('rejects empty word', () => {
    expect(lastStatus(anbn, [])).toBe('rejected');
  });

  it('includes configurations in snapshots', () => {
    const trace = buildSimulationTrace(anbn, ['a', 'b']);
    expect(trace.snapshots[0]!.configurations).toBeDefined();
    expect(trace.snapshots[0]!.configurations!.length).toBeGreaterThan(0);
    // Initial config should have stack with Z₀
    expect(trace.snapshots[0]!.configurations![0]!.stack).toContain(STACK_BOTTOM);
  });
});

describe('PDA: empty stack acceptance', () => {
  // Simple PDA that accepts by empty stack: read 'a', pop Z₀
  const emptyStackPda = makeAutomaton({
    type: AutomatonType.PDA,
    alphabet: ['a'],
    acceptanceMode: 'emptyStack',
    states: [
      { id: 'q0', name: 'q0', position: { x: 0, y: 0 }, isInitial: true, isAccepting: false },
      { id: 'q1', name: 'q1', position: { x: 100, y: 0 }, isInitial: false, isAccepting: false },
    ],
    transitions: [
      { id: 't1', sourceId: 'q0', targetId: 'q1', symbols: [], pdaRules: [makePdaRule('a', STACK_BOTTOM, [])] },
    ],
  });

  it('accepts "a" (stack becomes empty)', () => {
    expect(lastStatus(emptyStackPda, ['a'])).toBe('accepted');
  });

  it('rejects empty word (stack still has Z₀)', () => {
    expect(lastStatus(emptyStackPda, [])).toBe('rejected');
  });

  it('rejects "aa" (no transition from q1)', () => {
    expect(lastStatus(emptyStackPda, ['a', 'a'])).toBe('rejected');
  });
});

describe('PDA: epsilon transitions', () => {
  // PDA with epsilon input transitions
  const epsPda = makeAutomaton({
    type: AutomatonType.PDA,
    alphabet: ['a'],
    acceptanceMode: 'finalState',
    states: [
      { id: 'q0', name: 'q0', position: { x: 0, y: 0 }, isInitial: true, isAccepting: false },
      { id: 'q1', name: 'q1', position: { x: 100, y: 0 }, isInitial: false, isAccepting: true },
    ],
    transitions: [
      // Epsilon transition: don't consume input, don't change stack, go to accepting
      { id: 't1', sourceId: 'q0', targetId: 'q1', symbols: [], pdaRules: [makePdaRule(EPSILON, EPSILON, [])] },
    ],
  });

  it('accepts empty word via epsilon transition', () => {
    expect(lastStatus(epsPda, [])).toBe('accepted');
  });
});

describe('PDA: no initial state', () => {
  it('rejects when no initial state exists', () => {
    const pda = makeAutomaton({
      type: AutomatonType.PDA,
      states: [],
    });
    const trace = buildSimulationTrace(pda, ['a']);
    expect(trace.snapshots).toHaveLength(1);
    expect(trace.snapshots[0]!.status).toBe('rejected');
  });
});

describe('PDA: nondeterministic branching', () => {
  // PDA with two rules on same input — creates branching configurations
  const ndPda = makeAutomaton({
    type: AutomatonType.PDA,
    alphabet: ['a'],
    acceptanceMode: 'finalState',
    states: [
      { id: 'q0', name: 'q0', position: { x: 0, y: 0 }, isInitial: true, isAccepting: false },
      { id: 'q1', name: 'q1', position: { x: 100, y: 0 }, isInitial: false, isAccepting: true },
      { id: 'q2', name: 'q2', position: { x: 100, y: 100 }, isInitial: false, isAccepting: false },
    ],
    transitions: [
      { id: 't1', sourceId: 'q0', targetId: 'q1', symbols: [], pdaRules: [makePdaRule('a', STACK_BOTTOM, [STACK_BOTTOM])] },
      { id: 't2', sourceId: 'q0', targetId: 'q2', symbols: [], pdaRules: [makePdaRule('a', STACK_BOTTOM, [STACK_BOTTOM])] },
    ],
  });

  it('accepts when any branch reaches accepting state', () => {
    expect(lastStatus(ndPda, ['a'])).toBe('accepted');
  });

  it('has multiple configurations after branching', () => {
    const trace = buildSimulationTrace(ndPda, ['a']);
    const lastSnap = last(trace.snapshots);
    expect(lastSnap.configurations!.length).toBe(2);
  });
});

describe('PDA: peek mode', () => {
  function makePeekPda(overrides: Partial<Automaton> = {}): Automaton {
    return makeAutomaton({
      type: AutomatonType.PDA,
      alphabet: ['a'],
      acceptanceMode: 'finalState',
      pdaStackMode: 'peek',
      states: [
        { id: 'q0', name: 'q0', position: { x: 0, y: 0 }, isInitial: true, isAccepting: false },
        { id: 'q1', name: 'q1', position: { x: 100, y: 0 }, isInitial: false, isAccepting: true },
      ],
      ...overrides,
    });
  }

  it('nop: stack unchanged after peek', () => {
    const pda = makePeekPda({
      transitions: [
        {
          id: 't1', sourceId: 'q0', targetId: 'q1', symbols: [],
          pdaRules: [{ inputSymbol: 'a', stackPop: STACK_BOTTOM, stackPush: [], peekAction: 'nop' }],
        },
      ],
    });
    const trace = buildSimulationTrace(pda, ['a']);
    const lastSnap = last(trace.snapshots);
    expect(lastSnap.status).toBe('accepted');
    // Stack should still contain STACK_BOTTOM (nop = no change)
    expect(lastSnap.configurations![0]!.stack).toEqual([STACK_BOTTOM]);
  });

  it('push: new symbols added on top, peeked symbol stays', () => {
    const pda = makePeekPda({
      transitions: [
        {
          id: 't1', sourceId: 'q0', targetId: 'q1', symbols: [],
          pdaRules: [{ inputSymbol: 'a', stackPop: STACK_BOTTOM, stackPush: ['X'], peekAction: 'push' }],
        },
      ],
    });
    const trace = buildSimulationTrace(pda, ['a']);
    const lastSnap = last(trace.snapshots);
    expect(lastSnap.status).toBe('accepted');
    // X pushed on top, STACK_BOTTOM stays beneath
    expect(lastSnap.configurations![0]!.stack).toEqual(['X', STACK_BOTTOM]);
  });

  it('pop: peeked symbol consumed (same as pop mode)', () => {
    const pda = makePeekPda({
      transitions: [
        {
          id: 't1', sourceId: 'q0', targetId: 'q1', symbols: [],
          pdaRules: [{ inputSymbol: 'a', stackPop: STACK_BOTTOM, stackPush: ['X'], peekAction: 'pop' }],
        },
      ],
    });
    const trace = buildSimulationTrace(pda, ['a']);
    const lastSnap = last(trace.snapshots);
    expect(lastSnap.status).toBe('accepted');
    // STACK_BOTTOM consumed, X pushed
    expect(lastSnap.configurations![0]!.stack).toEqual(['X']);
  });

  it('peek does not fire when top does not match', () => {
    const pda = makePeekPda({
      transitions: [
        {
          id: 't1', sourceId: 'q0', targetId: 'q1', symbols: [],
          pdaRules: [{ inputSymbol: 'a', stackPop: 'Z', stackPush: [], peekAction: 'nop' }],
        },
      ],
    });
    // Stack top is STACK_BOTTOM, rule peeks for 'Z' — should not match
    expect(lastStatus(pda, ['a'])).toBe('rejected');
  });

  it('peek mode defaults to pop behavior when peekAction is undefined', () => {
    // When peekAction is missing in peek mode, simulator defaults to 'pop'
    const pda = makePeekPda({
      transitions: [
        {
          id: 't1', sourceId: 'q0', targetId: 'q1', symbols: [],
          pdaRules: [{ inputSymbol: 'a', stackPop: STACK_BOTTOM, stackPush: ['X'] }],
        },
      ],
    });
    const trace = buildSimulationTrace(pda, ['a']);
    const lastSnap = last(trace.snapshots);
    expect(lastSnap.status).toBe('accepted');
    expect(lastSnap.configurations![0]!.stack).toEqual(['X']);
  });
});

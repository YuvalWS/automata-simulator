import { describe, it, expect } from 'vitest';
import { buildSimulationTrace } from '@/services/simulation/simulator';
import type { SimulationSnapshot } from '@/services/simulation/simulator';
import type { Automaton } from '@/models/automaton';
import { AutomatonType } from '@/models/types';

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

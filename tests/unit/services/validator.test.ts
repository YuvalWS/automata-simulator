/**
 * Tests for validator.ts
 *
 * The validator checks automata for structural issues (missing initial state,
 * DFA conflicts, epsilon in DFA) and validates input words against the alphabet.
 * Validation errors block simulation; warnings are displayed but allow simulation.
 */
import { describe, it, expect } from 'vitest';
import { validateAutomaton, validateWord, findOutOfAlphabetTransitions } from '@/services/simulation/validator';
import type { Automaton } from '@/models/automaton';
import { AutomatonType } from '@/models/types';
import { EPSILON, STACK_BOTTOM } from '@/models/epsilon';

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

  it('errors when DFA has epsilon transitions', () => {
    const auto = makeAutomaton({
      type: AutomatonType.DFA,
      transitions: [
        { id: 't1', sourceId: 'q0', targetId: 'q1', symbols: ['\u03B5'] },
      ],
    });
    const msgs = validateAutomaton(auto);
    expect(msgs.some((m) => m.type === 'error' && m.message.includes('\u03B5-transitions'))).toBe(true);
    expect(msgs.some((m) => m.action?.key === 'switch-nfa')).toBe(true);
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

describe('findOutOfAlphabetTransitions', () => {
  it('returns [] when all transition symbols are in the alphabet', () => {
    expect(findOutOfAlphabetTransitions(makeAutomaton())).toEqual([]);
  });

  it('returns [] when the alphabet is empty (nothing to check against)', () => {
    const auto = makeAutomaton({
      alphabet: [],
      transitions: [{ id: 't1', sourceId: 'q0', targetId: 'q1', symbols: ['c'] }],
    });
    expect(findOutOfAlphabetTransitions(auto)).toEqual([]);
  });

  it('detects a transition symbol not in the alphabet and reports source/target names', () => {
    const auto = makeAutomaton({
      transitions: [
        { id: 't1', sourceId: 'q0', targetId: 'q1', symbols: ['a'] },
        { id: 't2', sourceId: 'q1', targetId: 'q1', symbols: ['c'] },
      ],
    });
    expect(findOutOfAlphabetTransitions(auto)).toEqual([
      { transitionId: 't2', sourceName: 'q1', targetName: 'q1', symbols: ['c'] },
    ]);
  });

  it('reports each offending transition with its distinct out-of-alphabet symbols', () => {
    const auto = makeAutomaton({
      transitions: [
        { id: 't1', sourceId: 'q0', targetId: 'q1', symbols: ['c', 'd', 'c'] },
      ],
    });
    const result = findOutOfAlphabetTransitions(auto);
    expect(result).toHaveLength(1);
    expect(result[0]!.symbols.sort()).toEqual(['c', 'd']);
  });

  it('ignores epsilon', () => {
    const auto = makeAutomaton({
      type: AutomatonType.NFA,
      transitions: [{ id: 't1', sourceId: 'q0', targetId: 'q1', symbols: [EPSILON] }],
    });
    expect(findOutOfAlphabetTransitions(auto)).toEqual([]);
  });

  it('checks PDA input symbols against the alphabet', () => {
    const pda = makeAutomaton({
      type: AutomatonType.PDA,
      transitions: [
        { id: 't1', sourceId: 'q0', targetId: 'q1', symbols: [], pdaRules: [{ inputSymbol: 'z', stackPop: STACK_BOTTOM, stackPush: [] }] },
      ],
    });
    expect(findOutOfAlphabetTransitions(pda)).toEqual([
      { transitionId: 't1', sourceName: 'q0', targetName: 'q1', symbols: ['z'] },
    ]);
  });

  it('returns [] for TM (tape symbols are not bound by the input alphabet)', () => {
    const tm = makeAutomaton({
      type: AutomatonType.TM,
      transitions: [
        { id: 't1', sourceId: 'q0', targetId: 'q1', symbols: [], tmRules: [{ readSymbols: ['z'], direction: 'R' }] },
      ],
    });
    expect(findOutOfAlphabetTransitions(tm)).toEqual([]);
  });
});

// --- Additional edge cases ---

describe('validateAutomaton edge cases', () => {
  // DFA conflict: self-loop uses the same symbol as an outgoing transition
  it('detects DFA conflict between self-loop and outgoing transition on same symbol', () => {
    const auto: Automaton = {
      id: 'test', name: 'Test', type: AutomatonType.DFA, alphabet: ['a'],
      states: [
        { id: 'q0', name: 'q0', position: { x: 0, y: 0 }, isInitial: true, isAccepting: false },
        { id: 'q1', name: 'q1', position: { x: 100, y: 0 }, isInitial: false, isAccepting: true },
      ],
      transitions: [
        { id: 't1', sourceId: 'q0', targetId: 'q0', symbols: ['a'] }, // self-loop
        { id: 't2', sourceId: 'q0', targetId: 'q1', symbols: ['a'] }, // outgoing
      ],
      viewport: { panX: 0, panY: 0, zoom: 1 },
    };
    const msgs = validateAutomaton(auto);
    expect(msgs.some((m) => m.type === 'error' && m.message.includes('DFA conflict'))).toBe(true);
  });

  // NFA allows multiple transitions on same symbol — no conflict error
  it('NFA allows multiple transitions on same symbol without conflict error', () => {
    const auto: Automaton = {
      id: 'test', name: 'Test', type: AutomatonType.NFA, alphabet: ['a'],
      states: [
        { id: 'q0', name: 'q0', position: { x: 0, y: 0 }, isInitial: true, isAccepting: false },
        { id: 'q1', name: 'q1', position: { x: 100, y: 0 }, isInitial: false, isAccepting: true },
        { id: 'q2', name: 'q2', position: { x: 200, y: 0 }, isInitial: false, isAccepting: false },
      ],
      transitions: [
        { id: 't1', sourceId: 'q0', targetId: 'q1', symbols: ['a'] },
        { id: 't2', sourceId: 'q0', targetId: 'q2', symbols: ['a'] },
      ],
      viewport: { panX: 0, panY: 0, zoom: 1 },
    };
    const msgs = validateAutomaton(auto);
    expect(msgs.filter((m) => m.type === 'error')).toHaveLength(0);
  });

  // Empty automaton (no states at all) should report "no initial state"
  it('empty automaton with no states produces no-initial-state error', () => {
    const auto: Automaton = {
      id: 'test', name: 'Test', type: AutomatonType.DFA, alphabet: ['a'],
      states: [],
      transitions: [],
      viewport: { panX: 0, panY: 0, zoom: 1 },
    };
    const msgs = validateAutomaton(auto);
    expect(msgs.some((m) => m.type === 'error' && m.message.includes('No initial state'))).toBe(true);
  });

  // DFA with initial state but no transitions warns about missing transitions
  it('DFA with initial state but no transitions warns about missing transitions', () => {
    const auto: Automaton = {
      id: 'test', name: 'Test', type: AutomatonType.DFA, alphabet: ['a', 'b'],
      states: [
        { id: 'q0', name: 'q0', position: { x: 0, y: 0 }, isInitial: true, isAccepting: false },
      ],
      transitions: [],
      viewport: { panX: 0, panY: 0, zoom: 1 },
    };
    const msgs = validateAutomaton(auto);
    const missingWarnings = msgs.filter((m) => m.type === 'warning' && m.message.includes('no transition'));
    // q0 should have warnings for both 'a' and 'b'
    expect(missingWarnings).toHaveLength(2);
  });

  // DFA with multiple transitions from same state to different targets on same symbol
  it('DFA detects conflict when same symbol goes to different targets', () => {
    const auto: Automaton = {
      id: 'test', name: 'Test', type: AutomatonType.DFA, alphabet: ['a'],
      states: [
        { id: 'q0', name: 'q0', position: { x: 0, y: 0 }, isInitial: true, isAccepting: false },
        { id: 'q1', name: 'q1', position: { x: 100, y: 0 }, isInitial: false, isAccepting: true },
        { id: 'q2', name: 'q2', position: { x: 200, y: 0 }, isInitial: false, isAccepting: false },
      ],
      transitions: [
        { id: 't1', sourceId: 'q0', targetId: 'q1', symbols: ['a'] },
        { id: 't2', sourceId: 'q0', targetId: 'q2', symbols: ['a'] },
      ],
      viewport: { panX: 0, panY: 0, zoom: 1 },
    };
    const msgs = validateAutomaton(auto);
    expect(msgs.some((m) => m.type === 'error' && m.message.includes('DFA conflict') && m.message.includes('"a"'))).toBe(true);
  });
});

describe('PDA validation', () => {
  it('returns no errors for valid PDA', () => {
    const pda = makeAutomaton({
      type: AutomatonType.PDA,
      acceptanceMode: 'finalState',
      transitions: [
        { id: 't1', sourceId: 'q0', targetId: 'q1', symbols: [], pdaRules: [{ inputSymbol: 'a', stackPop: STACK_BOTTOM, stackPush: ['A', STACK_BOTTOM] }] },
      ],
    });
    const msgs = validateAutomaton(pda);
    expect(msgs.filter((m) => m.type === 'error')).toHaveLength(0);
  });

  it('errors when PDA has no initial state', () => {
    const pda = makeAutomaton({
      type: AutomatonType.PDA,
      states: [
        { id: 'q0', name: 'q0', position: { x: 0, y: 0 }, isInitial: false, isAccepting: false },
      ],
    });
    const msgs = validateAutomaton(pda);
    expect(msgs.some((m) => m.type === 'error' && m.message.includes('No initial state'))).toBe(true);
  });

  it('warns when no transitions use stack operations', () => {
    const pda = makeAutomaton({
      type: AutomatonType.PDA,
      transitions: [
        { id: 't1', sourceId: 'q0', targetId: 'q1', symbols: [], pdaRules: [{ inputSymbol: 'a', stackPop: EPSILON, stackPush: [] }] },
      ],
    });
    const msgs = validateAutomaton(pda);
    expect(msgs.some((m) => m.type === 'warning' && m.message.includes('stack operations'))).toBe(true);
  });

  it('warns when emptyStack mode but accepting states exist', () => {
    const pda = makeAutomaton({
      type: AutomatonType.PDA,
      acceptanceMode: 'emptyStack',
      transitions: [
        { id: 't1', sourceId: 'q0', targetId: 'q1', symbols: [], pdaRules: [{ inputSymbol: 'a', stackPop: STACK_BOTTOM, stackPush: [] }] },
      ],
    });
    const msgs = validateAutomaton(pda);
    expect(msgs.some((m) => m.type === 'warning' && m.message.includes('empty-stack'))).toBe(true);
  });

  // ---------- TM validation ----------

  it('TM: errors on DTM duplicate rule for same (state, readSymbol)', () => {
    const tm = makeAutomaton({
      type: AutomatonType.TM,
      tmMode: 'deterministic',
      tmBlankSymbol: '⊔',
      acceptanceMode: 'finalState',
      transitions: [
        { id: 't1', sourceId: 'q0', targetId: 'q1', symbols: [], tmRules: [{ readSymbols: ['a'], writeSymbol: 'a', direction: 'R' }] },
        { id: 't2', sourceId: 'q0', targetId: 'q1', symbols: [], tmRules: [{ readSymbols: ['a'], writeSymbol: 'b', direction: 'L' }] },
      ],
    });
    const msgs = validateAutomaton(tm);
    const conflict = msgs.find((m) => m.type === 'error' && m.message.includes('DTM conflict'));
    expect(conflict).toBeDefined();
    expect(conflict!.action?.key).toBe('switch-ntm');
  });

  it('TM: no duplicate-rule error in nondeterministic mode', () => {
    const tm = makeAutomaton({
      type: AutomatonType.TM,
      tmMode: 'nondeterministic',
      tmBlankSymbol: '⊔',
      acceptanceMode: 'finalState',
      transitions: [
        { id: 't1', sourceId: 'q0', targetId: 'q1', symbols: [], tmRules: [{ readSymbols: ['a'], writeSymbol: 'a', direction: 'R' }] },
        { id: 't2', sourceId: 'q0', targetId: 'q1', symbols: [], tmRules: [{ readSymbols: ['a'], writeSymbol: 'b', direction: 'L' }] },
      ],
    });
    const msgs = validateAutomaton(tm);
    expect(msgs.filter((m) => m.type === 'error' && m.message.includes('DTM conflict'))).toHaveLength(0);
  });

  it('TM: warns when transitions exist but no tmRules anywhere', () => {
    const tm = makeAutomaton({
      type: AutomatonType.TM,
      tmMode: 'deterministic',
      tmBlankSymbol: '⊔',
      acceptanceMode: 'finalState',
      transitions: [
        { id: 't1', sourceId: 'q0', targetId: 'q1', symbols: ['a'] },
      ],
    });
    const msgs = validateAutomaton(tm);
    expect(msgs.some((m) => m.type === 'warning' && m.message.includes('TM rules'))).toBe(true);
  });

  it('TM: warns when haltOnAccept and accepting states are present', () => {
    const tm = makeAutomaton({
      type: AutomatonType.TM,
      tmMode: 'deterministic',
      tmBlankSymbol: '⊔',
      acceptanceMode: 'haltOnAccept',
      transitions: [
        { id: 't1', sourceId: 'q0', targetId: 'q1', symbols: [], tmRules: [{ readSymbols: ['a'], writeSymbol: 'a', direction: 'R' }] },
      ],
    });
    const msgs = validateAutomaton(tm);
    expect(msgs.some((m) => m.type === 'warning' && m.message.includes('halt-on-accept'))).toBe(true);
  });

  it('TM: errors when no initial state', () => {
    const tm = makeAutomaton({
      type: AutomatonType.TM,
      tmMode: 'deterministic',
      tmBlankSymbol: '⊔',
      acceptanceMode: 'finalState',
      states: [
        { id: 'q0', name: 'q0', position: { x: 0, y: 0 }, isInitial: false, isAccepting: false },
      ],
      transitions: [],
    });
    const msgs = validateAutomaton(tm);
    expect(msgs.some((m) => m.type === 'error' && m.message.toLowerCase().includes('initial'))).toBe(true);
  });

  it('TM: DTM conflict when two rules overlap on even one read symbol', () => {
    const tm = makeAutomaton({
      type: AutomatonType.TM,
      tmMode: 'deterministic',
      tmBlankSymbol: '⊔',
      acceptanceMode: 'finalState',
      transitions: [
        { id: 't1', sourceId: 'q0', targetId: 'q1', symbols: [], tmRules: [
          { readSymbols: ['0', '1'], direction: 'R' },
        ] },
        { id: 't2', sourceId: 'q0', targetId: 'q1', symbols: [], tmRules: [
          { readSymbols: ['1', '2'], direction: 'L' },
        ] },
      ],
    });
    const msgs = validateAutomaton(tm);
    const conflict = msgs.find((m) => m.type === 'error' && m.message.includes('DTM conflict'));
    expect(conflict).toBeDefined();
    expect(conflict!.message).toMatch(/read symbol "1"/);
  });

  it('TM: a single multi-read rule does not conflict with itself', () => {
    const tm = makeAutomaton({
      type: AutomatonType.TM,
      tmMode: 'deterministic',
      tmBlankSymbol: '⊔',
      acceptanceMode: 'finalState',
      transitions: [
        { id: 't1', sourceId: 'q0', targetId: 'q1', symbols: [], tmRules: [
          { readSymbols: ['0', '1', '2'], direction: 'R' },
        ] },
      ],
    });
    const msgs = validateAutomaton(tm);
    expect(msgs.filter((m) => m.type === 'error' && m.message.includes('DTM conflict'))).toHaveLength(0);
  });
});

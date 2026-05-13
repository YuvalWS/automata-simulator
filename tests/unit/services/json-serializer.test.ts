/**
 * Tests for json-serializer.ts
 *
 * The serializer converts automata to/from JSON for saving and loading files.
 * It wraps automata in a versioned SaveFile envelope and validates structure
 * via Zod schema. Correct serialization is critical — bugs here cause data loss
 * or corrupt file loads.
 */
import { describe, it, expect } from 'vitest';
import { serializeToJson, deserializeFromJson } from '@/services/serialization/json-serializer';
import { normalizeEpsilon } from '@/models/epsilon';
import type { Automaton } from '@/models/automaton';
import { AutomatonType } from '@/models/types';
import { EPSILON } from '@/models/epsilon';

function createTestAutomaton(): Automaton {
  return {
    id: 'test-id',
    name: 'Test DFA',
    type: AutomatonType.DFA,
    alphabet: ['a', 'b'],
    states: [
      { id: 's1', name: 'q0', position: { x: 100, y: 200 }, isInitial: true, isAccepting: false },
      { id: 's2', name: 'q1', position: { x: 300, y: 200 }, isInitial: false, isAccepting: true },
    ],
    transitions: [
      { id: 't1', sourceId: 's1', targetId: 's2', symbols: ['a'] },
      { id: 't2', sourceId: 's2', targetId: 's2', symbols: ['a', 'b'] },
      { id: 't3', sourceId: 's2', targetId: 's1', symbols: ['b'], controlPointOffset: { x: 0, y: -20 } },
    ],
    viewport: { panX: 50, panY: 30, zoom: 1.5 },
  };
}

describe('JSON serializer', () => {
  it('round-trips an automaton exactly', () => {
    const original = createTestAutomaton();
    const json = serializeToJson(original);
    const restored = deserializeFromJson(json);

    expect(restored).toEqual(original);
  });

  it('preserves state positions', () => {
    const original = createTestAutomaton();
    const json = serializeToJson(original);
    const restored = deserializeFromJson(json);

    expect(restored.states[0]!.position).toEqual({ x: 100, y: 200 });
    expect(restored.states[1]!.position).toEqual({ x: 300, y: 200 });
  });

  it('preserves viewport', () => {
    const original = createTestAutomaton();
    const json = serializeToJson(original);
    const restored = deserializeFromJson(json);

    expect(restored.viewport).toEqual({ panX: 50, panY: 30, zoom: 1.5 });
  });

  it('preserves controlPointOffset', () => {
    const original = createTestAutomaton();
    const json = serializeToJson(original);
    const restored = deserializeFromJson(json);

    expect(restored.transitions[2]!.controlPointOffset).toEqual({ x: 0, y: -20 });
  });

  it('preserves transition symbols', () => {
    const original = createTestAutomaton();
    const json = serializeToJson(original);
    const restored = deserializeFromJson(json);

    expect(restored.transitions[1]!.symbols).toEqual(['a', 'b']);
  });

  it('includes version field', () => {
    const original = createTestAutomaton();
    const json = serializeToJson(original);
    const parsed = JSON.parse(json);

    expect(parsed.version).toBe('1.4.0');
  });

  it('rejects invalid JSON', () => {
    expect(() => deserializeFromJson('not json')).toThrow();
  });

  it('rejects JSON missing required fields', () => {
    expect(() => deserializeFromJson('{"version":"1.0.0"}')).toThrow();
  });

  it('rejects automaton with invalid type', () => {
    const original = createTestAutomaton();
    const json = serializeToJson(original).replace('"DFA"', '"INVALID"');
    expect(() => deserializeFromJson(json)).toThrow();
  });

  it('rejects negative zoom', () => {
    const original = createTestAutomaton();
    const obj = JSON.parse(serializeToJson(original));
    obj.automaton.viewport.zoom = -1;
    expect(() => deserializeFromJson(JSON.stringify(obj))).toThrow();
  });

  // --- Additional edge cases ---

  it('rejects file with missing states array', () => {
    const original = createTestAutomaton();
    const obj = JSON.parse(serializeToJson(original));
    delete obj.automaton.states;
    expect(() => deserializeFromJson(JSON.stringify(obj))).toThrow();
  });

  it('round-trips automaton with empty alphabet', () => {
    const original = createTestAutomaton();
    original.alphabet = [];
    const json = serializeToJson(original);
    const restored = deserializeFromJson(json);
    expect(restored.alphabet).toEqual([]);
  });

  it('round-trips NFA type correctly', () => {
    const original = createTestAutomaton();
    original.type = AutomatonType.NFA;
    const json = serializeToJson(original);
    const restored = deserializeFromJson(json);
    expect(restored.type).toBe(AutomatonType.NFA);
  });

  it('rejects zero zoom', () => {
    const original = createTestAutomaton();
    const obj = JSON.parse(serializeToJson(original));
    obj.automaton.viewport.zoom = 0;
    expect(() => deserializeFromJson(JSON.stringify(obj))).toThrow();
  });

  it('round-trips a PDA automaton with pdaRules', () => {
    const pda: Automaton = {
      id: 'pda-test',
      name: 'Test PDA',
      type: AutomatonType.PDA,
      alphabet: ['a', 'b'],
      acceptanceMode: 'finalState',
      states: [
        { id: 's1', name: 'q0', position: { x: 100, y: 200 }, isInitial: true, isAccepting: false },
        { id: 's2', name: 'q1', position: { x: 300, y: 200 }, isInitial: false, isAccepting: true },
      ],
      transitions: [
        {
          id: 't1', sourceId: 's1', targetId: 's2', symbols: [],
          pdaRules: [{ inputSymbol: 'a', stackPop: 'Z\u2080', stackPush: ['A', 'Z\u2080'] }],
        },
      ],
      viewport: { panX: 0, panY: 0, zoom: 1 },
    };
    const json = serializeToJson(pda);
    const restored = deserializeFromJson(json);
    expect(restored.type).toBe('PDA');
    expect(restored.acceptanceMode).toBe('finalState');
    expect(restored.transitions[0]!.pdaRules).toEqual(pda.transitions[0]!.pdaRules);
  });

  it('round-trips a PDA with peek mode and peekAction rules', () => {
    const pda: Automaton = {
      id: 'pda-peek',
      name: 'Peek PDA',
      type: AutomatonType.PDA,
      alphabet: ['a'],
      acceptanceMode: 'finalState',
      pdaStackMode: 'peek',
      states: [
        { id: 's1', name: 'q0', position: { x: 0, y: 0 }, isInitial: true, isAccepting: false },
        { id: 's2', name: 'q1', position: { x: 100, y: 0 }, isInitial: false, isAccepting: true },
      ],
      transitions: [
        {
          id: 't1', sourceId: 's1', targetId: 's2', symbols: [],
          pdaRules: [{ inputSymbol: 'a', stackPop: 'Z\u2080', stackPush: [], peekAction: 'nop' }],
        },
      ],
      viewport: { panX: 0, panY: 0, zoom: 1 },
    };
    const json = serializeToJson(pda);
    const restored = deserializeFromJson(json);
    expect(restored.pdaStackMode).toBe('peek');
    expect(restored.transitions[0]!.pdaRules![0]!.peekAction).toBe('nop');
  });

  it('loads old v1.1.0 PDA files (backward compat — no pdaStackMode)', () => {
    const oldJson = JSON.stringify({
      version: '1.1.0',
      automaton: {
        id: 'old', name: 'Old PDA', type: 'PDA',
        alphabet: ['a'],
        acceptanceMode: 'finalState',
        states: [{ id: 'q0', name: 'q0', position: { x: 0, y: 0 }, isInitial: true, isAccepting: true }],
        transitions: [{ id: 't1', sourceId: 'q0', targetId: 'q0', symbols: [], pdaRules: [{ inputSymbol: 'a', stackPop: 'Z\u2080', stackPush: [] }] }],
        viewport: { panX: 0, panY: 0, zoom: 1 },
      },
    });
    const restored = deserializeFromJson(oldJson);
    expect(restored.type).toBe('PDA');
    expect(restored.pdaStackMode).toBeUndefined(); // not set — simulator defaults to 'pop'
    expect(restored.transitions[0]!.pdaRules![0]!.peekAction).toBeUndefined();
  });

  describe('epsilon normalization on load', () => {
    function makePdaJson(inputSymbol: string, stackPop: string) {
      return JSON.stringify({
        version: '1.1.0',
        automaton: {
          id: 'p', name: 'P', type: 'PDA', alphabet: ['a'],
          acceptanceMode: 'finalState',
          states: [{ id: 'q0', name: 'q0', position: { x: 0, y: 0 }, isInitial: true, isAccepting: true }],
          transitions: [{ id: 't1', sourceId: 'q0', targetId: 'q0', symbols: [], pdaRules: [{ inputSymbol, stackPop, stackPush: [] }] }],
          viewport: { panX: 0, panY: 0, zoom: 1 },
        },
      });
    }

    it('normalizes empty-string inputSymbol to EPSILON', () => {
      const loaded = deserializeFromJson(makePdaJson('', 'A'));
      expect(loaded.transitions[0]!.pdaRules![0]!.inputSymbol).toBe(EPSILON);
    });

    it('normalizes empty-string stackPop to EPSILON', () => {
      const loaded = deserializeFromJson(makePdaJson('a', ''));
      expect(loaded.transitions[0]!.pdaRules![0]!.stackPop).toBe(EPSILON);
    });

    it('normalizes mojibake Îµ inputSymbol to EPSILON', () => {
      // "Îµ" = U+00CE U+00B5 = Latin-1 decoding of UTF-8 bytes for ε (U+03B5)
      const loaded = deserializeFromJson(makePdaJson('Îµ', 'A'));
      expect(loaded.transitions[0]!.pdaRules![0]!.inputSymbol).toBe(EPSILON);
    });

    it('normalizes mojibake Îµ stackPop to EPSILON', () => {
      const loaded = deserializeFromJson(makePdaJson('a', 'Îµ'));
      expect(loaded.transitions[0]!.pdaRules![0]!.stackPop).toBe(EPSILON);
    });

    it('leaves correct EPSILON and real symbols unchanged', () => {
      const loaded = deserializeFromJson(makePdaJson(EPSILON, 'A'));
      expect(loaded.transitions[0]!.pdaRules![0]!.inputSymbol).toBe(EPSILON);
      expect(loaded.transitions[0]!.pdaRules![0]!.stackPop).toBe('A');
    });
  });

  describe('normalizeEpsilon utility', () => {
    it('converts empty string to EPSILON', () => expect(normalizeEpsilon('')).toBe(EPSILON));
    it('converts mojibake Îµ to EPSILON', () => expect(normalizeEpsilon('Îµ')).toBe(EPSILON));
    it('leaves EPSILON unchanged', () => expect(normalizeEpsilon(EPSILON)).toBe(EPSILON));
    it('leaves real symbols unchanged', () => expect(normalizeEpsilon('A')).toBe('A'));
  });

  it('loads old v1.0.0 DFA files (backward compat)', () => {
    const oldJson = JSON.stringify({
      version: '1.0.0',
      automaton: {
        id: 'old', name: 'Old DFA', type: 'DFA',
        alphabet: ['a'],
        states: [{ id: 'q0', name: 'q0', position: { x: 0, y: 0 }, isInitial: true, isAccepting: true }],
        transitions: [{ id: 't1', sourceId: 'q0', targetId: 'q0', symbols: ['a'] }],
        viewport: { panX: 0, panY: 0, zoom: 1 },
      },
    });
    const restored = deserializeFromJson(oldJson);
    expect(restored.type).toBe('DFA');
    expect(restored.transitions[0]!.symbols).toEqual(['a']);
    expect(restored.transitions[0]!.pdaRules).toBeUndefined();
  });

  describe('TM serialization', () => {
    it('round-trips a TM with rules and TM-specific fields', () => {
      const tm: Automaton = {
        id: 'tm1',
        name: 'Test TM',
        type: AutomatonType.TM,
        alphabet: ['0', '1'],
        states: [
          { id: 'q0', name: 'q0', position: { x: 0, y: 0 }, isInitial: true, isAccepting: false },
          { id: 'qf', name: 'qf', position: { x: 100, y: 0 }, isInitial: false, isAccepting: true },
        ],
        transitions: [
          { id: 't1', sourceId: 'q0', targetId: 'qf', symbols: [], tmRules: [
            { readSymbols: ['0', '1'], writeSymbol: 'X', direction: 'R' },
            { readSymbols: ['Y'], direction: 'L' },  // no-op write
          ] },
        ],
        viewport: { panX: 0, panY: 0, zoom: 1 },
        tmMode: 'nondeterministic',
        tmBlankSymbol: '⊔',
        acceptanceMode: 'haltOnAccept',
      };
      const json = serializeToJson(tm);
      const restored = deserializeFromJson(json);
      expect(restored.type).toBe('TM');
      expect(restored.tmMode).toBe('nondeterministic');
      expect(restored.tmBlankSymbol).toBe('⊔');
      expect(restored.acceptanceMode).toBe('haltOnAccept');
      expect(restored.transitions[0]!.tmRules).toEqual([
        { readSymbols: ['0', '1'], writeSymbol: 'X', direction: 'R' },
        { readSymbols: ['Y'], direction: 'L' },
      ]);
    });

    it('serializes with version 1.4.0', () => {
      const tm: Automaton = {
        id: 'tm1', name: 'Test', type: AutomatonType.TM, alphabet: [],
        states: [{ id: 'q0', name: 'q0', position: { x: 0, y: 0 }, isInitial: true, isAccepting: false }],
        transitions: [],
        viewport: { panX: 0, panY: 0, zoom: 1 },
      };
      const parsed = JSON.parse(serializeToJson(tm));
      expect(parsed.version).toBe('1.4.0');
    });

    it('migrates v1 TM rules ({ readSymbol }) to v2 ({ readSymbols: [...] }) on load', () => {
      const oldTmJson = JSON.stringify({
        version: '1.3.0',
        automaton: {
          id: 'tm-old', name: 'Old TM', type: 'TM',
          alphabet: ['0'],
          states: [
            { id: 'q0', name: 'q0', position: { x: 0, y: 0 }, isInitial: true, isAccepting: false },
            { id: 'qf', name: 'qf', position: { x: 100, y: 0 }, isInitial: false, isAccepting: true },
          ],
          transitions: [
            { id: 't1', sourceId: 'q0', targetId: 'qf', symbols: [], tmRules: [
              { readSymbol: 'X', writeSymbol: 'Y', direction: 'R' },
            ] },
          ],
          viewport: { panX: 0, panY: 0, zoom: 1 },
          tmMode: 'deterministic',
          tmBlankSymbol: '⊔',
          acceptanceMode: 'finalState',
        },
      });
      const restored = deserializeFromJson(oldTmJson);
      const rule = restored.transitions[0]!.tmRules![0]!;
      expect(rule.readSymbols).toEqual(['X']);
      expect(rule.writeSymbol).toBe('Y');
      expect(rule.direction).toBe('R');
      expect((rule as { readSymbol?: string }).readSymbol).toBeUndefined();
    });

    it('loads old v1.2.0 PDA files without TM fields unchanged', () => {
      const oldJson = JSON.stringify({
        version: '1.2.0',
        automaton: {
          id: 'old', name: 'Old PDA', type: 'PDA',
          alphabet: ['a'],
          states: [{ id: 'q0', name: 'q0', position: { x: 0, y: 0 }, isInitial: true, isAccepting: true }],
          transitions: [{ id: 't1', sourceId: 'q0', targetId: 'q0', symbols: [], pdaRules: [{ inputSymbol: 'a', stackPop: 'Z', stackPush: ['Z'] }] }],
          viewport: { panX: 0, panY: 0, zoom: 1 },
          acceptanceMode: 'finalState',
          pdaStackMode: 'pop',
        },
      });
      const restored = deserializeFromJson(oldJson);
      expect(restored.type).toBe('PDA');
      expect(restored.tmMode).toBeUndefined();
      expect(restored.tmBlankSymbol).toBeUndefined();
    });
  });
});

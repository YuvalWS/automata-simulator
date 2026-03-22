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
import type { Automaton } from '@/models/automaton';
import { AutomatonType } from '@/models/types';

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

    expect(parsed.version).toBe('1.1.0');
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
});

import { describe, it, expect, beforeEach } from 'vitest';
import { useAutomatonStore } from '@/stores/automaton-store';
import { AutomatonType } from '@/models/types';

describe('automaton store', () => {
  beforeEach(() => {
    useAutomatonStore.getState().newAutomaton('Test');
  });

  it('new automaton starts with default q0 state', () => {
    const { states } = useAutomatonStore.getState().automaton;
    expect(states).toHaveLength(1);
    expect(states[0]!.name).toBe('q0');
    expect(states[0]!.isInitial).toBe(true);
    expect(states[0]!.isAccepting).toBe(false);
  });

  describe('addState', () => {
    it('adds a state at given position', () => {
      const state = useAutomatonStore.getState().addState({ x: 100, y: 200 });
      const { states } = useAutomatonStore.getState().automaton;

      expect(states).toHaveLength(2); // q0 + new state
      expect(state.position).toEqual({ x: 100, y: 200 });
      expect(state.name).toBe('q1'); // q0 already exists
    });

    it('auto-names states sequentially', () => {
      useAutomatonStore.getState().addState({ x: 0, y: 0 });
      useAutomatonStore.getState().addState({ x: 100, y: 0 });
      const { states } = useAutomatonStore.getState().automaton;

      expect(states[0]!.name).toBe('q0'); // default
      expect(states[1]!.name).toBe('q1');
      expect(states[2]!.name).toBe('q2');
    });

    it('default q0 is initial, added states are not', () => {
      const state = useAutomatonStore.getState().addState({ x: 0, y: 0 });
      expect(state.isInitial).toBe(false);
    });
  });

  describe('removeState', () => {
    it('removes a state by id', () => {
      const state = useAutomatonStore.getState().addState({ x: 0, y: 0 });
      useAutomatonStore.getState().removeState(state.id);
      const { states } = useAutomatonStore.getState().automaton;

      expect(states).toHaveLength(1); // only q0 remains
    });

    it('removes connected transitions when state is removed', () => {
      const q0 = useAutomatonStore.getState().automaton.states[0]!;
      const s2 = useAutomatonStore.getState().addState({ x: 100, y: 0 });
      useAutomatonStore.getState().addTransition(q0.id, s2.id, ['a']);

      useAutomatonStore.getState().removeState(s2.id);
      const { transitions } = useAutomatonStore.getState().automaton;

      expect(transitions).toHaveLength(0);
    });
  });

  describe('updateState', () => {
    it('updates state name', () => {
      const q0 = useAutomatonStore.getState().automaton.states[0]!;
      useAutomatonStore.getState().updateState(q0.id, { name: 'start' });
      const updated = useAutomatonStore.getState().automaton.states.find((s) => s.id === q0.id);

      expect(updated!.name).toBe('start');
    });

    it('updates state position', () => {
      const q0 = useAutomatonStore.getState().automaton.states[0]!;
      useAutomatonStore.getState().updateState(q0.id, { position: { x: 50, y: 75 } });
      const updated = useAutomatonStore.getState().automaton.states.find((s) => s.id === q0.id);

      expect(updated!.position).toEqual({ x: 50, y: 75 });
    });
  });

  describe('setInitialState', () => {
    it('makes a state initial and clears others', () => {
      const q0 = useAutomatonStore.getState().automaton.states[0]!;
      const s2 = useAutomatonStore.getState().addState({ x: 100, y: 0 });

      useAutomatonStore.getState().setInitialState(s2.id);
      const { states } = useAutomatonStore.getState().automaton;

      expect(states.find((s) => s.id === q0.id)!.isInitial).toBe(false);
      expect(states.find((s) => s.id === s2.id)!.isInitial).toBe(true);
    });
  });

  describe('toggleAccepting', () => {
    it('toggles accepting state', () => {
      const q0 = useAutomatonStore.getState().automaton.states[0]!;
      expect(q0.isAccepting).toBe(false);

      useAutomatonStore.getState().toggleAccepting(q0.id);
      expect(useAutomatonStore.getState().automaton.states.find((s) => s.id === q0.id)!.isAccepting).toBe(true);

      useAutomatonStore.getState().toggleAccepting(q0.id);
      expect(useAutomatonStore.getState().automaton.states.find((s) => s.id === q0.id)!.isAccepting).toBe(false);
    });
  });

  describe('addTransition', () => {
    it('adds a transition between states', () => {
      const q0 = useAutomatonStore.getState().automaton.states[0]!;
      const s2 = useAutomatonStore.getState().addState({ x: 100, y: 0 });
      useAutomatonStore.getState().addTransition(q0.id, s2.id, ['a']);

      const { transitions } = useAutomatonStore.getState().automaton;
      expect(transitions).toHaveLength(1);
      expect(transitions[0]!.symbols).toEqual(['a']);
    });

    it('merges symbols for duplicate source-target pair', () => {
      const q0 = useAutomatonStore.getState().automaton.states[0]!;
      const s2 = useAutomatonStore.getState().addState({ x: 100, y: 0 });
      useAutomatonStore.getState().addTransition(q0.id, s2.id, ['a']);
      useAutomatonStore.getState().addTransition(q0.id, s2.id, ['b']);

      const { transitions } = useAutomatonStore.getState().automaton;
      expect(transitions).toHaveLength(1);
      expect(transitions[0]!.symbols).toContain('a');
      expect(transitions[0]!.symbols).toContain('b');
    });

    it('allows self-loops', () => {
      const q0 = useAutomatonStore.getState().automaton.states[0]!;
      useAutomatonStore.getState().addTransition(q0.id, q0.id, ['a']);

      const { transitions } = useAutomatonStore.getState().automaton;
      expect(transitions).toHaveLength(1);
      expect(transitions[0]!.sourceId).toBe(transitions[0]!.targetId);
    });
  });

  describe('removeTransition', () => {
    it('removes a transition', () => {
      const q0 = useAutomatonStore.getState().automaton.states[0]!;
      const s2 = useAutomatonStore.getState().addState({ x: 100, y: 0 });
      const t = useAutomatonStore.getState().addTransition(q0.id, s2.id, ['a']);

      useAutomatonStore.getState().removeTransition(t.id);
      expect(useAutomatonStore.getState().automaton.transitions).toHaveLength(0);
    });
  });

  describe('setType', () => {
    it('changes automaton type', () => {
      useAutomatonStore.getState().setType(AutomatonType.NFA);
      expect(useAutomatonStore.getState().automaton.type).toBe(AutomatonType.NFA);
    });
  });

  describe('setAlphabet', () => {
    it('sets the alphabet', () => {
      useAutomatonStore.getState().setAlphabet(['a', 'b', 'c']);
      expect(useAutomatonStore.getState().automaton.alphabet).toEqual(['a', 'b', 'c']);
    });
  });
});

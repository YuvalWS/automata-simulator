import { describe, it, expect, beforeEach } from 'vitest';
import { useHistoryStore } from '@/stores/history-store';
import type { Automaton } from '@/models/automaton';
import { createEmptyAutomaton } from '@/models/automaton';

function makeAutomaton(name: string): Automaton {
  return { ...createEmptyAutomaton(name), id: name };
}

describe('history store', () => {
  beforeEach(() => {
    useHistoryStore.getState().clear();
  });

  describe('pushState', () => {
    it('adds state to past', () => {
      useHistoryStore.getState().pushState(makeAutomaton('v1'));
      expect(useHistoryStore.getState().past).toHaveLength(1);
    });

    it('clears future on push', () => {
      const store = useHistoryStore.getState();
      store.pushState(makeAutomaton('v1'));
      store.undo(makeAutomaton('v2'));
      expect(useHistoryStore.getState().future).toHaveLength(1);

      store.pushState(makeAutomaton('v3'));
      expect(useHistoryStore.getState().future).toHaveLength(0);
    });

    it('caps history at 50 entries', () => {
      for (let i = 0; i < 60; i++) {
        useHistoryStore.getState().pushState(makeAutomaton(`v${i}`));
      }
      expect(useHistoryStore.getState().past.length).toBeLessThanOrEqual(50);
    });
  });

  describe('undo', () => {
    it('returns null when no history', () => {
      const result = useHistoryStore.getState().undo(makeAutomaton('current'));
      expect(result).toBeNull();
    });

    it('returns previous state', () => {
      useHistoryStore.getState().pushState(makeAutomaton('v1'));
      const result = useHistoryStore.getState().undo(makeAutomaton('v2'));
      expect(result?.id).toBe('v1');
    });

    it('pushes current to future', () => {
      useHistoryStore.getState().pushState(makeAutomaton('v1'));
      useHistoryStore.getState().undo(makeAutomaton('v2'));
      expect(useHistoryStore.getState().future).toHaveLength(1);
      expect(useHistoryStore.getState().future[0]!.id).toBe('v2');
    });

    it('removes from past', () => {
      useHistoryStore.getState().pushState(makeAutomaton('v1'));
      useHistoryStore.getState().undo(makeAutomaton('v2'));
      expect(useHistoryStore.getState().past).toHaveLength(0);
    });
  });

  describe('redo', () => {
    it('returns null when no future', () => {
      const result = useHistoryStore.getState().redo(makeAutomaton('current'));
      expect(result).toBeNull();
    });

    it('returns next state after undo', () => {
      useHistoryStore.getState().pushState(makeAutomaton('v1'));
      useHistoryStore.getState().undo(makeAutomaton('v2'));

      const result = useHistoryStore.getState().redo(makeAutomaton('v1'));
      expect(result?.id).toBe('v2');
    });

    it('pushes current to past on redo', () => {
      useHistoryStore.getState().pushState(makeAutomaton('v1'));
      useHistoryStore.getState().undo(makeAutomaton('v2'));
      useHistoryStore.getState().redo(makeAutomaton('v1'));

      expect(useHistoryStore.getState().past).toHaveLength(1);
      expect(useHistoryStore.getState().past[0]!.id).toBe('v1');
    });
  });

  describe('clear', () => {
    it('resets both stacks', () => {
      useHistoryStore.getState().pushState(makeAutomaton('v1'));
      useHistoryStore.getState().undo(makeAutomaton('v2'));
      useHistoryStore.getState().clear();

      expect(useHistoryStore.getState().past).toHaveLength(0);
      expect(useHistoryStore.getState().future).toHaveLength(0);
    });
  });
});

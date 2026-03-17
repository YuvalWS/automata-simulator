import { create } from 'zustand';
import type { Automaton } from '@/models/automaton';

const MAX_HISTORY = 50;

interface HistoryStore {
  past: Automaton[];
  future: Automaton[];
  pushState: (automaton: Automaton) => void;
  undo: (current: Automaton) => Automaton | null;
  redo: (current: Automaton) => Automaton | null;
  clear: () => void;
}

export const useHistoryStore = create<HistoryStore>((set, get) => ({
  past: [],
  future: [],

  pushState: (automaton) =>
    set((s) => ({
      past: [...s.past.slice(-MAX_HISTORY + 1), automaton],
      future: [],
    })),

  undo: (current) => {
    const { past } = get();
    if (past.length === 0) return null;
    const previous = past[past.length - 1]!;
    set((s) => ({
      past: s.past.slice(0, -1),
      future: [current, ...s.future],
    }));
    return previous;
  },

  redo: (current) => {
    const { future } = get();
    if (future.length === 0) return null;
    const next = future[0]!;
    set((s) => ({
      past: [...s.past, current],
      future: s.future.slice(1),
    }));
    return next;
  },

  clear: () => set({ past: [], future: [] }),
}));

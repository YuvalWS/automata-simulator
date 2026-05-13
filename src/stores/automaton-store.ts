import { create } from 'zustand';
import type { Automaton, AutomatonState, Transition, PdaRule, TmRule } from '@/models/automaton';
import { createEmptyAutomaton } from '@/models/automaton';
import type { Point, Viewport } from '@/models/geometry';
import { AutomatonType } from '@/models/types';
import type { AcceptanceMode, PdaStackMode, TmMode } from '@/models/types';
import { DEFAULT_BLANK_SYMBOL } from '@/models/epsilon';
import { generateId, generateStateName } from '@/utils/id';
import { useHistoryStore } from './history-store';

function pushHistory(automaton: Automaton) {
  useHistoryStore.getState().pushState(automaton);
}

interface AutomatonStore {
  automaton: Automaton;

  // Automaton-level actions
  setAutomaton: (automaton: Automaton) => void;
  newAutomaton: (name?: string) => void;
  setName: (name: string) => void;
  setType: (type: AutomatonType) => void;
  setAlphabet: (alphabet: string[]) => void;
  setViewport: (viewport: Viewport) => void;
  setAcceptanceMode: (mode: AcceptanceMode) => void;
  setPdaStackMode: (mode: PdaStackMode) => void;
  setTmMode: (mode: TmMode) => void;
  setTmBlankSymbol: (sym: string) => void;

  // State actions
  addState: (position: Point) => AutomatonState;
  removeState: (id: string) => void;
  updateState: (id: string, updates: Partial<Pick<AutomatonState, 'name' | 'position' | 'isInitial' | 'isAccepting'>>) => void;
  moveState: (id: string, position: Point) => void;
  setInitialState: (id: string) => void;
  toggleAccepting: (id: string) => void;

  // Transition actions
  addTransition: (sourceId: string, targetId: string, symbols: string[], pdaRules?: PdaRule[], tmRules?: TmRule[]) => Transition;
  removeTransition: (id: string) => void;
  updateTransition: (id: string, updates: Partial<Pick<Transition, 'symbols' | 'pdaRules' | 'tmRules' | 'controlPointOffset'>>) => void;

  // History actions
  undo: () => void;
  redo: () => void;
}

export const useAutomatonStore = create<AutomatonStore>((set, get) => ({
  automaton: createEmptyAutomaton(),

  setAutomaton: (automaton) => set({ automaton }),

  newAutomaton: (name) => {
    useHistoryStore.getState().clear();
    set({ automaton: createEmptyAutomaton(name) });
  },

  setName: (name) => {
    pushHistory(get().automaton);
    set((s) => ({ automaton: { ...s.automaton, name } }));
  },

  setType: (type) => {
    pushHistory(get().automaton);
    set((s) => {
      const prev = s.automaton;
      const updates: Partial<Automaton> = { type };

      if (type === AutomatonType.PDA && prev.type !== AutomatonType.PDA) {
        // Switching to PDA: set default acceptance mode and stack mode
        updates.acceptanceMode = 'finalState';
        updates.pdaStackMode = 'pop';
      } else if (type !== AutomatonType.PDA && prev.type === AutomatonType.PDA) {
        // Switching away from PDA: clean up PDA fields
        updates.acceptanceMode = undefined;
        updates.pdaStackMode = undefined;
        updates.transitions = prev.transitions.map((t) => {
          const { pdaRules: _, ...rest } = t;
          return rest;
        });
      }

      if (type === AutomatonType.TM && prev.type !== AutomatonType.TM) {
        // Switching to TM: set default acceptance mode, TM mode, and blank symbol
        updates.acceptanceMode = 'finalState';
        updates.tmMode = 'deterministic';
        updates.tmBlankSymbol = DEFAULT_BLANK_SYMBOL;
      } else if (type !== AutomatonType.TM && prev.type === AutomatonType.TM) {
        // Switching away from TM: clean up TM fields
        updates.tmMode = undefined;
        updates.tmBlankSymbol = undefined;
        // haltOnAccept is TM-only; reset to undefined when leaving TM
        if (prev.acceptanceMode === 'haltOnAccept') updates.acceptanceMode = undefined;
        const baseTransitions = updates.transitions ?? prev.transitions;
        updates.transitions = baseTransitions.map((t) => {
          const { tmRules: _, ...rest } = t;
          return rest;
        });
      }

      return { automaton: { ...prev, ...updates } };
    });
  },

  setAlphabet: (alphabet) => {
    pushHistory(get().automaton);
    set((s) => ({ automaton: { ...s.automaton, alphabet } }));
  },

  setAcceptanceMode: (mode) => {
    pushHistory(get().automaton);
    set((s) => ({ automaton: { ...s.automaton, acceptanceMode: mode } }));
  },

  setPdaStackMode: (mode) => {
    pushHistory(get().automaton);
    set((s) => ({ automaton: { ...s.automaton, pdaStackMode: mode } }));
  },

  setTmMode: (mode) => {
    pushHistory(get().automaton);
    set((s) => ({ automaton: { ...s.automaton, tmMode: mode } }));
  },

  setTmBlankSymbol: (sym) => {
    pushHistory(get().automaton);
    const blank = sym && sym.length > 0 ? sym : DEFAULT_BLANK_SYMBOL;
    set((s) => ({ automaton: { ...s.automaton, tmBlankSymbol: blank } }));
  },

  // Viewport changes are NOT undoable
  setViewport: (viewport) =>
    set((s) => ({ automaton: { ...s.automaton, viewport } })),

  addState: (position) => {
    pushHistory(get().automaton);
    const existingNames = get().automaton.states.map((s) => s.name);
    const newState: AutomatonState = {
      id: generateId(),
      name: generateStateName(existingNames),
      position,
      isInitial: get().automaton.states.length === 0,
      isAccepting: false,
    };
    set((s) => ({
      automaton: { ...s.automaton, states: [...s.automaton.states, newState] },
    }));
    return newState;
  },

  removeState: (id) => {
    pushHistory(get().automaton);
    set((s) => ({
      automaton: {
        ...s.automaton,
        states: s.automaton.states.filter((st) => st.id !== id),
        transitions: s.automaton.transitions.filter(
          (t) => t.sourceId !== id && t.targetId !== id,
        ),
      },
    }));
  },

  updateState: (id, updates) => {
    pushHistory(get().automaton);
    set((s) => ({
      automaton: {
        ...s.automaton,
        states: s.automaton.states.map((st) => {
          if (st.id !== id) {
            if (updates.isInitial) {
              return { ...st, isInitial: false };
            }
            return st;
          }
          return { ...st, ...updates };
        }),
      },
    }));
  },

  // Move state without pushing history — used during drag (history pushed once on drag end)
  moveState: (id, position) => {
    set((s) => ({
      automaton: {
        ...s.automaton,
        states: s.automaton.states.map((st) =>
          st.id === id ? { ...st, position } : st,
        ),
      },
    }));
  },

  setInitialState: (id) => {
    pushHistory(get().automaton);
    set((s) => ({
      automaton: {
        ...s.automaton,
        states: s.automaton.states.map((st) => ({
          ...st,
          isInitial: st.id === id,
        })),
      },
    }));
  },

  toggleAccepting: (id) => {
    pushHistory(get().automaton);
    set((s) => ({
      automaton: {
        ...s.automaton,
        states: s.automaton.states.map((st) =>
          st.id === id ? { ...st, isAccepting: !st.isAccepting } : st,
        ),
      },
    }));
  },

  addTransition: (sourceId, targetId, symbols, pdaRules, tmRules) => {
    pushHistory(get().automaton);
    const existing = get().automaton.transitions.find(
      (t) => t.sourceId === sourceId && t.targetId === targetId,
    );
    if (existing) {
      if (pdaRules) {
        // PDA: append new rules to existing
        const mergedRules = [...(existing.pdaRules ?? []), ...pdaRules];
        set((s) => ({
          automaton: {
            ...s.automaton,
            transitions: s.automaton.transitions.map((t) =>
              t.id === existing.id ? { ...t, pdaRules: mergedRules } : t,
            ),
          },
        }));
        return { ...existing, pdaRules: mergedRules };
      }
      if (tmRules) {
        // TM: append new rules to existing
        const mergedRules = [...(existing.tmRules ?? []), ...tmRules];
        set((s) => ({
          automaton: {
            ...s.automaton,
            transitions: s.automaton.transitions.map((t) =>
              t.id === existing.id ? { ...t, tmRules: mergedRules } : t,
            ),
          },
        }));
        return { ...existing, tmRules: mergedRules };
      }
      const mergedSymbols = [...new Set([...existing.symbols, ...symbols])];
      set((s) => ({
        automaton: {
          ...s.automaton,
          transitions: s.automaton.transitions.map((t) =>
            t.id === existing.id ? { ...t, symbols: mergedSymbols } : t,
          ),
        },
      }));
      return { ...existing, symbols: mergedSymbols };
    }

    const newTransition: Transition = {
      id: generateId(),
      sourceId,
      targetId,
      symbols,
      ...(pdaRules ? { pdaRules } : {}),
      ...(tmRules ? { tmRules } : {}),
    };
    set((s) => ({
      automaton: {
        ...s.automaton,
        transitions: [...s.automaton.transitions, newTransition],
      },
    }));
    return newTransition;
  },

  removeTransition: (id) => {
    pushHistory(get().automaton);
    set((s) => ({
      automaton: {
        ...s.automaton,
        transitions: s.automaton.transitions.filter((t) => t.id !== id),
      },
    }));
  },

  updateTransition: (id, updates) => {
    pushHistory(get().automaton);
    set((s) => ({
      automaton: {
        ...s.automaton,
        transitions: s.automaton.transitions.map((t) =>
          t.id === id ? { ...t, ...updates } : t,
        ),
      },
    }));
  },

  undo: () => {
    const result = useHistoryStore.getState().undo(get().automaton);
    if (result) set({ automaton: result });
  },

  redo: () => {
    const result = useHistoryStore.getState().redo(get().automaton);
    if (result) set({ automaton: result });
  },
}));

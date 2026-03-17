import type { Automaton } from '@/models/automaton';
import { AutomatonType } from '@/models/types';

export interface SimulationSnapshot {
  step: number;
  symbolIndex: number;
  activeStateIds: string[];
  traversedTransitionIds: string[];
  status: 'running' | 'accepted' | 'rejected';
}

export interface SimulationTrace {
  word: string[];
  snapshots: SimulationSnapshot[];
}

export function buildSimulationTrace(automaton: Automaton, word: string[]): SimulationTrace {
  if (automaton.type === AutomatonType.DFA) {
    return buildDfaTrace(automaton, word);
  }
  return buildNfaTrace(automaton, word);
}

function buildDfaTrace(automaton: Automaton, word: string[]): SimulationTrace {
  const initialState = automaton.states.find((s) => s.isInitial);
  if (!initialState) {
    return { word, snapshots: [{ step: 0, symbolIndex: -1, activeStateIds: [], traversedTransitionIds: [], status: 'rejected' }] };
  }

  const snapshots: SimulationSnapshot[] = [];

  // Step 0: initial state, before consuming any symbol
  let currentStateId = initialState.id;
  snapshots.push({
    step: 0,
    symbolIndex: -1,
    activeStateIds: [currentStateId],
    traversedTransitionIds: [],
    status: word.length === 0 ? (initialState.isAccepting ? 'accepted' : 'rejected') : 'running',
  });

  if (word.length === 0) return { word, snapshots };

  for (let i = 0; i < word.length; i++) {
    const symbol = word[i]!;
    // Find transition from current state on this symbol
    const transition = automaton.transitions.find(
      (t) => t.sourceId === currentStateId && t.symbols.includes(symbol),
    );

    if (!transition) {
      // Dead — no transition for this symbol
      snapshots.push({
        step: i + 1,
        symbolIndex: i,
        activeStateIds: [],
        traversedTransitionIds: [],
        status: 'rejected',
      });
      return { word, snapshots };
    }

    currentStateId = transition.targetId;
    const isLast = i === word.length - 1;
    const currentState = automaton.states.find((s) => s.id === currentStateId);
    const accepted = isLast && currentState?.isAccepting;

    snapshots.push({
      step: i + 1,
      symbolIndex: i,
      activeStateIds: [currentStateId],
      traversedTransitionIds: [transition.id],
      status: isLast ? (accepted ? 'accepted' : 'rejected') : 'running',
    });
  }

  return { word, snapshots };
}

function buildNfaTrace(automaton: Automaton, word: string[]): SimulationTrace {
  const initialStates = automaton.states.filter((s) => s.isInitial);
  if (initialStates.length === 0) {
    return { word, snapshots: [{ step: 0, symbolIndex: -1, activeStateIds: [], traversedTransitionIds: [], status: 'rejected' }] };
  }

  const snapshots: SimulationSnapshot[] = [];
  let activeStateIds = initialStates.map((s) => s.id);

  // Step 0: initial states
  if (word.length === 0) {
    const anyAccepting = activeStateIds.some(
      (id) => automaton.states.find((s) => s.id === id)?.isAccepting,
    );
    snapshots.push({
      step: 0,
      symbolIndex: -1,
      activeStateIds: [...activeStateIds],
      traversedTransitionIds: [],
      status: anyAccepting ? 'accepted' : 'rejected',
    });
    return { word, snapshots };
  }

  snapshots.push({
    step: 0,
    symbolIndex: -1,
    activeStateIds: [...activeStateIds],
    traversedTransitionIds: [],
    status: 'running',
  });

  for (let i = 0; i < word.length; i++) {
    const symbol = word[i]!;
    const nextStateIds = new Set<string>();
    const traversedIds: string[] = [];

    for (const stateId of activeStateIds) {
      for (const t of automaton.transitions) {
        if (t.sourceId === stateId && t.symbols.includes(symbol)) {
          nextStateIds.add(t.targetId);
          traversedIds.push(t.id);
        }
      }
    }

    activeStateIds = [...nextStateIds];

    if (activeStateIds.length === 0) {
      snapshots.push({
        step: i + 1,
        symbolIndex: i,
        activeStateIds: [],
        traversedTransitionIds: [],
        status: 'rejected',
      });
      return { word, snapshots };
    }

    const isLast = i === word.length - 1;
    const anyAccepting = isLast && activeStateIds.some(
      (id) => automaton.states.find((s) => s.id === id)?.isAccepting,
    );

    snapshots.push({
      step: i + 1,
      symbolIndex: i,
      activeStateIds: [...activeStateIds],
      traversedTransitionIds: [...new Set(traversedIds)],
      status: isLast ? (anyAccepting ? 'accepted' : 'rejected') : 'running',
    });
  }

  return { word, snapshots };
}

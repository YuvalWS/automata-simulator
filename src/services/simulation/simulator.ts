import type { Automaton, PdaRule } from '@/models/automaton';
import { AutomatonType } from '@/models/types';
import { EPSILON, STACK_BOTTOM } from '@/models/epsilon';

export interface PdaConfiguration {
  stateId: string;
  stack: string[]; // index 0 = top of stack
}

export interface SimulationSnapshot {
  step: number;
  symbolIndex: number;
  activeStateIds: string[];
  traversedTransitionIds: string[];
  status: 'running' | 'accepted' | 'rejected';
  configurations?: PdaConfiguration[];
}

export interface SimulationTrace {
  word: string[];
  snapshots: SimulationSnapshot[];
}

/**
 * Compute the epsilon closure of a set of states.
 * Returns all states reachable via ε-transitions (including the input states),
 * and the IDs of ε-transitions traversed.
 */
export function epsilonClosure(
  automaton: Automaton,
  stateIds: string[],
): { stateIds: string[]; transitionIds: string[] } {
  const visited = new Set<string>(stateIds);
  const queue = [...stateIds];
  const transitionIds: string[] = [];

  while (queue.length > 0) {
    const current = queue.pop()!;
    for (const t of automaton.transitions) {
      if (t.sourceId === current && t.symbols.includes(EPSILON)) {
        if (!visited.has(t.targetId)) {
          visited.add(t.targetId);
          queue.push(t.targetId);
        }
        transitionIds.push(t.id);
      }
    }
  }

  return { stateIds: [...visited], transitionIds: [...new Set(transitionIds)] };
}

const MAX_PDA_CONFIGURATIONS = 1000;

function configKey(config: PdaConfiguration): string {
  return `${config.stateId}\x00${config.stack.join('\x00')}`;
}

/**
 * Compute PDA epsilon closure: expand configurations by following ε-input transitions
 * that match the stack top (or have ε stack pop).
 */
function pdaEpsilonClosure(
  automaton: Automaton,
  configs: PdaConfiguration[],
): { configs: PdaConfiguration[]; transitionIds: string[] } {
  const visited = new Set<string>();
  const queue = [...configs];
  const result: PdaConfiguration[] = [];
  const transitionIds: string[] = [];

  for (const c of configs) {
    visited.add(configKey(c));
  }

  while (queue.length > 0 && result.length + queue.length < MAX_PDA_CONFIGURATIONS) {
    const config = queue.pop()!;
    result.push(config);

    for (const t of automaton.transitions) {
      if (t.sourceId !== config.stateId || !t.pdaRules) continue;

      for (const rule of t.pdaRules) {
        if (rule.inputSymbol !== EPSILON) continue;

        const newStack = applyStackOperation(config.stack, rule);
        if (!newStack) continue;

        const newConfig: PdaConfiguration = { stateId: t.targetId, stack: newStack };
        const key = configKey(newConfig);
        if (!visited.has(key)) {
          visited.add(key);
          queue.push(newConfig);
          transitionIds.push(t.id);
        }
      }
    }
  }

  return { configs: result, transitionIds: [...new Set(transitionIds)] };
}

/**
 * Apply a PDA rule's stack operation to a stack.
 * Returns the new stack, or null if the rule doesn't match (stackPop doesn't match top).
 */
function applyStackOperation(stack: string[], rule: PdaRule): string[] | null {
  const popSymbol = rule.stackPop;

  if (popSymbol === EPSILON) {
    // Don't pop anything, just push
    return [...rule.stackPush, ...stack];
  }

  // Need to pop: check stack top matches
  if (stack.length === 0 || stack[0] !== popSymbol) {
    return null;
  }

  // Pop the top, then push new symbols (first element of stackPush goes on top)
  const remainingStack = stack.slice(1);
  return [...rule.stackPush, ...remainingStack];
}

function isPdaAccepted(
  automaton: Automaton,
  configs: PdaConfiguration[],
): boolean {
  const mode = automaton.acceptanceMode ?? 'finalState';

  if (mode === 'emptyStack') {
    return configs.some((c) => c.stack.length === 0);
  }

  // finalState mode
  return configs.some((c) =>
    automaton.states.find((s) => s.id === c.stateId)?.isAccepting,
  );
}

export function buildSimulationTrace(automaton: Automaton, word: string[]): SimulationTrace {
  if (automaton.type === AutomatonType.DFA) {
    return buildDfaTrace(automaton, word);
  }
  if (automaton.type === AutomatonType.PDA) {
    return buildPdaTrace(automaton, word);
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

    if (!currentState) {
      // Target state doesn't exist — treat as dead end
      snapshots.push({
        step: i + 1,
        symbolIndex: i,
        activeStateIds: [],
        traversedTransitionIds: [transition.id],
        status: 'rejected',
      });
      return { word, snapshots };
    }

    const accepted = isLast && currentState.isAccepting;

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

  // Apply epsilon closure to initial states
  const initClosure = epsilonClosure(automaton, initialStates.map((s) => s.id));
  let activeStateIds = initClosure.stateIds;

  // Step 0: initial states + epsilon closure
  if (word.length === 0) {
    const anyAccepting = activeStateIds.some(
      (id) => automaton.states.find((s) => s.id === id)?.isAccepting,
    );
    snapshots.push({
      step: 0,
      symbolIndex: -1,
      activeStateIds: [...activeStateIds],
      traversedTransitionIds: [...initClosure.transitionIds],
      status: anyAccepting ? 'accepted' : 'rejected',
    });
    return { word, snapshots };
  }

  snapshots.push({
    step: 0,
    symbolIndex: -1,
    activeStateIds: [...activeStateIds],
    traversedTransitionIds: [...initClosure.transitionIds],
    status: 'running',
  });

  for (let i = 0; i < word.length; i++) {
    const symbol = word[i]!;
    const nextStateIds = new Set<string>();
    const traversedIds: string[] = [];

    for (const stateId of activeStateIds) {
      for (const t of automaton.transitions) {
        if (t.sourceId === stateId && t.symbols.includes(symbol)) {
          // Only follow transition if target state actually exists
          if (automaton.states.some((s) => s.id === t.targetId)) {
            nextStateIds.add(t.targetId);
            traversedIds.push(t.id);
          }
        }
      }
    }

    // Apply epsilon closure to the states reached by consuming the symbol
    const closure = epsilonClosure(automaton, [...nextStateIds]);
    activeStateIds = closure.stateIds;
    traversedIds.push(...closure.transitionIds);

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

function buildPdaTrace(automaton: Automaton, word: string[]): SimulationTrace {
  const initialState = automaton.states.find((s) => s.isInitial);
  if (!initialState) {
    return { word, snapshots: [{ step: 0, symbolIndex: -1, activeStateIds: [], traversedTransitionIds: [], status: 'rejected' }] };
  }

  const snapshots: SimulationSnapshot[] = [];

  // Initialize with single configuration: initial state, stack = [STACK_BOTTOM]
  let initConfigs: PdaConfiguration[] = [{ stateId: initialState.id, stack: [STACK_BOTTOM] }];

  // Apply epsilon closure
  const initClosure = pdaEpsilonClosure(automaton, initConfigs);
  let configs = initClosure.configs;

  // Step 0
  const activeIds = [...new Set(configs.map((c) => c.stateId))];
  if (word.length === 0) {
    snapshots.push({
      step: 0,
      symbolIndex: -1,
      activeStateIds: activeIds,
      traversedTransitionIds: [...initClosure.transitionIds],
      status: isPdaAccepted(automaton, configs) ? 'accepted' : 'rejected',
      configurations: configs.map((c) => ({ ...c })),
    });
    return { word, snapshots };
  }

  snapshots.push({
    step: 0,
    symbolIndex: -1,
    activeStateIds: activeIds,
    traversedTransitionIds: [...initClosure.transitionIds],
    status: 'running',
    configurations: configs.map((c) => ({ ...c })),
  });

  for (let i = 0; i < word.length; i++) {
    const symbol = word[i]!;
    const nextConfigs: PdaConfiguration[] = [];
    const traversedIds: string[] = [];

    for (const config of configs) {
      for (const t of automaton.transitions) {
        if (t.sourceId !== config.stateId || !t.pdaRules) continue;

        for (const rule of t.pdaRules) {
          if (rule.inputSymbol !== symbol) continue;

          const newStack = applyStackOperation(config.stack, rule);
          if (!newStack) continue;

          nextConfigs.push({ stateId: t.targetId, stack: newStack });
          traversedIds.push(t.id);

          if (nextConfigs.length >= MAX_PDA_CONFIGURATIONS) break;
        }
        if (nextConfigs.length >= MAX_PDA_CONFIGURATIONS) break;
      }
      if (nextConfigs.length >= MAX_PDA_CONFIGURATIONS) break;
    }

    // Apply epsilon closure
    const closure = pdaEpsilonClosure(automaton, nextConfigs);
    configs = closure.configs;
    traversedIds.push(...closure.transitionIds);

    const stepActiveIds = [...new Set(configs.map((c) => c.stateId))];

    if (configs.length === 0) {
      snapshots.push({
        step: i + 1,
        symbolIndex: i,
        activeStateIds: [],
        traversedTransitionIds: [],
        status: 'rejected',
        configurations: [],
      });
      return { word, snapshots };
    }

    const isLast = i === word.length - 1;
    const accepted = isLast && isPdaAccepted(automaton, configs);

    snapshots.push({
      step: i + 1,
      symbolIndex: i,
      activeStateIds: stepActiveIds,
      traversedTransitionIds: [...new Set(traversedIds)],
      status: isLast ? (accepted ? 'accepted' : 'rejected') : 'running',
      configurations: configs.map((c) => ({ ...c })),
    });
  }

  return { word, snapshots };
}

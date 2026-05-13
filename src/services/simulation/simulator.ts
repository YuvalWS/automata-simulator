import type { Automaton, PdaRule, TmRule } from '@/models/automaton';
import { AutomatonType } from '@/models/types';
import { DEFAULT_BLANK_SYMBOL, EPSILON, STACK_BOTTOM } from '@/models/epsilon';

export interface PdaConfiguration {
  stateId: string;
  stack: string[]; // index 0 = top of stack
}

export interface TmConfiguration {
  stateId: string;
  tape: string[]; // dense; grows on either end as the head moves out of bounds
  headIndex: number; // index into tape[]
  leftmostIndex: number; // logical absolute index of tape[0]; decrements when we prepend
}

export interface SimulationSnapshot {
  step: number;
  /**
   * For DFA/NFA/PDA: index of the consumed input symbol (-1 before any symbol).
   * For TM: logical absolute head position (`headIndex + leftmostIndex` of the first config),
   * since the TM does not consume the word symbol-by-symbol.
   */
  symbolIndex: number;
  activeStateIds: string[];
  traversedTransitionIds: string[];
  status: 'running' | 'accepted' | 'rejected' | 'timeout';
  configurations?: PdaConfiguration[];
  tmConfigurations?: TmConfiguration[];
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
  stackMode: 'pop' | 'peek' = 'pop',
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

        const newStack = applyStackOperation(config.stack, rule, stackMode);
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
 *
 * stackMode 'pop' (default): stackPop symbol is consumed when matched.
 * stackMode 'peek': stackPop symbol is only read; what happens next is driven by rule.peekAction:
 *   'nop'  — stack unchanged
 *   'push' — push stackPush on top, peeked symbol stays
 *   'pop'  — pop peeked symbol (same as pop mode), then push stackPush
 */
function applyStackOperation(stack: string[], rule: PdaRule, stackMode: 'pop' | 'peek' = 'pop'): string[] | null {
  const matchSymbol = rule.stackPop;

  if (stackMode === 'peek') {
    if (matchSymbol !== EPSILON) {
      if (stack.length === 0 || stack[0] !== matchSymbol) return null;
    }
    const action = rule.peekAction ?? 'pop';
    if (action === 'nop') return [...stack];
    if (action === 'push') return [...rule.stackPush, ...stack]; // peeked symbol stays
    // action === 'pop': consume peeked symbol
    if (matchSymbol === EPSILON) return [...rule.stackPush, ...stack]; // nothing to pop
    return [...rule.stackPush, ...stack.slice(1)];
  }

  // Pop mode (default)
  if (matchSymbol === EPSILON) {
    return [...rule.stackPush, ...stack];
  }
  if (stack.length === 0 || stack[0] !== matchSymbol) {
    return null;
  }
  return [...rule.stackPush, ...stack.slice(1)];
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
  if (automaton.type === AutomatonType.TM) {
    return buildTmTrace(automaton, word);
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
  const stackMode = automaton.pdaStackMode ?? 'pop';

  // Initialize with single configuration: initial state, stack = [STACK_BOTTOM]
  const initConfigs: PdaConfiguration[] = [{ stateId: initialState.id, stack: [STACK_BOTTOM] }];

  // Apply epsilon closure
  const initClosure = pdaEpsilonClosure(automaton, initConfigs, stackMode);
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

          const newStack = applyStackOperation(config.stack, rule, stackMode);
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
    const closure = pdaEpsilonClosure(automaton, nextConfigs, stackMode);
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

const MAX_TM_STEPS = 1000;
const MAX_TM_CONFIGURATIONS = 1000;

function cloneTmConfig(c: TmConfiguration): TmConfiguration {
  return { stateId: c.stateId, tape: [...c.tape], headIndex: c.headIndex, leftmostIndex: c.leftmostIndex };
}

/**
 * Apply a TM rule to a configuration: write at the head, move L/R/S.
 * Tape grows by one blank cell on either end when the head moves out of bounds.
 * Returns a new configuration with a placeholder stateId (caller fills in target).
 *
 * If `rule.writeSymbol` is undefined or empty, the head cell is left unchanged
 * (writes back the read symbol). This is the textbook "no-op write" shorthand,
 * displayed in the UI as `<reads> → <direction>` without a write column.
 */
function applyTmRule(c: TmConfiguration, rule: TmRule, readSym: string, blank: string): TmConfiguration {
  const tape = [...c.tape];
  const writeSym = rule.writeSymbol && rule.writeSymbol.length > 0 ? rule.writeSymbol : readSym;
  tape[c.headIndex] = writeSym;
  let headIndex = c.headIndex;
  let leftmostIndex = c.leftmostIndex;
  if (rule.direction === 'L') {
    headIndex -= 1;
    if (headIndex < 0) {
      tape.unshift(blank);
      headIndex = 0;
      leftmostIndex -= 1;
    }
  } else if (rule.direction === 'R') {
    headIndex += 1;
    if (headIndex >= tape.length) {
      tape.push(blank);
    }
  }
  // 'S': stay — head unchanged
  return { stateId: '', tape, headIndex, leftmostIndex };
}

/**
 * Build a simulation trace for a Turing machine.
 *
 * Semantics:
 *  - The word initializes the tape (empty word → single blank cell). The TM does NOT
 *    consume the word symbol-by-symbol; it reads from `tape[headIndex]` every step.
 *  - `acceptanceMode='finalState'`: accept as soon as a configuration enters an accepting state.
 *    A halted branch (no applicable rule) is accepting iff its state is accepting.
 *  - `acceptanceMode='haltOnAccept'`: a branch that halts (no applicable rule) is accepted unconditionally.
 *    Note this uses the operational definition "no applicable rule from current configuration"
 *    rather than a dedicated halt state.
 *  - Hard step cap of `MAX_TM_STEPS`; on overflow the final snapshot status is `'timeout'`.
 *  - NTM: all matching rules are explored in parallel (capped at `MAX_TM_CONFIGURATIONS`).
 *    DTM is enforced upstream by the validator; the simulator uses the same code path.
 */
function buildTmTrace(automaton: Automaton, word: string[]): SimulationTrace {
  const initialState = automaton.states.find((s) => s.isInitial);
  if (!initialState) {
    return {
      word,
      snapshots: [{ step: 0, symbolIndex: -1, activeStateIds: [], traversedTransitionIds: [], status: 'rejected' }],
    };
  }

  const blank = automaton.tmBlankSymbol && automaton.tmBlankSymbol.length > 0
    ? automaton.tmBlankSymbol
    : DEFAULT_BLANK_SYMBOL;
  const acceptMode = automaton.acceptanceMode === 'haltOnAccept' ? 'haltOnAccept' : 'finalState';

  const initialTape = word.length > 0 ? [...word] : [blank];
  let configs: TmConfiguration[] = [{
    stateId: initialState.id,
    tape: initialTape,
    headIndex: 0,
    leftmostIndex: 0,
  }];

  const snapshots: SimulationSnapshot[] = [];

  const initiallyAccepted = acceptMode === 'finalState' && initialState.isAccepting;
  snapshots.push({
    step: 0,
    symbolIndex: 0,
    activeStateIds: [initialState.id],
    traversedTransitionIds: [],
    status: initiallyAccepted ? 'accepted' : 'running',
    tmConfigurations: configs.map(cloneTmConfig),
  });
  if (initiallyAccepted) return { word, snapshots };

  for (let step = 1; step <= MAX_TM_STEPS; step++) {
    const nextConfigs: TmConfiguration[] = [];
    const traversedIds: string[] = [];
    let haltAccepted = false;

    outer: for (const config of configs) {
      const readSym = config.headIndex >= 0 && config.headIndex < config.tape.length
        ? config.tape[config.headIndex]!
        : blank;

      let matched = false;
      for (const t of automaton.transitions) {
        if (t.sourceId !== config.stateId || !t.tmRules) continue;
        for (const rule of t.tmRules) {
          if (!rule.readSymbols.includes(readSym)) continue;
          matched = true;
          const newConfig = applyTmRule(config, rule, readSym, blank);
          newConfig.stateId = t.targetId;
          nextConfigs.push(newConfig);
          traversedIds.push(t.id);
          if (nextConfigs.length >= MAX_TM_CONFIGURATIONS) break outer;
        }
      }

      if (!matched) {
        // This branch halts. Determine acceptance.
        const stateAccepting = automaton.states.find((s) => s.id === config.stateId)?.isAccepting ?? false;
        if (acceptMode === 'haltOnAccept' || stateAccepting) {
          haltAccepted = true;
        }
      }
    }

    // finalState: accepted on entering an accepting state.
    if (!haltAccepted && acceptMode === 'finalState') {
      haltAccepted = nextConfigs.some((c) =>
        automaton.states.find((s) => s.id === c.stateId)?.isAccepting,
      );
    }

    const stepActiveIds = [...new Set(nextConfigs.map((c) => c.stateId))];
    const firstCfg = nextConfigs[0];
    const headPos = firstCfg ? firstCfg.headIndex + firstCfg.leftmostIndex : 0;

    if (haltAccepted) {
      snapshots.push({
        step,
        symbolIndex: headPos,
        activeStateIds: stepActiveIds,
        traversedTransitionIds: [...new Set(traversedIds)],
        status: 'accepted',
        tmConfigurations: nextConfigs.map(cloneTmConfig),
      });
      return { word, snapshots };
    }

    if (nextConfigs.length === 0) {
      snapshots.push({
        step,
        symbolIndex: 0,
        activeStateIds: [],
        traversedTransitionIds: [...new Set(traversedIds)],
        status: 'rejected',
        tmConfigurations: [],
      });
      return { word, snapshots };
    }

    snapshots.push({
      step,
      symbolIndex: headPos,
      activeStateIds: stepActiveIds,
      traversedTransitionIds: [...new Set(traversedIds)],
      status: 'running',
      tmConfigurations: nextConfigs.map(cloneTmConfig),
    });

    configs = nextConfigs;
  }

  // Step cap exceeded — mutate the last snapshot to 'timeout'.
  const last = snapshots[snapshots.length - 1];
  if (last && last.status === 'running') last.status = 'timeout';
  return { word, snapshots };
}

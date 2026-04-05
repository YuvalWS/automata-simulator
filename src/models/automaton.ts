import type { Point, Viewport } from './geometry';
import { AutomatonType } from './types';
import type { PdaAcceptanceMode } from './types';
import { generateId } from '@/utils/id';

export interface AutomatonState {
  id: string;
  name: string;
  position: Point;
  isInitial: boolean;
  isAccepting: boolean;
}

export interface PdaRule {
  inputSymbol: string;
  stackPop: string;
  stackPush: string[];
}

export interface Transition {
  id: string;
  sourceId: string;
  targetId: string;
  symbols: string[];
  pdaRules?: PdaRule[];
  controlPointOffset?: Point;
}

export interface Automaton {
  id: string;
  name: string;
  type: AutomatonType;
  alphabet: string[];
  states: AutomatonState[];
  transitions: Transition[];
  viewport: Viewport;
  acceptanceMode?: PdaAcceptanceMode;
}

export function createEmptyAutomaton(name = 'Untitled'): Automaton {
  const initialState: AutomatonState = {
    id: generateId(),
    name: 'q0',
    position: { x: 200, y: 250 },
    isInitial: true,
    isAccepting: false,
  };

  return {
    id: crypto.randomUUID(),
    name,
    type: AutomatonType.DFA,
    alphabet: [],
    states: [initialState],
    transitions: [],
    viewport: { panX: 0, panY: 0, zoom: 1 },
  };
}

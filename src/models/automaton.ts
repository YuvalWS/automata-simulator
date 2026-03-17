import type { Point, Viewport } from './geometry';
import { AutomatonType } from './types';

export interface AutomatonState {
  id: string;
  name: string;
  position: Point;
  isInitial: boolean;
  isAccepting: boolean;
}

export interface Transition {
  id: string;
  sourceId: string;
  targetId: string;
  symbols: string[];
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
}

export function createEmptyAutomaton(name = 'Untitled'): Automaton {
  return {
    id: crypto.randomUUID(),
    name,
    type: AutomatonType.DFA,
    alphabet: [],
    states: [],
    transitions: [],
    viewport: { panX: 0, panY: 0, zoom: 1 },
  };
}

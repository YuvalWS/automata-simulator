export enum AutomatonType {
  DFA = 'DFA',
  NFA = 'NFA',
  PDA = 'PDA',
  TM = 'TM',
}

export type PdaAcceptanceMode = 'finalState' | 'emptyStack';
export type TmAcceptanceMode = 'finalState' | 'haltOnAccept';
export type AcceptanceMode = PdaAcceptanceMode | TmAcceptanceMode;

export type PdaStackMode = 'pop' | 'peek';
export type TmMode = 'deterministic' | 'nondeterministic';
export type TmDirection = 'L' | 'R' | 'S';

export enum EditorTool {
  Pointer = 'pointer',
}

export type SelectionType = 'state' | 'transition';

export interface Selection {
  type: SelectionType;
  id: string;
}

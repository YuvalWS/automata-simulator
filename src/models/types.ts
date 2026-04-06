export enum AutomatonType {
  DFA = 'DFA',
  NFA = 'NFA',
  PDA = 'PDA',
}

export type PdaAcceptanceMode = 'finalState' | 'emptyStack';

export type PdaStackMode = 'pop' | 'peek';

export enum EditorTool {
  Pointer = 'pointer',
}

export type SelectionType = 'state' | 'transition';

export interface Selection {
  type: SelectionType;
  id: string;
}

export enum AutomatonType {
  DFA = 'DFA',
  NFA = 'NFA',
}

export enum EditorTool {
  Pointer = 'pointer',
}

export type SelectionType = 'state' | 'transition';

export interface Selection {
  type: SelectionType;
  id: string;
}

import { create } from 'zustand';
import { EditorTool } from '@/models/types';
import type { Selection } from '@/models/types';
import type { Point } from '@/models/geometry';

interface PendingTransitionSource {
  stateId: string;
  timestamp: number;
}

interface SelectionBox {
  start: Point;
  end: Point;
}

interface EditorStore {
  tool: EditorTool;
  selection: Selection[];
  drawingTransition: { sourceId: string; mousePos: { x: number; y: number } } | null;
  isDirty: boolean;
  placingNewState: boolean;
  pendingTransitionSource: PendingTransitionSource | null;
  selectionBox: SelectionBox | null;

  setTool: (tool: EditorTool) => void;
  setSelection: (selection: Selection | Selection[]) => void;
  addToSelection: (item: Selection) => void;
  removeFromSelection: (id: string) => void;
  toggleInSelection: (item: Selection) => void;
  clearSelection: () => void;
  setSelectionBox: (box: SelectionBox | null) => void;
  startDrawingTransition: (sourceId: string, mousePos: { x: number; y: number }) => void;
  updateDrawingTransition: (mousePos: { x: number; y: number }) => void;
  stopDrawingTransition: () => void;
  setDirty: (dirty: boolean) => void;
  startPlacingState: () => void;
  stopPlacingState: () => void;
  setPendingTransitionSource: (stateId: string | null) => void;
}

export const useEditorStore = create<EditorStore>((set) => ({
  tool: EditorTool.Pointer,
  selection: [],
  drawingTransition: null,
  isDirty: false,
  placingNewState: false,
  pendingTransitionSource: null,
  selectionBox: null,

  setTool: (tool) => set({ tool, selection: [] }),
  setSelection: (selection) =>
    set({ selection: Array.isArray(selection) ? selection : [selection] }),
  addToSelection: (item) =>
    set((s) => {
      if (s.selection.some((sel) => sel.id === item.id)) return s;
      return { selection: [...s.selection, item] };
    }),
  removeFromSelection: (id) =>
    set((s) => ({ selection: s.selection.filter((sel) => sel.id !== id) })),
  toggleInSelection: (item) =>
    set((s) => {
      const exists = s.selection.some((sel) => sel.id === item.id);
      if (exists) {
        return { selection: s.selection.filter((sel) => sel.id !== item.id) };
      }
      return { selection: [...s.selection, item] };
    }),
  clearSelection: () => set({ selection: [] }),
  setSelectionBox: (box) => set({ selectionBox: box }),
  startDrawingTransition: (sourceId, mousePos) =>
    set({ drawingTransition: { sourceId, mousePos } }),
  updateDrawingTransition: (mousePos) =>
    set((s) =>
      s.drawingTransition ? { drawingTransition: { ...s.drawingTransition, mousePos } } : s,
    ),
  stopDrawingTransition: () => set({ drawingTransition: null }),
  setDirty: (dirty) => set({ isDirty: dirty }),
  startPlacingState: () => set({ placingNewState: true }),
  stopPlacingState: () => set({ placingNewState: false }),
  setPendingTransitionSource: (stateId) =>
    set({
      pendingTransitionSource: stateId
        ? { stateId, timestamp: Date.now() }
        : null,
    }),
}));

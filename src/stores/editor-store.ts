import { create } from 'zustand';
import { EditorTool } from '@/models/types';
import type { Selection } from '@/models/types';

interface PendingTransitionSource {
  stateId: string;
  timestamp: number;
}

interface EditorStore {
  tool: EditorTool;
  selection: Selection | null;
  drawingTransition: { sourceId: string; mousePos: { x: number; y: number } } | null;
  isDirty: boolean;
  placingNewState: boolean;
  pendingTransitionSource: PendingTransitionSource | null;

  setTool: (tool: EditorTool) => void;
  setSelection: (selection: Selection | null) => void;
  clearSelection: () => void;
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
  selection: null,
  drawingTransition: null,
  isDirty: false,
  placingNewState: false,
  pendingTransitionSource: null,

  setTool: (tool) => set({ tool, selection: null }),
  setSelection: (selection) => set({ selection }),
  clearSelection: () => set({ selection: null }),
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

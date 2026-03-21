import { describe, it, expect, beforeEach } from 'vitest';
import { useEditorStore } from '@/stores/editor-store';

function resetStore() {
  useEditorStore.setState({
    selection: [],
    drawingTransition: null,
    isDirty: false,
    placingNewState: false,
    pendingTransitionSource: null,
    selectionBox: null,
  });
}

describe('EditorStore', () => {
  beforeEach(() => {
    resetStore();
  });

  describe('selection', () => {
    it('starts with empty selection', () => {
      expect(useEditorStore.getState().selection).toEqual([]);
    });

    it('setSelection with single item', () => {
      const store = useEditorStore.getState();
      store.setSelection({ type: 'state', id: 's1' });
      expect(useEditorStore.getState().selection).toEqual([{ type: 'state', id: 's1' }]);
    });

    it('setSelection with array replaces entire selection', () => {
      const store = useEditorStore.getState();
      store.setSelection([
        { type: 'state', id: 's1' },
        { type: 'state', id: 's2' },
      ]);
      expect(useEditorStore.getState().selection).toHaveLength(2);
    });

    it('addToSelection appends without duplicates', () => {
      const store = useEditorStore.getState();
      store.setSelection({ type: 'state', id: 's1' });
      store.addToSelection({ type: 'state', id: 's2' });
      expect(useEditorStore.getState().selection).toHaveLength(2);

      // Adding duplicate should not change selection
      store.addToSelection({ type: 'state', id: 's1' });
      expect(useEditorStore.getState().selection).toHaveLength(2);
    });

    it('removeFromSelection removes by id', () => {
      const store = useEditorStore.getState();
      store.setSelection([
        { type: 'state', id: 's1' },
        { type: 'state', id: 's2' },
      ]);
      store.removeFromSelection('s1');
      expect(useEditorStore.getState().selection).toEqual([{ type: 'state', id: 's2' }]);
    });

    it('toggleInSelection adds if not present', () => {
      const store = useEditorStore.getState();
      store.toggleInSelection({ type: 'state', id: 's1' });
      expect(useEditorStore.getState().selection).toHaveLength(1);
    });

    it('toggleInSelection removes if present', () => {
      const store = useEditorStore.getState();
      store.setSelection({ type: 'state', id: 's1' });
      store.toggleInSelection({ type: 'state', id: 's1' });
      expect(useEditorStore.getState().selection).toHaveLength(0);
    });

    it('clearSelection empties selection', () => {
      const store = useEditorStore.getState();
      store.setSelection([
        { type: 'state', id: 's1' },
        { type: 'transition', id: 't1' },
      ]);
      store.clearSelection();
      expect(useEditorStore.getState().selection).toEqual([]);
    });

    it('supports mixed state and transition selection', () => {
      const store = useEditorStore.getState();
      store.setSelection([
        { type: 'state', id: 's1' },
        { type: 'transition', id: 't1' },
      ]);
      expect(useEditorStore.getState().selection).toHaveLength(2);
    });
  });

  describe('drawingTransition', () => {
    it('starts as null', () => {
      expect(useEditorStore.getState().drawingTransition).toBeNull();
    });

    it('startDrawingTransition sets sourceId and mousePos', () => {
      const store = useEditorStore.getState();
      store.startDrawingTransition('s1', { x: 100, y: 200 });
      const dt = useEditorStore.getState().drawingTransition;
      expect(dt).toEqual({ sourceId: 's1', mousePos: { x: 100, y: 200 } });
    });

    it('updateDrawingTransition updates mousePos', () => {
      const store = useEditorStore.getState();
      store.startDrawingTransition('s1', { x: 100, y: 200 });
      store.updateDrawingTransition({ x: 300, y: 400 });
      const dt = useEditorStore.getState().drawingTransition;
      expect(dt?.mousePos).toEqual({ x: 300, y: 400 });
      expect(dt?.sourceId).toBe('s1');
    });

    it('updateDrawingTransition is no-op when not drawing', () => {
      const store = useEditorStore.getState();
      store.updateDrawingTransition({ x: 300, y: 400 });
      expect(useEditorStore.getState().drawingTransition).toBeNull();
    });

    it('stopDrawingTransition clears state', () => {
      const store = useEditorStore.getState();
      store.startDrawingTransition('s1', { x: 100, y: 200 });
      store.stopDrawingTransition();
      expect(useEditorStore.getState().drawingTransition).toBeNull();
    });
  });

  describe('placingNewState', () => {
    it('starts as false', () => {
      expect(useEditorStore.getState().placingNewState).toBe(false);
    });

    it('startPlacingState sets to true', () => {
      useEditorStore.getState().startPlacingState();
      expect(useEditorStore.getState().placingNewState).toBe(true);
    });

    it('stopPlacingState sets to false', () => {
      const store = useEditorStore.getState();
      store.startPlacingState();
      store.stopPlacingState();
      expect(useEditorStore.getState().placingNewState).toBe(false);
    });
  });

  describe('pendingTransitionSource', () => {
    it('starts as null', () => {
      expect(useEditorStore.getState().pendingTransitionSource).toBeNull();
    });

    it('setPendingTransitionSource with stateId sets with timestamp', () => {
      const before = Date.now();
      useEditorStore.getState().setPendingTransitionSource('s1');
      const pending = useEditorStore.getState().pendingTransitionSource;
      expect(pending).not.toBeNull();
      expect(pending!.stateId).toBe('s1');
      expect(pending!.timestamp).toBeGreaterThanOrEqual(before);
      expect(pending!.timestamp).toBeLessThanOrEqual(Date.now());
    });

    it('setPendingTransitionSource with null clears', () => {
      const store = useEditorStore.getState();
      store.setPendingTransitionSource('s1');
      store.setPendingTransitionSource(null);
      expect(useEditorStore.getState().pendingTransitionSource).toBeNull();
    });
  });

  describe('selectionBox', () => {
    it('starts as null', () => {
      expect(useEditorStore.getState().selectionBox).toBeNull();
    });

    it('setSelectionBox sets the box', () => {
      const box = { start: { x: 0, y: 0 }, end: { x: 100, y: 100 } };
      useEditorStore.getState().setSelectionBox(box);
      expect(useEditorStore.getState().selectionBox).toEqual(box);
    });

    it('setSelectionBox with null clears', () => {
      const store = useEditorStore.getState();
      store.setSelectionBox({ start: { x: 0, y: 0 }, end: { x: 100, y: 100 } });
      store.setSelectionBox(null);
      expect(useEditorStore.getState().selectionBox).toBeNull();
    });
  });

  describe('isDirty', () => {
    it('starts as false', () => {
      expect(useEditorStore.getState().isDirty).toBe(false);
    });

    it('setDirty marks as dirty', () => {
      useEditorStore.getState().setDirty(true);
      expect(useEditorStore.getState().isDirty).toBe(true);
    });

    it('setDirty can clear dirty', () => {
      const store = useEditorStore.getState();
      store.setDirty(true);
      store.setDirty(false);
      expect(useEditorStore.getState().isDirty).toBe(false);
    });
  });
});

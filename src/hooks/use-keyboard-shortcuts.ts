import { useEffect } from 'react';
import { useEditorStore } from '@/stores/editor-store';
import { useAutomatonStore } from '@/stores/automaton-store';
import { saveToJsonFile, loadFromJsonFile } from '@/services/serialization/file-io';
import { clearAutosave } from './use-autosave';

export function useKeyboardShortcuts() {
  const selection = useEditorStore((s) => s.selection);
  const clearSelection = useEditorStore((s) => s.clearSelection);
  const setDirty = useEditorStore((s) => s.setDirty);
  const startPlacingState = useEditorStore((s) => s.startPlacingState);
  const removeState = useAutomatonStore((s) => s.removeState);
  const removeTransition = useAutomatonStore((s) => s.removeTransition);
  const undo = useAutomatonStore((s) => s.undo);
  const redo = useAutomatonStore((s) => s.redo);

  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      // Don't trigger shortcuts when typing in inputs
      if (
        e.target instanceof HTMLInputElement ||
        e.target instanceof HTMLTextAreaElement ||
        e.target instanceof HTMLSelectElement
      ) {
        return;
      }

      const ctrl = e.ctrlKey || e.metaKey;

      // Ctrl/Cmd shortcuts
      if (ctrl) {
        switch (e.key.toLowerCase()) {
          case 'z':
            e.preventDefault();
            if (e.shiftKey) {
              redo();
            } else {
              undo();
            }
            return;
          case 'y':
            e.preventDefault();
            redo();
            return;
          case 's':
            e.preventDefault();
            saveToJsonFile(useAutomatonStore.getState().automaton);
            setDirty(false);
            return;
          case 'o':
            e.preventDefault();
            loadFromJsonFile().then((loaded) => {
              if (loaded) {
                useAutomatonStore.getState().setAutomaton(loaded);
                setDirty(false);
              }
            });
            return;
          case 'n':
            e.preventDefault();
            if (useAutomatonStore.getState().automaton.states.length > 0) {
              if (!confirm('Create new automaton? Unsaved changes will be lost.')) return;
            }
            useAutomatonStore.getState().newAutomaton();
            clearAutosave();
            setDirty(false);
            return;
        }
        return;
      }

      // Non-modifier shortcuts
      switch (e.key.toLowerCase()) {
        case 'n':
          startPlacingState();
          break;
        case 'escape':
          clearSelection();
          useEditorStore.getState().stopPlacingState();
          useEditorStore.getState().setPendingTransitionSource(null);
          break;
        case 'delete':
        case 'backspace':
          if (selection) {
            if (selection.type === 'state') removeState(selection.id);
            else removeTransition(selection.id);
            clearSelection();
          }
          break;
      }
    };

    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, [selection, clearSelection, removeState, removeTransition, undo, redo, setDirty, startPlacingState]);
}

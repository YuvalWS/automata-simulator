import { useEffect } from 'react';
import { useEditorStore } from '@/stores/editor-store';
import { useAutomatonStore } from '@/stores/automaton-store';
import { useSimulationStore } from '@/stores/simulation-store';
import { useTabStore, isTabEmpty } from '@/stores/tab-store';
import { saveToJsonFile, loadFromJsonFile, clearFileHandle } from '@/services/serialization/file-io';
import { setActiveTabFileHandle } from '@/stores/tab-store';
import { clearAutosave } from './use-autosave';

export function useKeyboardShortcuts() {
  const selection = useEditorStore((s) => s.selection);
  const clearSelection = useEditorStore((s) => s.clearSelection);
  const setDirty = useEditorStore((s) => s.setDirty);
  const startPlacingState = useEditorStore((s) => s.startPlacingState);
  const removeState = useAutomatonStore((s) => s.removeState);
  const removeTransition = useAutomatonStore((s) => s.removeTransition);
  const toggleAccepting = useAutomatonStore((s) => s.toggleAccepting);
  const undo = useAutomatonStore((s) => s.undo);
  const redo = useAutomatonStore((s) => s.redo);

  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      const ctrl = e.ctrlKey || e.metaKey;
      const simState = useSimulationStore.getState();
      const tabStore = useTabStore.getState();

      // Undo/redo work even when a sidebar input is focused
      if (ctrl && !simState.isActive) {
        const key = e.key.toLowerCase();
        if (key === 'z') { e.preventDefault(); e.shiftKey ? redo() : undo(); return; }
        if (key === 'y') { e.preventDefault(); redo(); return; }
      }

      // Don't trigger other shortcuts when typing in inputs
      if (
        e.target instanceof HTMLInputElement ||
        e.target instanceof HTMLTextAreaElement ||
        e.target instanceof HTMLSelectElement
      ) {
        return;
      }

      // Escape always works — exits simulation or clears selection
      if (e.key === 'Escape') {
        if (simState.isActive) {
          simState.exitSimulation();
        } else {
          clearSelection();
          useEditorStore.getState().stopPlacingState();
          useEditorStore.getState().setPendingTransitionSource(null);
        }
        return;
      }

      // Simulation-mode shortcuts
      if (simState.isActive) {
        switch (e.key) {
          case ' ':
            e.preventDefault();
            if (simState.trace) {
              simState.stepForward();
            } else {
              simState.startSimulation();
            }
            return;
          case 'Enter':
            e.preventDefault();
            if (simState.trace) {
              if (simState.autoRunning) {
                simState.stopAutoRun();
              } else {
                simState.startAutoRun();
              }
            } else {
              simState.startSimulation();
            }
            return;
          case 'ArrowRight':
            e.preventDefault();
            simState.stepForward();
            return;
          case 'ArrowLeft':
            e.preventDefault();
            simState.stepBackward();
            return;
        }
        // Block all other shortcuts during simulation (except tab switching below)
        if (!ctrl) return;
      }

      // Ctrl/Cmd shortcuts
      if (ctrl) {
        switch (e.key.toLowerCase()) {
          // Tab management
          case 't':
            e.preventDefault();
            tabStore.createTab();
            return;
          case 'w':
            e.preventDefault();
            tabStore.closeTab(tabStore.activeTabId);
            return;
          case 'pagedown':
            e.preventDefault();
            tabStore.switchToNextTab();
            return;
          case 'pageup':
            e.preventDefault();
            tabStore.switchToPrevTab();
            return;
        }

        // Block remaining ctrl shortcuts during simulation
        if (simState.isActive) return;

        switch (e.key.toLowerCase()) {
          case 's':
            e.preventDefault();
            saveToJsonFile(useAutomatonStore.getState().automaton);
            setDirty(false);
            return;
          case 'o':
            e.preventDefault();
            loadFromJsonFile().then((result) => {
              if (!result) return;
              const { automaton, fileHandle } = result;
              const activeId = useTabStore.getState().activeTabId;
              if (isTabEmpty(activeId)) {
                // Load into current empty tab
                useAutomatonStore.getState().setAutomaton(automaton);
                if (fileHandle) setActiveTabFileHandle(fileHandle);
                setDirty(false);
              } else {
                // Open in new tab
                useTabStore.getState().createTab(automaton, fileHandle);
              }
            });
            return;
          case 'a':
            e.preventDefault();
            useEditorStore.getState().setSelection(
              useAutomatonStore.getState().automaton.states.map((s) => ({ type: 'state' as const, id: s.id })),
            );
            return;
          case 'n':
            e.preventDefault();
            if (useAutomatonStore.getState().automaton.states.length > 0) {
              if (!confirm('Create new automaton? Unsaved changes will be lost.')) return;
            }
            useAutomatonStore.getState().newAutomaton();
            clearAutosave();
            clearFileHandle();
            setDirty(false);
            return;
        }
        return;
      }

      // Non-modifier shortcuts (editing mode only — already blocked above if simulating)
      if (simState.isActive) return;

      switch (e.key) {
        case ' ':
          // Toggle accepting for all selected states
          for (const sel of selection) {
            if (sel.type === 'state') {
              e.preventDefault();
              toggleAccepting(sel.id);
            }
          }
          break;
        case 'n':
        case 'N':
          startPlacingState();
          break;
        case 'Delete':
        case 'Backspace':
          if (selection.length > 0) {
            for (const sel of selection) {
              if (sel.type === 'state') removeState(sel.id);
              else removeTransition(sel.id);
            }
            clearSelection();
          }
          break;
      }
    };

    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, [selection, clearSelection, removeState, removeTransition, toggleAccepting, undo, redo, setDirty, startPlacingState]);
}

import { create } from 'zustand';
import type { Automaton } from '@/models/automaton';
import { createEmptyAutomaton } from '@/models/automaton';
import type { Selection } from '@/models/types';
import { useAutomatonStore } from './automaton-store';
import { useEditorStore } from './editor-store';
import { useHistoryStore } from './history-store';
import { useSimulationStore } from './simulation-store';

const MAX_TABS = 10;
const INACTIVE_HISTORY_LIMIT = 10;

export interface TabSnapshot {
  automaton: Automaton;
  history: { past: Automaton[]; future: Automaton[] };
  editor: { selection: Selection[]; isDirty: boolean };
  simulation: { wordInput: string; batchMode: boolean; batchInput: string };
}

export interface Tab {
  id: string;
  snapshot: TabSnapshot | null; // null = active tab (state lives in global stores)
}

// Per-tab file handles (not serializable, stored outside Zustand to avoid proxy issues)
const fileHandles = new Map<string, any>();

interface TabStore {
  tabs: Tab[];
  activeTabId: string;

  createTab: (automaton?: Automaton, fileHandle?: any) => string | null;
  closeTab: (id: string) => void;
  switchTab: (id: string) => void;
  switchToNextTab: () => void;
  switchToPrevTab: () => void;
  reorderTab: (fromIndex: number, toIndex: number) => void;
  getTabCount: () => number;
}

function snapshotCurrentStores(): TabSnapshot {
  const automatonState = useAutomatonStore.getState();
  const historyState = useHistoryStore.getState();
  const editorState = useEditorStore.getState();
  const simState = useSimulationStore.getState();

  return {
    automaton: automatonState.automaton,
    history: {
      past: historyState.past.slice(-INACTIVE_HISTORY_LIMIT),
      future: historyState.future.slice(0, INACTIVE_HISTORY_LIMIT),
    },
    editor: {
      selection: editorState.selection,
      isDirty: editorState.isDirty,
    },
    simulation: {
      wordInput: simState.wordInput,
      batchMode: simState.batchMode,
      batchInput: simState.batchInput,
    },
  };
}

function restoreSnapshot(snapshot: TabSnapshot) {
  // Use setState directly to avoid triggering history pushes or side effects
  useAutomatonStore.setState({ automaton: snapshot.automaton });
  useHistoryStore.setState({ past: snapshot.history.past, future: snapshot.history.future });
  useEditorStore.setState({
    selection: snapshot.editor.selection,
    isDirty: snapshot.editor.isDirty,
    drawingTransition: null,
    placingNewState: false,
    pendingTransitionSource: null,
    selectionBox: null,
  });
  useSimulationStore.setState({
    isActive: false,
    wordInput: snapshot.simulation.wordInput,
    word: [],
    trace: null,
    currentStep: 0,
    autoRunning: false,
    validationMessages: [],
    batchMode: snapshot.simulation.batchMode,
    batchInput: snapshot.simulation.batchInput,
    batchResults: null,
  });
}

function cleanupActiveTab() {
  // Stop simulation auto-run interval
  const simState = useSimulationStore.getState();
  if (simState.autoRunning) {
    simState.stopAutoRun();
  }
  if (simState.isActive) {
    // Don't call exitSimulation() as it resets wordInput — we preserve it in the snapshot
    // Just stop the auto-run which we already did above
  }

  // Clear transient editor state
  const editorState = useEditorStore.getState();
  if (editorState.drawingTransition) editorState.stopDrawingTransition();
  if (editorState.placingNewState) editorState.stopPlacingState();
  if (editorState.pendingTransitionSource) editorState.setPendingTransitionSource(null);
  if (editorState.selectionBox) editorState.setSelectionBox(null);
}

const initialTabId = crypto.randomUUID();

export const useTabStore = create<TabStore>((set, get) => ({
  tabs: [{ id: initialTabId, snapshot: null }],
  activeTabId: initialTabId,

  createTab: (automaton, fileHandle) => {
    const { tabs } = get();
    if (tabs.length >= MAX_TABS) {
      alert(`Maximum of ${MAX_TABS} tabs reached.`);
      return null;
    }

    const newTabId = crypto.randomUUID();

    // Snapshot current active tab before switching
    cleanupActiveTab();
    const currentSnapshot = snapshotCurrentStores();
    const currentFileHandle = getActiveTabFileHandle();

    // Save current tab's file handle
    const { activeTabId } = get();
    if (currentFileHandle) {
      fileHandles.set(activeTabId, currentFileHandle);
    }

    // Update current tab with snapshot
    set((s) => ({
      tabs: s.tabs.map((t) =>
        t.id === s.activeTabId ? { ...t, snapshot: currentSnapshot } : t
      ),
    }));

    // Set up new tab's state in the global stores
    const newAutomaton = automaton ?? createEmptyAutomaton();
    useAutomatonStore.setState({ automaton: newAutomaton });
    useHistoryStore.setState({ past: [], future: [] });
    useEditorStore.setState({
      selection: [],
      isDirty: false,
      drawingTransition: null,
      placingNewState: false,
      pendingTransitionSource: null,
      selectionBox: null,
    });
    useSimulationStore.setState({
      isActive: false,
      wordInput: '',
      word: [],
      trace: null,
      currentStep: 0,
      autoRunning: false,
      validationMessages: [],
      batchMode: false,
      batchInput: '',
      batchResults: null,
    });

    // Store file handle for new tab
    if (fileHandle) {
      fileHandles.set(newTabId, fileHandle);
    }

    set((s) => ({
      tabs: [...s.tabs, { id: newTabId, snapshot: null }],
      activeTabId: newTabId,
    }));

    return newTabId;
  },

  closeTab: (id) => {
    const { tabs, activeTabId } = get();

    // Check if the tab being closed is dirty
    let isDirty = false;
    if (id === activeTabId) {
      isDirty = useEditorStore.getState().isDirty;
    } else {
      const tab = tabs.find((t) => t.id === id);
      isDirty = tab?.snapshot?.editor.isDirty ?? false;
    }

    if (isDirty) {
      const tabName = id === activeTabId
        ? useAutomatonStore.getState().automaton.name
        : tabs.find((t) => t.id === id)?.snapshot?.automaton.name ?? 'Untitled';
      if (!confirm(`Tab "${tabName}" has unsaved changes. Close anyway?`)) {
        return;
      }
    }

    // Clean up file handle
    fileHandles.delete(id);

    if (tabs.length === 1) {
      // Last tab: replace with a fresh empty tab
      const newTabId = crypto.randomUUID();
      useAutomatonStore.getState().newAutomaton();
      useHistoryStore.setState({ past: [], future: [] });
      useEditorStore.setState({
        selection: [],
        isDirty: false,
        drawingTransition: null,
        placingNewState: false,
        pendingTransitionSource: null,
        selectionBox: null,
      });
      useSimulationStore.setState({
        isActive: false,
        wordInput: '',
        word: [],
        trace: null,
        currentStep: 0,
        autoRunning: false,
        validationMessages: [],
        batchMode: false,
        batchInput: '',
        batchResults: null,
      });
      set({ tabs: [{ id: newTabId, snapshot: null }], activeTabId: newTabId });
      return;
    }

    if (id === activeTabId) {
      // Closing the active tab: switch to an adjacent tab first
      const idx = tabs.findIndex((t) => t.id === id);
      const nextTab = tabs[idx + 1] ?? tabs[idx - 1]!;

      cleanupActiveTab();

      // Restore the next tab
      restoreSnapshot(nextTab.snapshot!);
      const nextFileHandle = fileHandles.get(nextTab.id);
      if (nextFileHandle) {
        fileHandles.set(nextTab.id, nextFileHandle);
      }

      set({
        tabs: tabs
          .filter((t) => t.id !== id)
          .map((t) => (t.id === nextTab.id ? { ...t, snapshot: null } : t)),
        activeTabId: nextTab.id,
      });
    } else {
      // Closing a non-active tab: just remove it
      set({ tabs: tabs.filter((t) => t.id !== id) });
    }
  },

  switchTab: (targetId) => {
    const { tabs, activeTabId } = get();
    if (targetId === activeTabId) return;

    const targetTab = tabs.find((t) => t.id === targetId);
    if (!targetTab || !targetTab.snapshot) return;

    // 1. Clean up active tab side effects
    cleanupActiveTab();

    // 2. Snapshot current stores
    const currentSnapshot = snapshotCurrentStores();
    const currentFileHandle = getActiveTabFileHandle();
    if (currentFileHandle) {
      fileHandles.set(activeTabId, currentFileHandle);
    }

    // 3. Restore target tab
    restoreSnapshot(targetTab.snapshot);

    // 4. Update tab state
    set({
      tabs: tabs.map((t) => {
        if (t.id === activeTabId) return { ...t, snapshot: currentSnapshot };
        if (t.id === targetId) return { ...t, snapshot: null };
        return t;
      }),
      activeTabId: targetId,
    });
  },

  switchToNextTab: () => {
    const { tabs, activeTabId } = get();
    if (tabs.length <= 1) return;
    const idx = tabs.findIndex((t) => t.id === activeTabId);
    const nextIdx = (idx + 1) % tabs.length;
    get().switchTab(tabs[nextIdx]!.id);
  },

  switchToPrevTab: () => {
    const { tabs, activeTabId } = get();
    if (tabs.length <= 1) return;
    const idx = tabs.findIndex((t) => t.id === activeTabId);
    const prevIdx = (idx - 1 + tabs.length) % tabs.length;
    get().switchTab(tabs[prevIdx]!.id);
  },

  reorderTab: (fromIndex, toIndex) => {
    set((s) => {
      const newTabs = [...s.tabs];
      const [moved] = newTabs.splice(fromIndex, 1);
      newTabs.splice(toIndex, 0, moved!);
      return { tabs: newTabs };
    });
  },

  getTabCount: () => get().tabs.length,
}));

// --- File handle helpers (used by file-io.ts) ---

export function getActiveTabFileHandle(): any | null {
  const { activeTabId } = useTabStore.getState();
  return fileHandles.get(activeTabId) ?? null;
}

export function setActiveTabFileHandle(handle: any): void {
  const { activeTabId } = useTabStore.getState();
  if (handle) {
    fileHandles.set(activeTabId, handle);
  } else {
    fileHandles.delete(activeTabId);
  }
}

export function clearActiveTabFileHandle(): void {
  const { activeTabId } = useTabStore.getState();
  fileHandles.delete(activeTabId);
}

// --- Helpers for autosave and external access ---

export function getTabName(tabId: string): string {
  const { tabs, activeTabId } = useTabStore.getState();
  if (tabId === activeTabId) {
    return useAutomatonStore.getState().automaton.name;
  }
  const tab = tabs.find((t) => t.id === tabId);
  return tab?.snapshot?.automaton.name ?? 'Untitled';
}

export function isTabDirty(tabId: string): boolean {
  const { tabs, activeTabId } = useTabStore.getState();
  if (tabId === activeTabId) {
    return useEditorStore.getState().isDirty;
  }
  const tab = tabs.find((t) => t.id === tabId);
  return tab?.snapshot?.editor.isDirty ?? false;
}

export function isAnyTabDirty(): boolean {
  const { tabs } = useTabStore.getState();
  return tabs.some((t) => isTabDirty(t.id));
}

export function getTabAutomaton(tabId: string): Automaton | null {
  const { tabs, activeTabId } = useTabStore.getState();
  if (tabId === activeTabId) {
    return useAutomatonStore.getState().automaton;
  }
  const tab = tabs.find((t) => t.id === tabId);
  return tab?.snapshot?.automaton ?? null;
}

/** Check if a tab is "empty" (default state, suitable for loading into) */
export function isTabEmpty(tabId: string): boolean {
  const automaton = getTabAutomaton(tabId);
  if (!automaton) return false;
  return (
    automaton.name === 'Untitled' &&
    automaton.transitions.length === 0 &&
    automaton.states.length <= 1 &&
    !isTabDirty(tabId)
  );
}

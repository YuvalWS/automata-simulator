/**
 * Tests for tab-store.ts
 *
 * The tab store orchestrates cross-store state management: when switching tabs,
 * it snapshots the current automaton, editor, history, and simulation stores,
 * then restores the target tab's snapshot. Bugs here cause data loss between tabs.
 */
import { describe, it, expect, beforeEach, vi } from 'vitest';
import {
  useTabStore,
  getTabName,
  isTabDirty,
  isTabEmpty,
} from '@/stores/tab-store';
import { useAutomatonStore } from '@/stores/automaton-store';
import { useEditorStore } from '@/stores/editor-store';
import { useHistoryStore } from '@/stores/history-store';
import { useSimulationStore } from '@/stores/simulation-store';

/**
 * Reset all stores to a clean initial state before each test.
 * The tab store uses module-level initialTabId from crypto.randomUUID(),
 * so we must work with the actual initial state rather than mocking it.
 */
function resetAllStores() {
  // Reset dependent stores first
  useAutomatonStore.getState().newAutomaton('Untitled');
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

  // Reset tab store — close all tabs except one fresh one
  // Close all but the first tab, then reset the first
  while (useTabStore.getState().tabs.length > 1) {
    const tabsNow = useTabStore.getState().tabs;
    const nonActiveTab = tabsNow.find((t) => t.id !== useTabStore.getState().activeTabId);
    if (nonActiveTab) {
      useTabStore.getState().closeTab(nonActiveTab.id);
    } else {
      break;
    }
  }
  // Close the last one to trigger a fresh replacement
  const lastTab = useTabStore.getState().tabs[0]!;
  useTabStore.getState().closeTab(lastTab.id);
}

describe('tab store', () => {
  beforeEach(() => {
    // Mock window.alert and window.confirm to prevent test hangs
    vi.spyOn(window, 'alert').mockImplementation(() => {});
    vi.spyOn(window, 'confirm').mockImplementation(() => true);
    resetAllStores();
  });

  // --- Initial state ---

  it('starts with one tab', () => {
    expect(useTabStore.getState().tabs).toHaveLength(1);
  });

  it('initial tab has null snapshot (active tab state lives in global stores)', () => {
    const tab = useTabStore.getState().tabs[0]!;
    expect(tab.snapshot).toBeNull();
  });

  it('getTabCount returns 1 initially', () => {
    expect(useTabStore.getState().getTabCount()).toBe(1);
  });

  // --- createTab ---

  describe('createTab', () => {
    it('creates a new tab and switches to it', () => {
      const originalActiveId = useTabStore.getState().activeTabId;
      useTabStore.getState().createTab();

      expect(useTabStore.getState().tabs).toHaveLength(2);
      expect(useTabStore.getState().activeTabId).not.toBe(originalActiveId);
    });

    it('new tab gets fresh empty automaton', () => {
      // Set up a named automaton on tab 1
      useAutomatonStore.getState().setName('MyDFA');
      useTabStore.getState().createTab();

      // New tab should have a fresh 'Untitled' automaton
      const { automaton } = useAutomatonStore.getState();
      expect(automaton.name).toBe('Untitled');
      expect(automaton.states).toHaveLength(1);
      expect(automaton.states[0]!.name).toBe('q0');
    });

    it('old tab receives a snapshot when new tab is created', () => {
      const originalId = useTabStore.getState().activeTabId;
      useTabStore.getState().createTab();

      // The original tab should now have a non-null snapshot
      const originalTab = useTabStore.getState().tabs.find((t) => t.id === originalId);
      expect(originalTab).toBeDefined();
      expect(originalTab!.snapshot).not.toBeNull();
    });

    it('returns null when MAX_TABS (10) reached', () => {
      // Create 9 more tabs to reach 10 total
      for (let i = 0; i < 9; i++) {
        useTabStore.getState().createTab();
      }
      expect(useTabStore.getState().tabs).toHaveLength(10);

      // 11th tab should fail
      const result = useTabStore.getState().createTab();
      expect(result).toBeNull();
      expect(window.alert).toHaveBeenCalled();
      expect(useTabStore.getState().tabs).toHaveLength(10);
    });

    it('returns tab id string on success', () => {
      const id = useTabStore.getState().createTab();
      expect(typeof id).toBe('string');
      expect(id!.length).toBeGreaterThan(0);
    });
  });

  // --- switchTab ---

  describe('switchTab', () => {
    it('switches active tab and restores snapshot', () => {
      // Name the automaton on tab 1
      useAutomatonStore.getState().setName('Tab1Automaton');
      const tab1Id = useTabStore.getState().activeTabId;

      // Create tab 2 (auto-switches to it)
      useTabStore.getState().createTab();
      useAutomatonStore.getState().setName('Tab2Automaton');

      // Switch back to tab 1
      useTabStore.getState().switchTab(tab1Id);

      // Tab 1's automaton name should be restored
      expect(useAutomatonStore.getState().automaton.name).toBe('Tab1Automaton');
    });

    it('is a no-op when switching to already active tab', () => {
      const activeId = useTabStore.getState().activeTabId;
      useTabStore.getState().switchTab(activeId);

      // Still the same active tab
      expect(useTabStore.getState().activeTabId).toBe(activeId);
    });

    it('preserves simulation wordInput across tab switch round-trip', () => {
      const tab1Id = useTabStore.getState().activeTabId;

      // Set word input on tab 1
      useSimulationStore.setState({ wordInput: 'a,b,a' });

      // Create and switch to tab 2
      useTabStore.getState().createTab();

      // Word input should be reset on new tab
      expect(useSimulationStore.getState().wordInput).toBe('');

      // Switch back to tab 1
      useTabStore.getState().switchTab(tab1Id);

      // Word input should be restored
      expect(useSimulationStore.getState().wordInput).toBe('a,b,a');
    });
  });

  // --- closeTab ---

  describe('closeTab', () => {
    it('closing non-active tab just removes it without changing active tab', () => {
      const tab1Id = useTabStore.getState().activeTabId;
      useTabStore.getState().createTab();
      const tab2Id = useTabStore.getState().activeTabId;

      // Switch back to tab 1, then close tab 2 (non-active)
      useTabStore.getState().switchTab(tab1Id);
      useTabStore.getState().closeTab(tab2Id);

      expect(useTabStore.getState().tabs).toHaveLength(1);
      expect(useTabStore.getState().activeTabId).toBe(tab1Id);
    });

    it('closing active tab switches to adjacent tab', () => {
      const tab1Id = useTabStore.getState().activeTabId;
      const tab2Id = useTabStore.getState().createTab()!;

      // Close active tab (tab 2)
      useTabStore.getState().closeTab(tab2Id);

      expect(useTabStore.getState().tabs).toHaveLength(1);
      expect(useTabStore.getState().activeTabId).toBe(tab1Id);
    });

    it('closing last tab creates a fresh replacement', () => {
      const originalId = useTabStore.getState().activeTabId;
      useTabStore.getState().closeTab(originalId);

      // Should still have 1 tab, but with a new id
      expect(useTabStore.getState().tabs).toHaveLength(1);
      expect(useTabStore.getState().activeTabId).not.toBe(originalId);

      // Fresh automaton
      const { automaton } = useAutomatonStore.getState();
      expect(automaton.name).toBe('Untitled');
    });
  });

  // --- switchToNextTab / switchToPrevTab ---

  describe('switchToNextTab / switchToPrevTab', () => {
    it('next wraps around from last to first tab', () => {
      const tab1Id = useTabStore.getState().activeTabId;
      useTabStore.getState().createTab();
      useTabStore.getState().createTab();

      // Currently on tab 3 (last). Next should wrap to tab 1.
      useTabStore.getState().switchToNextTab();
      expect(useTabStore.getState().activeTabId).toBe(tab1Id);
    });

    it('prev wraps around from first to last tab', () => {
      const tab1Id = useTabStore.getState().activeTabId;
      useTabStore.getState().createTab();
      const tab3Id = useTabStore.getState().createTab()!;

      // Switch to tab 1
      useTabStore.getState().switchTab(tab1Id);

      // Prev should wrap to tab 3 (last)
      useTabStore.getState().switchToPrevTab();
      expect(useTabStore.getState().activeTabId).toBe(tab3Id);
    });

    it('both are no-ops with a single tab', () => {
      const id = useTabStore.getState().activeTabId;
      useTabStore.getState().switchToNextTab();
      expect(useTabStore.getState().activeTabId).toBe(id);

      useTabStore.getState().switchToPrevTab();
      expect(useTabStore.getState().activeTabId).toBe(id);
    });
  });

  // --- reorderTab ---

  describe('reorderTab', () => {
    it('moves tab from one index to another', () => {
      const tab1Id = useTabStore.getState().activeTabId;
      const tab2Id = useTabStore.getState().createTab()!;
      const tab3Id = useTabStore.getState().createTab()!;

      // Move tab 1 (index 0) to index 2
      useTabStore.getState().reorderTab(0, 2);
      const ids = useTabStore.getState().tabs.map((t) => t.id);

      expect(ids).toEqual([tab2Id, tab3Id, tab1Id]);
    });
  });

  // --- Helper functions ---

  describe('helper functions', () => {
    it('getTabName returns automaton name for active tab', () => {
      useAutomatonStore.getState().setName('ActiveDFA');
      const id = useTabStore.getState().activeTabId;
      expect(getTabName(id)).toBe('ActiveDFA');
    });

    it('getTabName returns snapshot name for inactive tab', () => {
      useAutomatonStore.getState().setName('Tab1Name');
      const tab1Id = useTabStore.getState().activeTabId;

      // Create tab 2 — tab 1 gets snapshotted
      useTabStore.getState().createTab();

      expect(getTabName(tab1Id)).toBe('Tab1Name');
    });

    it('isTabDirty reflects editor isDirty for active tab', () => {
      const id = useTabStore.getState().activeTabId;
      expect(isTabDirty(id)).toBe(false);

      useEditorStore.setState({ isDirty: true });
      expect(isTabDirty(id)).toBe(true);
    });

    it('isTabEmpty returns true for default new tab', () => {
      const id = useTabStore.getState().activeTabId;
      // Default: name='Untitled', 1 state (q0), 0 transitions, not dirty
      expect(isTabEmpty(id)).toBe(true);
    });
  });
});

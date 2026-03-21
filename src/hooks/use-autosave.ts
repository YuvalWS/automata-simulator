import { useEffect, useRef } from 'react';
import { useAutomatonStore } from '@/stores/automaton-store';
import { useEditorStore } from '@/stores/editor-store';
import { useHistoryStore } from '@/stores/history-store';
import { useTabStore, getTabAutomaton, isTabDirty } from '@/stores/tab-store';
import type { TabSnapshot } from '@/stores/tab-store';
import { serializeToJson, deserializeFromJson } from '@/services/serialization/json-serializer';
import type { Automaton } from '@/models/automaton';

export const AUTOSAVE_KEY = 'automata-autosave';
export const TABS_AUTOSAVE_KEY = 'automata-tabs-autosave';
const DEBOUNCE_MS = 500;

interface TabsAutosave {
  version: '1.0.0';
  activeTabId: string;
  tabs: Array<{
    id: string;
    automaton: string; // serialized JSON
    isDirty: boolean;
  }>;
}

function buildAutosavePayload(): string {
  const { tabs, activeTabId } = useTabStore.getState();
  const payload: TabsAutosave = {
    version: '1.0.0',
    activeTabId,
    tabs: tabs.map((tab) => {
      const automaton = getTabAutomaton(tab.id);
      const dirty = isTabDirty(tab.id);
      return {
        id: tab.id,
        automaton: automaton ? serializeToJson(automaton) : '',
        isDirty: dirty,
      };
    }),
  };
  return JSON.stringify(payload);
}

export function useAutosave() {
  const timeoutRef = useRef<ReturnType<typeof setTimeout>>();

  useEffect(() => {
    const scheduleAutosave = () => {
      if (timeoutRef.current) clearTimeout(timeoutRef.current);
      timeoutRef.current = setTimeout(() => {
        try {
          localStorage.setItem(TABS_AUTOSAVE_KEY, buildAutosavePayload());
        } catch {
          // Silently fail on localStorage errors
        }
      }, DEBOUNCE_MS);
    };

    const triggerAutosave = () => {
      useEditorStore.getState().setDirty(true);
      scheduleAutosave();
    };

    // Subscribe to automaton changes (main editing trigger — marks dirty)
    const unsubAutomaton = useAutomatonStore.subscribe(triggerAutosave);
    // Subscribe to tab changes (tab create/close/switch — saves but does NOT mark dirty)
    const unsubTabs = useTabStore.subscribe(scheduleAutosave);

    return () => {
      unsubAutomaton();
      unsubTabs();
      if (timeoutRef.current) clearTimeout(timeoutRef.current);
    };
  }, []);
}

export function clearAutosave() {
  localStorage.removeItem(TABS_AUTOSAVE_KEY);
  localStorage.removeItem(AUTOSAVE_KEY);
}

/** Restore tabs from autosave on startup. Returns true if restored. */
export function restoreTabsFromAutosave(): boolean {
  // Try new multi-tab format
  const tabsJson = localStorage.getItem(TABS_AUTOSAVE_KEY);
  if (tabsJson) {
    try {
      const payload: TabsAutosave = JSON.parse(tabsJson);
      if (payload.version === '1.0.0' && payload.tabs.length > 0) {
        return restoreTabsPayload(payload);
      }
    } catch {
      localStorage.removeItem(TABS_AUTOSAVE_KEY);
    }
  }

  // Try legacy single-automaton format
  const legacyJson = localStorage.getItem(AUTOSAVE_KEY);
  if (legacyJson) {
    try {
      const automaton = deserializeFromJson(legacyJson);
      useAutomatonStore.getState().setAutomaton(automaton);
      // Migrate to new format
      localStorage.removeItem(AUTOSAVE_KEY);
      return true;
    } catch {
      localStorage.removeItem(AUTOSAVE_KEY);
    }
  }

  return false;
}

function restoreTabsPayload(payload: TabsAutosave): boolean {
  const restoredTabs: Array<{ id: string; automaton: Automaton; isDirty: boolean }> = [];

  for (const tabData of payload.tabs) {
    if (!tabData.automaton) continue;
    try {
      const automaton = deserializeFromJson(tabData.automaton);
      restoredTabs.push({ id: tabData.id, automaton, isDirty: tabData.isDirty });
    } catch {
      // Skip invalid tabs
    }
  }

  if (restoredTabs.length === 0) return false;

  // Determine which tab should be active
  let activeId = payload.activeTabId;
  if (!restoredTabs.find((t) => t.id === activeId)) {
    activeId = restoredTabs[0]!.id;
  }

  // Build tab objects
  const tabs = restoredTabs.map((rt) => {
    if (rt.id === activeId) {
      // Active tab: load into global stores, snapshot is null
      useAutomatonStore.setState({ automaton: rt.automaton });
      useEditorStore.setState({ isDirty: rt.isDirty, selection: [] });
      useHistoryStore.setState({ past: [], future: [] });
      return { id: rt.id, snapshot: null };
    }
    // Inactive tab: store as snapshot
    const snapshot: TabSnapshot = {
      automaton: rt.automaton,
      history: { past: [], future: [] },
      editor: { selection: [], isDirty: rt.isDirty },
      simulation: { wordInput: '', batchMode: false, batchInput: '' },
    };
    return { id: rt.id, snapshot };
  });

  useTabStore.setState({ tabs, activeTabId: activeId });
  return true;
}

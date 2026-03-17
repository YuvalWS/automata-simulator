import { useEffect, useRef } from 'react';
import { useAutomatonStore } from '@/stores/automaton-store';
import { useEditorStore } from '@/stores/editor-store';
import { serializeToJson } from '@/services/serialization/json-serializer';

export const AUTOSAVE_KEY = 'automata-autosave';
const DEBOUNCE_MS = 500;

export function useAutosave() {
  const timeoutRef = useRef<ReturnType<typeof setTimeout>>();

  useEffect(() => {
    const unsubscribe = useAutomatonStore.subscribe((state) => {
      useEditorStore.getState().setDirty(true);

      if (timeoutRef.current) clearTimeout(timeoutRef.current);
      timeoutRef.current = setTimeout(() => {
        try {
          const json = serializeToJson(state.automaton);
          localStorage.setItem(AUTOSAVE_KEY, json);
        } catch {
          // Silently fail on localStorage errors
        }
      }, DEBOUNCE_MS);
    });

    return () => {
      unsubscribe();
      if (timeoutRef.current) clearTimeout(timeoutRef.current);
    };
  }, []);
}

export function clearAutosave() {
  localStorage.removeItem(AUTOSAVE_KEY);
}

import { useEffect } from 'react';
import { useEditorStore } from '@/stores/editor-store';

export function useUnsavedWarning() {
  const isDirty = useEditorStore((s) => s.isDirty);

  useEffect(() => {
    const handler = (e: BeforeUnloadEvent) => {
      if (isDirty) {
        e.preventDefault();
      }
    };

    window.addEventListener('beforeunload', handler);
    return () => window.removeEventListener('beforeunload', handler);
  }, [isDirty]);
}

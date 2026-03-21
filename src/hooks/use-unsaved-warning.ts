import { useEffect } from 'react';
import { useEditorStore } from '@/stores/editor-store';
import { isAnyTabDirty } from '@/stores/tab-store';

export function useUnsavedWarning() {
  const activeIsDirty = useEditorStore((s) => s.isDirty);

  useEffect(() => {
    const handler = (e: BeforeUnloadEvent) => {
      if (activeIsDirty || isAnyTabDirty()) {
        e.preventDefault();
      }
    };

    window.addEventListener('beforeunload', handler);
    return () => window.removeEventListener('beforeunload', handler);
  }, [activeIsDirty]);
}

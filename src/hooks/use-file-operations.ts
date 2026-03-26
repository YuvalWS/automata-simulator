import { useAutomatonStore } from '@/stores/automaton-store';
import { useEditorStore } from '@/stores/editor-store';
import { useTabStore, isTabEmpty, setActiveTabFileHandle } from '@/stores/tab-store';
import { saveToJsonFile, loadFromJsonFile, clearFileHandle } from '@/services/serialization/file-io';
import { clearAutosave } from '@/hooks/use-autosave';
import { exportAutomatonAsPng } from '@/services/export/png-export';

export function useFileOperations() {
  const automaton = useAutomatonStore((s) => s.automaton);
  const setAutomaton = useAutomatonStore((s) => s.setAutomaton);
  const newAutomaton = useAutomatonStore((s) => s.newAutomaton);
  const setDirty = useEditorStore((s) => s.setDirty);

  const handleNew = () => {
    if (automaton.states.length > 0 && !confirm('Create new automaton? Unsaved changes will be lost.')) {
      return;
    }
    newAutomaton();
    clearAutosave();
    clearFileHandle();
    setDirty(false);
  };

  const handleSave = () => {
    saveToJsonFile(automaton);
    setDirty(false);
  };

  const handleLoad = async () => {
    const result = await loadFromJsonFile();
    if (!result) return;
    const { automaton: loaded, fileHandle } = result;
    const activeId = useTabStore.getState().activeTabId;
    if (isTabEmpty(activeId)) {
      setAutomaton(loaded);
      if (fileHandle) setActiveTabFileHandle(fileHandle);
      setDirty(false);
    } else {
      useTabStore.getState().createTab(loaded, fileHandle);
    }
  };

  const handleExportPng = async () => {
    const svg = document.querySelector('.automata-canvas') as SVGSVGElement | null;
    if (!svg) return;
    try {
      await exportAutomatonAsPng(svg, automaton.states);
    } catch {
      // Export failed silently
    }
  };

  return { handleNew, handleSave, handleLoad, handleExportPng };
}

import { AutomataCanvas } from './components/canvas/AutomataCanvas';
import { Toolbar } from './components/toolbar/Toolbar';
import { PropertiesPanel } from './components/panels/PropertiesPanel';
import { SimulationPanel } from './components/panels/SimulationPanel';
import { ShortcutsTooltip } from './components/help/ShortcutsTooltip';
import { useKeyboardShortcuts } from './hooks/use-keyboard-shortcuts';
import { useAutosave } from './hooks/use-autosave';
import { useUnsavedWarning } from './hooks/use-unsaved-warning';
import { useTheme } from './hooks/use-theme';
import { useSimulationStore } from './stores/simulation-store';
import { useAutomatonStore } from './stores/automaton-store';
import { useEditorStore } from './stores/editor-store';
import { MobileWarning } from './components/MobileWarning';

if (import.meta.env.DEV) {
  (window as any).__stores__ = {
    automatonStore: useAutomatonStore,
    editorStore: useEditorStore,
    simulationStore: useSimulationStore,
  };
}

export default function App() {
  useKeyboardShortcuts();
  useAutosave();
  useUnsavedWarning();
  useTheme();

  const isSimulating = useSimulationStore((s) => s.isActive);

  return (
    <div className="app">
      <Toolbar />
      <div className="app-main">
        <AutomataCanvas />
        {isSimulating ? <SimulationPanel /> : <PropertiesPanel />}
      </div>
      <ShortcutsTooltip />
      <MobileWarning />
    </div>
  );
}

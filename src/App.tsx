import { AutomataCanvas } from './components/canvas/AutomataCanvas';
import { Toolbar } from './components/toolbar/Toolbar';
import { TabBar } from './components/tabs/TabBar';
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
import { useTabStore } from './stores/tab-store';
import { MobileWarning } from './components/MobileWarning';

if (import.meta.env.DEV) {
  (window as any).__stores__ = {
    automatonStore: useAutomatonStore,
    editorStore: useEditorStore,
    simulationStore: useSimulationStore,
    tabStore: useTabStore,
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
      <TabBar />
      <div className="app-main">
        <AutomataCanvas />
        {isSimulating ? <SimulationPanel /> : <PropertiesPanel />}
      </div>
      <ShortcutsTooltip />
      <MobileWarning />
    </div>
  );
}

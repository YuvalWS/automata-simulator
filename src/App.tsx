import { AutomataCanvas } from './components/canvas/AutomataCanvas';
import { Toolbar } from './components/toolbar/Toolbar';
import { PropertiesPanel } from './components/panels/PropertiesPanel';
import { SimulationPanel } from './components/panels/SimulationPanel';
import { ShortcutsTooltip } from './components/help/ShortcutsTooltip';
import { useKeyboardShortcuts } from './hooks/use-keyboard-shortcuts';
import { useAutosave } from './hooks/use-autosave';
import { useUnsavedWarning } from './hooks/use-unsaved-warning';
import { useSimulationStore } from './stores/simulation-store';

export default function App() {
  useKeyboardShortcuts();
  useAutosave();
  useUnsavedWarning();

  const isSimulating = useSimulationStore((s) => s.isActive);

  return (
    <div className="app">
      <Toolbar />
      <div className="app-main">
        <AutomataCanvas />
        {isSimulating ? <SimulationPanel /> : <PropertiesPanel />}
      </div>
      <ShortcutsTooltip />
    </div>
  );
}

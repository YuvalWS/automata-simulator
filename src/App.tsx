import { AutomataCanvas } from './components/canvas/AutomataCanvas';
import { Toolbar } from './components/toolbar/Toolbar';
import { PropertiesPanel } from './components/panels/PropertiesPanel';
import { ShortcutsTooltip } from './components/help/ShortcutsTooltip';
import { useKeyboardShortcuts } from './hooks/use-keyboard-shortcuts';
import { useAutosave } from './hooks/use-autosave';
import { useUnsavedWarning } from './hooks/use-unsaved-warning';

export default function App() {
  useKeyboardShortcuts();
  useAutosave();
  useUnsavedWarning();

  return (
    <div className="app">
      <Toolbar />
      <div className="app-main">
        <AutomataCanvas />
        <PropertiesPanel />
      </div>
      <ShortcutsTooltip />
    </div>
  );
}

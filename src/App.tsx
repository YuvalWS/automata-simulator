import { useState, useEffect } from 'react';
import { AutomataCanvas } from './components/canvas/AutomataCanvas';
import { Toolbar } from './components/toolbar/Toolbar';
import { ZoomControls } from './components/toolbar/ZoomControls';
import { TabBar } from './components/tabs/TabBar';
import { PropertiesPanel } from './components/panels/PropertiesPanel';
import { SimulationPanel } from './components/panels/SimulationPanel';
import { ShortcutsTooltip } from './components/help/ShortcutsTooltip';
import { BottomBar } from './components/mobile/BottomBar';
import { BottomSheet } from './components/mobile/BottomSheet';
import type { SnapPoint } from './components/mobile/BottomSheet';
import { useKeyboardShortcuts } from './hooks/use-keyboard-shortcuts';
import { useAutosave } from './hooks/use-autosave';
import { useUnsavedWarning } from './hooks/use-unsaved-warning';
import { useTheme } from './hooks/use-theme';
import { useViewport } from './hooks/use-viewport';
import { useSimulationStore } from './stores/simulation-store';
import { useAutomatonStore } from './stores/automaton-store';
import { useEditorStore } from './stores/editor-store';
import { useTabStore } from './stores/tab-store';

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
  const trace = useSimulationStore((s) => s.trace);
  const { isPhone, isTablet, isDesktop } = useViewport();
  const [bottomSheetSnap, setBottomSheetSnap] = useState<SnapPoint>('collapsed');

  // Auto-snap BottomSheet to half when simulation trace starts
  useEffect(() => {
    if (trace && isPhone) {
      setBottomSheetSnap('half');
    }
  }, [trace, isPhone]);

  const panel = isSimulating ? <SimulationPanel /> : <PropertiesPanel />;

  return (
    <div className="app">
      <Toolbar />
      {!isPhone && <TabBar />}
      <div className="app-main">
        <AutomataCanvas />
        {!isPhone && <ZoomControls />}
        {(isDesktop || isTablet) && panel}
      </div>
      {isPhone && (
        <BottomSheet snap={bottomSheetSnap} onSnapChange={setBottomSheetSnap}>
          {panel}
        </BottomSheet>
      )}
      {!isDesktop && <BottomBar />}
      <ShortcutsTooltip />
    </div>
  );
}

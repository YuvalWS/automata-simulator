import { useTabStore, getTabName, isTabDirty } from '@/stores/tab-store';
import { useAutomatonStore } from '@/stores/automaton-store';
import { useEditorStore } from '@/stores/editor-store';
import './TabBar.css';

export function TabBar() {
  const tabs = useTabStore((s) => s.tabs);
  const activeTabId = useTabStore((s) => s.activeTabId);
  const switchTab = useTabStore((s) => s.switchTab);
  const createTab = useTabStore((s) => s.createTab);
  const closeTab = useTabStore((s) => s.closeTab);

  // Subscribe to name/dirty changes for the active tab so the tab bar re-renders
  const activeAutomatonName = useAutomatonStore((s) => s.automaton.name);
  const activeIsDirty = useEditorStore((s) => s.isDirty);

  const handleMouseDown = (e: React.MouseEvent, tabId: string) => {
    // Middle-click to close
    if (e.button === 1) {
      e.preventDefault();
      closeTab(tabId);
    }
  };

  return (
    <div className="tab-bar" data-testid="tab-bar">
      <div className="tab-bar-tabs">
        {tabs.map((tab) => {
          const isActive = tab.id === activeTabId;
          const name = isActive ? activeAutomatonName : getTabName(tab.id);
          const dirty = isActive ? activeIsDirty : isTabDirty(tab.id);

          return (
            <div
              key={tab.id}
              className={`tab-item ${isActive ? 'tab-active' : ''}`}
              onClick={() => switchTab(tab.id)}
              onMouseDown={(e) => handleMouseDown(e, tab.id)}
              title={name}
              data-testid={`tab-${tab.id}`}
            >
              <span className="tab-name">
                {dirty && <span className="tab-dirty-dot" />}
                {name}
              </span>
              <button
                className="tab-close-btn"
                onClick={(e) => {
                  e.stopPropagation();
                  closeTab(tab.id);
                }}
                title="Close tab"
              >
                ×
              </button>
            </div>
          );
        })}
      </div>
      <button
        className="tab-new-btn"
        onClick={() => createTab()}
        title="New Tab (Ctrl+T)"
        data-testid="tab-new-btn"
      >
        +
      </button>
    </div>
  );
}

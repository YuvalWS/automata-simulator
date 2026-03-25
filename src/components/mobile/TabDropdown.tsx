import { useState, useEffect, useRef } from 'react';
import { useTabStore, getTabName, isTabDirty } from '@/stores/tab-store';
import { useAutomatonStore } from '@/stores/automaton-store';
import { useEditorStore } from '@/stores/editor-store';
import './TabDropdown.css';

export function TabDropdown() {
  const [open, setOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);
  const tabs = useTabStore((s) => s.tabs);
  const activeTabId = useTabStore((s) => s.activeTabId);
  const switchTab = useTabStore((s) => s.switchTab);
  const createTab = useTabStore((s) => s.createTab);
  const closeTab = useTabStore((s) => s.closeTab);
  const activeAutomatonName = useAutomatonStore((s) => s.automaton.name);
  const activeIsDirty = useEditorStore((s) => s.isDirty);

  useEffect(() => {
    if (!open) return;
    const handleClickOutside = (e: MouseEvent | TouchEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target as Node)) {
        setOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    document.addEventListener('touchstart', handleClickOutside);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
      document.removeEventListener('touchstart', handleClickOutside);
    };
  }, [open]);

  return (
    <div className="tab-dropdown" ref={dropdownRef}>
      <button
        className="tab-dropdown-btn"
        onClick={() => setOpen(!open)}
        data-testid="tab-dropdown-btn"
      >
        {activeIsDirty && <span className="tab-dropdown-dirty">●</span>}
        <span className="tab-dropdown-name">{activeAutomatonName}</span>
        <span className="tab-dropdown-arrow">▾</span>
      </button>
      {open && (
        <div className="tab-dropdown-list" data-testid="tab-dropdown-list">
          {tabs.map((tab) => {
            const isActive = tab.id === activeTabId;
            const name = isActive ? activeAutomatonName : getTabName(tab.id);
            const dirty = isActive ? activeIsDirty : isTabDirty(tab.id);

            return (
              <div
                key={tab.id}
                className={`tab-dropdown-item ${isActive ? 'tab-dropdown-item-active' : ''}`}
              >
                <button
                  className="tab-dropdown-item-btn"
                  onClick={() => {
                    switchTab(tab.id);
                    setOpen(false);
                  }}
                >
                  {dirty && <span className="tab-dropdown-dirty">●</span>}
                  {name}
                </button>
                <button
                  className="tab-dropdown-close"
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
          <div className="tab-dropdown-separator" />
          <button
            className="tab-dropdown-item-btn tab-dropdown-new"
            onClick={() => {
              createTab();
              setOpen(false);
            }}
          >
            + New Tab
          </button>
        </div>
      )}
    </div>
  );
}

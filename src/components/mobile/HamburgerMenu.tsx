import { useState, useEffect, useRef } from 'react';
import { useAutomatonStore } from '@/stores/automaton-store';
import { useViewport } from '@/hooks/use-viewport';
import { useTheme } from '@/hooks/use-theme';
import { useFileOperations } from '@/hooks/use-file-operations';
import './HamburgerMenu.css';

export function HamburgerMenu() {
  const [open, setOpen] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);
  const stateCount = useAutomatonStore((s) => s.automaton.states.length);
  const { isPhone, isMobile, uiMode, setUiMode } = useViewport();
  const { theme, toggleTheme } = useTheme();

  const isUiOverridden = uiMode !== 'auto';
  const toggleUiMode = () => {
    setUiMode(isUiOverridden ? 'auto' : (isMobile ? 'desktop' : 'touch'));
  };
  const uiModeLabel = isUiOverridden
    ? (uiMode === 'touch' ? '\uD83D\uDC46 Touch Mode' : '\uD83D\uDDB1\uFE0F Desktop Mode')
    : `Auto (${isMobile ? '\uD83D\uDC46' : '\uD83D\uDDB1\uFE0F'})`;
  const { handleNew, handleSave, handleLoad, handleExportPng } = useFileOperations();

  useEffect(() => {
    if (!open) return;
    const handleClickOutside = (e: MouseEvent | TouchEvent) => {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) {
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
    <div className="hamburger-menu" ref={menuRef}>
      <button
        className="hamburger-btn"
        onClick={() => setOpen(!open)}
        title="Menu"
        data-testid="hamburger-btn"
      >
        ☰
      </button>
      {open && (
        <div className="hamburger-dropdown" data-testid="hamburger-dropdown">
          <button className="hamburger-item" onClick={() => { handleNew(); setOpen(false); }}>
            New Automaton
          </button>
          {!isPhone && (
            <>
              <button className="hamburger-item" onClick={() => { handleSave(); setOpen(false); }}>
                Save
              </button>
              <button className="hamburger-item" onClick={async () => { await handleLoad(); setOpen(false); }}>
                Load
              </button>
              <button
                className="hamburger-item"
                onClick={async () => { await handleExportPng(); setOpen(false); }}
                disabled={stateCount === 0}
              >
                Export PNG
              </button>
            </>
          )}
          <div className="hamburger-separator" />
          <button className="hamburger-item" onClick={() => { toggleTheme(); setOpen(false); }}>
            {theme === 'light' ? '☾ Dark Mode' : '☀ Light Mode'}
          </button>
          <button className="hamburger-item" onClick={() => { toggleUiMode(); setOpen(false); }}>
            {uiModeLabel}
          </button>
        </div>
      )}
    </div>
  );
}

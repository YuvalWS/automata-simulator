import { useSyncExternalStore } from 'react';

type Viewport = 'phone' | 'tablet' | 'desktop';
export type UiMode = 'auto' | 'touch' | 'desktop';

const PHONE_MAX = 639;
const STORAGE_KEY = 'automata-ui-mode';

const coarseQuery = '(pointer: coarse)';
const phoneQuery = `(max-width: ${PHONE_MAX}px)`;

// Module-level state
let currentUiMode: UiMode = 'auto';
if (typeof window !== 'undefined') {
  const stored = localStorage.getItem(STORAGE_KEY);
  if (stored === 'touch' || stored === 'desktop') currentUiMode = stored;
}

function getViewport(): Viewport {
  if (typeof window === 'undefined') return 'desktop';
  if (currentUiMode === 'desktop') return 'desktop';
  if (currentUiMode === 'touch') {
    // Force touch: use width only to distinguish phone vs tablet
    return window.matchMedia(phoneQuery).matches ? 'phone' : 'tablet';
  }
  // Auto: pointer:coarse = primary input is a finger
  if (!window.matchMedia(coarseQuery).matches) return 'desktop';
  if (window.matchMedia(phoneQuery).matches) return 'phone';
  return 'tablet';
}

let currentViewport = getViewport();
const listeners = new Set<() => void>();

function notifyAll() {
  const next = getViewport();
  const changed = next !== currentViewport;
  currentViewport = next;
  if (typeof document !== 'undefined') {
    document.documentElement.dataset.uiMode = next;
  }
  if (changed) {
    listeners.forEach((l) => l());
  }
}

// Set initial data-ui-mode and listen for media changes
if (typeof window !== 'undefined') {
  document.documentElement.dataset.uiMode = currentViewport;
  window.matchMedia(coarseQuery).addEventListener('change', notifyAll);
  window.matchMedia(phoneQuery).addEventListener('change', notifyAll);
}

function subscribe(listener: () => void): () => void {
  listeners.add(listener);
  return () => listeners.delete(listener);
}

function getSnapshot(): Viewport {
  return currentViewport;
}

function getUiModeSnapshot(): UiMode {
  return currentUiMode;
}

function setUiMode(mode: UiMode) {
  currentUiMode = mode;
  if (mode === 'auto') {
    localStorage.removeItem(STORAGE_KEY);
  } else {
    localStorage.setItem(STORAGE_KEY, mode);
  }
  // Force re-evaluate viewport and notify all subscribers
  const next = getViewport();
  currentViewport = next;
  if (typeof document !== 'undefined') {
    document.documentElement.dataset.uiMode = next;
  }
  listeners.forEach((l) => l());
}

export function useViewport() {
  const viewport = useSyncExternalStore(subscribe, getSnapshot);
  const uiMode = useSyncExternalStore(subscribe, getUiModeSnapshot);
  return {
    viewport,
    isPhone: viewport === 'phone',
    isTablet: viewport === 'tablet',
    isDesktop: viewport === 'desktop',
    isMobile: viewport !== 'desktop',
    uiMode,
    setUiMode,
  };
}

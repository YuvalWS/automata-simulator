import { useSyncExternalStore } from 'react';

type Viewport = 'phone' | 'tablet' | 'desktop';

const PHONE_MAX = 639;
const TABLET_MAX = 1024;

const phoneQuery = `(max-width: ${PHONE_MAX}px)`;
const tabletQuery = `(min-width: ${PHONE_MAX + 1}px) and (max-width: ${TABLET_MAX}px)`;

function getViewport(): Viewport {
  if (typeof window === 'undefined') return 'desktop';
  if (window.matchMedia(phoneQuery).matches) return 'phone';
  if (window.matchMedia(tabletQuery).matches) return 'tablet';
  return 'desktop';
}

// Module-level state: single pair of matchMedia listeners shared by all subscribers
let currentViewport = getViewport();
const listeners = new Set<() => void>();

function notifyAll() {
  const next = getViewport();
  if (next !== currentViewport) {
    currentViewport = next;
    listeners.forEach((l) => l());
  }
}

if (typeof window !== 'undefined') {
  window.matchMedia(phoneQuery).addEventListener('change', notifyAll);
  window.matchMedia(tabletQuery).addEventListener('change', notifyAll);
}

function subscribe(listener: () => void): () => void {
  listeners.add(listener);
  return () => listeners.delete(listener);
}

function getSnapshot(): Viewport {
  return currentViewport;
}

export function useViewport() {
  const viewport = useSyncExternalStore(subscribe, getSnapshot);
  return {
    viewport,
    isPhone: viewport === 'phone',
    isTablet: viewport === 'tablet',
    isDesktop: viewport === 'desktop',
    isMobile: viewport !== 'desktop',
  };
}

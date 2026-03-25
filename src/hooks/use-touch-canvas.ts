import { useRef, useCallback, useEffect } from 'react';

const DRAG_THRESHOLD = 10;
const DOUBLE_TAP_MS = 300;
const LONG_PRESS_MS = 500;

export interface TouchCanvasCallbacks {
  onTap: (clientX: number, clientY: number, target: EventTarget) => void;
  onDoubleTap: (clientX: number, clientY: number, target: EventTarget) => void;
  onLongPress: (clientX: number, clientY: number, target: EventTarget) => void;
  onDragStart: (clientX: number, clientY: number, target: EventTarget) => void;
  onDragMove: (clientX: number, clientY: number) => void;
  onDragEnd: (clientX: number, clientY: number) => void;
  onPinchStart: (centerX: number, centerY: number, distance: number) => void;
  onPinchMove: (centerX: number, centerY: number, distance: number) => void;
  onPinchEnd: () => void;
}

interface TouchState {
  startX: number;
  startY: number;
  startTime: number;
  target: EventTarget;
  isDragging: boolean;
  longPressTimer: ReturnType<typeof setTimeout> | null;
  isPinching: boolean;
  initialPinchDist: number;
}

interface TouchLike {
  clientX: number;
  clientY: number;
}

function getTouchDistance(t1: TouchLike, t2: TouchLike): number {
  const dx = t1.clientX - t2.clientX;
  const dy = t1.clientY - t2.clientY;
  return Math.sqrt(dx * dx + dy * dy);
}

function getTouchCenter(t1: TouchLike, t2: TouchLike): { x: number; y: number } {
  return {
    x: (t1.clientX + t2.clientX) / 2,
    y: (t1.clientY + t2.clientY) / 2,
  };
}

/**
 * Attaches native (non-passive) touch event listeners to the given element,
 * so `preventDefault()` works reliably on iOS Safari 13+.
 */
export function useTouchCanvas(
  callbacks: TouchCanvasCallbacks,
  elementRef: React.RefObject<SVGSVGElement | null>,
) {
  const touchState = useRef<TouchState | null>(null);
  const lastTapTime = useRef(0);
  const lastTapTarget = useRef<EventTarget | null>(null);
  // Store callbacks in a ref so the native listener always sees the latest
  const cbRef = useRef(callbacks);
  cbRef.current = callbacks;

  const clearLongPress = useCallback(() => {
    if (touchState.current?.longPressTimer) {
      clearTimeout(touchState.current.longPressTimer);
      touchState.current.longPressTimer = null;
    }
  }, []);

  useEffect(() => {
    const el = elementRef.current;
    if (!el) return;

    function handleTouchStart(e: TouchEvent) {
      // Blur any focused input/textarea so the virtual keyboard dismisses
      const active = document.activeElement;
      if (active && (active.tagName === 'INPUT' || active.tagName === 'TEXTAREA')) {
        (active as HTMLElement).blur();
      }

      // Non-passive: preventDefault() works on iOS Safari
      e.preventDefault();

      if (e.touches.length === 2) {
        clearLongPress();
        const t0 = e.touches[0]!;
        const t1 = e.touches[1]!;
        const dist = getTouchDistance(t0, t1);
        const center = getTouchCenter(t0, t1);
        if (touchState.current) {
          touchState.current.isPinching = true;
          touchState.current.isDragging = false;
          touchState.current.initialPinchDist = dist;
        }
        cbRef.current.onPinchStart(center.x, center.y, dist);
        return;
      }

      if (e.touches.length !== 1) return;
      const touch = e.touches[0]!;

      const longPressTimer = setTimeout(() => {
        if (touchState.current && !touchState.current.isDragging && !touchState.current.isPinching) {
          cbRef.current.onLongPress(touch.clientX, touch.clientY, touchState.current.target);
          touchState.current = null; // consumed
        }
      }, LONG_PRESS_MS);

      touchState.current = {
        startX: touch.clientX,
        startY: touch.clientY,
        startTime: Date.now(),
        target: touch.target,
        isDragging: false,
        longPressTimer,
        isPinching: false,
        initialPinchDist: 0,
      };
    }

    function handleTouchMove(e: TouchEvent) {
      e.preventDefault();
      const state = touchState.current;
      if (!state) return;

      if (state.isPinching && e.touches.length === 2) {
        const t0 = e.touches[0]!;
        const t1 = e.touches[1]!;
        const dist = getTouchDistance(t0, t1);
        const center = getTouchCenter(t0, t1);
        cbRef.current.onPinchMove(center.x, center.y, dist);
        return;
      }

      if (e.touches.length !== 1) return;
      const touch = e.touches[0]!;

      if (!state.isDragging) {
        const dx = touch.clientX - state.startX;
        const dy = touch.clientY - state.startY;
        if (Math.sqrt(dx * dx + dy * dy) > DRAG_THRESHOLD) {
          state.isDragging = true;
          clearLongPress();
          cbRef.current.onDragStart(state.startX, state.startY, state.target);
        }
      }

      if (state.isDragging) {
        cbRef.current.onDragMove(touch.clientX, touch.clientY);
      }
    }

    function handleTouchEnd(e: TouchEvent) {
      e.preventDefault();
      const state = touchState.current;
      if (!state) return;

      clearLongPress();

      if (state.isPinching) {
        cbRef.current.onPinchEnd();
        touchState.current = null;
        return;
      }

      if (state.isDragging) {
        const touch = e.changedTouches[0]!;
        cbRef.current.onDragEnd(touch.clientX, touch.clientY);
        touchState.current = null;
        return;
      }

      // It was a tap (no drag, no long-press consumed it)
      const now = Date.now();
      const sinceLastTap = now - lastTapTime.current;

      if (sinceLastTap < DOUBLE_TAP_MS && lastTapTarget.current === state.target) {
        // Double-tap
        cbRef.current.onDoubleTap(state.startX, state.startY, state.target);
        lastTapTime.current = 0;
        lastTapTarget.current = null;
      } else {
        // Single tap
        cbRef.current.onTap(state.startX, state.startY, state.target);
        lastTapTime.current = now;
        lastTapTarget.current = state.target;
      }

      touchState.current = null;
    }

    // Register with { passive: false } so preventDefault() is honored on iOS Safari
    el.addEventListener('touchstart', handleTouchStart, { passive: false });
    el.addEventListener('touchmove', handleTouchMove, { passive: false });
    el.addEventListener('touchend', handleTouchEnd, { passive: false });

    return () => {
      el.removeEventListener('touchstart', handleTouchStart);
      el.removeEventListener('touchmove', handleTouchMove);
      el.removeEventListener('touchend', handleTouchEnd);
    };
  }, [elementRef, clearLongPress]);
}

// Re-export constants for testing
export { DRAG_THRESHOLD, DOUBLE_TAP_MS, LONG_PRESS_MS };

import { useState, useRef, useCallback, useEffect, type ReactNode } from 'react';
import './BottomSheet.css';

export type SnapPoint = 'collapsed' | 'half' | 'full';

const SNAP_HEIGHTS: Record<SnapPoint, string> = {
  collapsed: '48px',
  half: '40vh',
  full: '85vh',
};

interface BottomSheetProps {
  children: ReactNode;
  snap?: SnapPoint;
  onSnapChange?: (snap: SnapPoint) => void;
}

export function BottomSheet({ children, snap: controlledSnap, onSnapChange }: BottomSheetProps) {
  const [internalSnap, setInternalSnap] = useState<SnapPoint>('collapsed');
  const snap = controlledSnap ?? internalSnap;
  const setSnap = useCallback(
    (next: SnapPoint) => {
      setInternalSnap(next);
      onSnapChange?.(next);
    },
    [onSnapChange],
  );

  const [keyboardOffset, setKeyboardOffset] = useState(0);
  const dragRef = useRef<{ startY: number; startHeight: number; velocityY: number; lastY: number; lastTime: number } | null>(null);
  const sheetRef = useRef<HTMLDivElement>(null);

  // iOS Safari: visualViewport shrinks when virtual keyboard opens.
  useEffect(() => {
    const vv = window.visualViewport;
    if (!vv) return;
    const onResize = () => {
      const offset = window.innerHeight - vv.height - vv.offsetTop;
      setKeyboardOffset(Math.max(0, offset));
    };
    vv.addEventListener('resize', onResize);
    vv.addEventListener('scroll', onResize);
    return () => {
      vv.removeEventListener('resize', onResize);
      vv.removeEventListener('scroll', onResize);
    };
  }, []);

  const handleTouchStart = useCallback((e: React.TouchEvent) => {
    const touch = e.touches[0];
    const sheet = sheetRef.current;
    if (!touch || !sheet) return;
    const now = Date.now();
    dragRef.current = {
      startY: touch.clientY,
      startHeight: sheet.getBoundingClientRect().height,
      velocityY: 0,
      lastY: touch.clientY,
      lastTime: now,
    };
    // Remove transition during drag for immediate feedback
    sheet.style.transition = 'none';
  }, []);

  const handleTouchMove = useCallback((e: React.TouchEvent) => {
    if (!dragRef.current || !sheetRef.current) return;
    const touch = e.touches[0];
    if (!touch) return;

    const now = Date.now();
    const dt = now - dragRef.current.lastTime;
    if (dt > 0) {
      dragRef.current.velocityY = (touch.clientY - dragRef.current.lastY) / dt;
    }
    dragRef.current.lastY = touch.clientY;
    dragRef.current.lastTime = now;

    const delta = dragRef.current.startY - touch.clientY;
    const newHeight = Math.max(48, Math.min(window.innerHeight * 0.85, dragRef.current.startHeight + delta));
    sheetRef.current.style.height = `${newHeight}px`;
  }, []);

  const handleTouchEnd = useCallback(() => {
    if (!sheetRef.current || !dragRef.current) return;
    const height = sheetRef.current.getBoundingClientRect().height;
    const vh = window.innerHeight;
    const velocity = dragRef.current.velocityY; // px/ms, negative = swipe down

    // Restore transition for smooth snap animation
    sheetRef.current.style.transition = '';
    sheetRef.current.style.height = '';

    // Fast swipe detection — override positional snap
    if (velocity > 0.5) {
      // Fast swipe DOWN → collapse
      setSnap('collapsed');
    } else if (velocity < -0.5) {
      // Fast swipe UP → expand
      setSnap(height < vh * 0.3 ? 'half' : 'full');
    } else {
      // Positional snap with better thresholds
      if (height < vh * 0.2) {
        setSnap('collapsed');
      } else if (height < vh * 0.55) {
        setSnap('half');
      } else {
        setSnap('full');
      }
    }
    dragRef.current = null;
  }, [setSnap]);

  const handleHandleClick = useCallback(() => {
    setSnap(snap === 'collapsed' ? 'half' : 'collapsed');
  }, [snap, setSnap]);

  return (
    <div
      ref={sheetRef}
      className={`bottom-sheet bottom-sheet-${snap}`}
      style={{ height: SNAP_HEIGHTS[snap], bottom: `${56 + keyboardOffset}px` }}
      data-testid="bottom-sheet"
    >
      <div
        className="bottom-sheet-handle"
        onTouchStart={handleTouchStart}
        onTouchMove={handleTouchMove}
        onTouchEnd={handleTouchEnd}
        onClick={handleHandleClick}
      >
        <div className="bottom-sheet-handle-bar" />
      </div>
      <div className="bottom-sheet-content">
        {children}
      </div>
    </div>
  );
}

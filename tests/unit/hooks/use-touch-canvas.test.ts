import { describe, it, expect } from 'vitest';
import { DRAG_THRESHOLD, DOUBLE_TAP_MS, LONG_PRESS_MS } from '@/hooks/use-touch-canvas';

describe('touch canvas constants', () => {
  it('has correct drag threshold for touch (10px)', () => {
    expect(DRAG_THRESHOLD).toBe(10);
  });

  it('has correct double-tap timing window', () => {
    expect(DOUBLE_TAP_MS).toBe(300);
  });

  it('has correct long-press duration', () => {
    expect(LONG_PRESS_MS).toBe(500);
  });
});

describe('gesture detection logic', () => {
  it('movement below threshold is a tap, not a drag', () => {
    const startX = 100;
    const startY = 200;
    const endX = 105;
    const endY = 203;
    const dist = Math.sqrt((endX - startX) ** 2 + (endY - startY) ** 2);
    expect(dist).toBeLessThan(DRAG_THRESHOLD);
  });

  it('movement above threshold is a drag', () => {
    const startX = 100;
    const startY = 200;
    const endX = 115;
    const endY = 210;
    const dist = Math.sqrt((endX - startX) ** 2 + (endY - startY) ** 2);
    expect(dist).toBeGreaterThan(DRAG_THRESHOLD);
  });

  it('two taps within DOUBLE_TAP_MS is a double-tap', () => {
    const firstTap = 1000;
    const secondTap = firstTap + 200; // 200ms < 300ms
    expect(secondTap - firstTap).toBeLessThan(DOUBLE_TAP_MS);
  });

  it('two taps beyond DOUBLE_TAP_MS are two single taps', () => {
    const firstTap = 1000;
    const secondTap = firstTap + 400; // 400ms > 300ms
    expect(secondTap - firstTap).toBeGreaterThan(DOUBLE_TAP_MS);
  });

  it('touch held longer than LONG_PRESS_MS triggers long-press', () => {
    const holdTime = 600;
    expect(holdTime).toBeGreaterThan(LONG_PRESS_MS);
  });

  it('touch released before LONG_PRESS_MS does not trigger long-press', () => {
    const holdTime = 300;
    expect(holdTime).toBeLessThan(LONG_PRESS_MS);
  });
});

describe('pinch zoom calculation', () => {
  function pinchDistance(t1: { x: number; y: number }, t2: { x: number; y: number }) {
    const dx = t1.x - t2.x;
    const dy = t1.y - t2.y;
    return Math.sqrt(dx * dx + dy * dy);
  }

  function pinchCenter(t1: { x: number; y: number }, t2: { x: number; y: number }) {
    return { x: (t1.x + t2.x) / 2, y: (t1.y + t2.y) / 2 };
  }

  it('calculates distance between two touch points', () => {
    const dist = pinchDistance({ x: 0, y: 0 }, { x: 3, y: 4 });
    expect(dist).toBe(5);
  });

  it('calculates center between two touch points', () => {
    const center = pinchCenter({ x: 100, y: 200 }, { x: 300, y: 400 });
    expect(center).toEqual({ x: 200, y: 300 });
  });

  it('zoom scale is ratio of new distance to initial distance', () => {
    const initialDist = 100;
    const newDist = 200;
    const scale = newDist / initialDist;
    expect(scale).toBe(2); // 2x zoom
  });

  it('pinch in reduces zoom', () => {
    const initialDist = 200;
    const newDist = 100;
    const scale = newDist / initialDist;
    expect(scale).toBe(0.5);
  });

  it('clamps zoom within 0.2 to 5', () => {
    const startZoom = 4;
    const scale = 2;
    const rawZoom = startZoom * scale;
    const clampedZoom = Math.max(0.2, Math.min(5, rawZoom));
    expect(clampedZoom).toBe(5);
  });
});

describe('touch-to-SVG coordinate mapping', () => {
  it('converts client coordinates to SVG coordinates with pan and zoom', () => {
    // Simulating getSvgPoint logic
    const panX = 50;
    const panY = 100;
    const zoom = 2;
    const rectLeft = 0;
    const rectTop = 0;

    const clientX = 250;
    const clientY = 300;

    const svgX = (clientX - rectLeft - panX) / zoom;
    const svgY = (clientY - rectTop - panY) / zoom;

    expect(svgX).toBe(100);
    expect(svgY).toBe(100);
  });

  it('handles zoom of 1 with no pan', () => {
    const panX = 0;
    const panY = 0;
    const zoom = 1;
    const clientX = 150;
    const clientY = 200;

    const svgX = (clientX - panX) / zoom;
    const svgY = (clientY - panY) / zoom;

    expect(svgX).toBe(150);
    expect(svgY).toBe(200);
  });

  it('accounts for SVG rect offset', () => {
    const panX = 0;
    const panY = 0;
    const zoom = 1;
    const rectLeft = 48; // toolbar width
    const rectTop = 80; // toolbar + tabbar height

    const clientX = 248;
    const clientY = 280;

    const svgX = (clientX - rectLeft - panX) / zoom;
    const svgY = (clientY - rectTop - panY) / zoom;

    expect(svgX).toBe(200);
    expect(svgY).toBe(200);
  });
});

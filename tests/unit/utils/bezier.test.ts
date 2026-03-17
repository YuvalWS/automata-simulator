import { describe, it, expect } from 'vitest';
import {
  quadraticBezierPoint,
  quadraticBezierTangent,
  cubicBezierPoint,
  selfLoopControlPoints,
} from '@/utils/bezier';

describe('bezier utilities', () => {
  describe('quadraticBezierPoint', () => {
    const p0 = { x: 0, y: 0 };
    const p1 = { x: 50, y: -50 };
    const p2 = { x: 100, y: 0 };

    it('returns start point at t=0', () => {
      const p = quadraticBezierPoint(p0, p1, p2, 0);
      expect(p.x).toBeCloseTo(0);
      expect(p.y).toBeCloseTo(0);
    });

    it('returns end point at t=1', () => {
      const p = quadraticBezierPoint(p0, p1, p2, 1);
      expect(p.x).toBeCloseTo(100);
      expect(p.y).toBeCloseTo(0);
    });

    it('returns midpoint-ish at t=0.5', () => {
      const p = quadraticBezierPoint(p0, p1, p2, 0.5);
      expect(p.x).toBeCloseTo(50);
      expect(p.y).toBeCloseTo(-25);
    });
  });

  describe('quadraticBezierTangent', () => {
    it('returns tangent direction at t=0', () => {
      const t = quadraticBezierTangent(
        { x: 0, y: 0 }, { x: 50, y: -50 }, { x: 100, y: 0 }, 0,
      );
      expect(t.x).toBeGreaterThan(0);
      expect(t.y).toBeLessThan(0);
    });
  });

  describe('cubicBezierPoint', () => {
    const p0 = { x: 0, y: 0 };
    const p1 = { x: 33, y: -50 };
    const p2 = { x: 66, y: -50 };
    const p3 = { x: 100, y: 0 };

    it('returns start point at t=0', () => {
      const p = cubicBezierPoint(p0, p1, p2, p3, 0);
      expect(p.x).toBeCloseTo(0);
      expect(p.y).toBeCloseTo(0);
    });

    it('returns end point at t=1', () => {
      const p = cubicBezierPoint(p0, p1, p2, p3, 1);
      expect(p.x).toBeCloseTo(100);
      expect(p.y).toBeCloseTo(0);
    });
  });

  describe('selfLoopControlPoints', () => {
    it('returns control points above the state', () => {
      const center = { x: 100, y: 100 };
      const radius = 28;
      const { cp1, cp2, start, end } = selfLoopControlPoints(center, radius);

      expect(cp1.y).toBeLessThan(center.y - radius);
      expect(cp2.y).toBeLessThan(center.y - radius);
      expect(start.y).toBeLessThan(center.y);
      expect(end.y).toBeLessThan(center.y);
    });

    it('start and end are on the circle', () => {
      const center = { x: 100, y: 100 };
      const radius = 28;
      const { start, end } = selfLoopControlPoints(center, radius);

      const distStart = Math.sqrt((start.x - center.x) ** 2 + (start.y - center.y) ** 2);
      const distEnd = Math.sqrt((end.x - center.x) ** 2 + (end.y - center.y) ** 2);
      expect(distStart).toBeCloseTo(radius);
      expect(distEnd).toBeCloseTo(radius);
    });
  });
});

/**
 * Tests for math.ts
 *
 * Covers vector/point math used for canvas geometry: state positioning,
 * edge routing, and hit-testing (click detection on edges and states).
 */
import { describe, it, expect } from 'vitest';
import {
  distance, midpoint, add, subtract, scale,
  normalize, perpendicular, angle, pointOnCircle, clamp,
  circleIntersection, pointToSegmentDist,
} from '@/utils/math';

describe('math utilities', () => {
  describe('distance', () => {
    it('returns 0 for same point', () => {
      expect(distance({ x: 5, y: 5 }, { x: 5, y: 5 })).toBe(0);
    });

    it('calculates horizontal distance', () => {
      expect(distance({ x: 0, y: 0 }, { x: 3, y: 0 })).toBe(3);
    });

    it('calculates diagonal distance', () => {
      expect(distance({ x: 0, y: 0 }, { x: 3, y: 4 })).toBe(5);
    });
  });

  describe('midpoint', () => {
    it('finds midpoint of two points', () => {
      expect(midpoint({ x: 0, y: 0 }, { x: 10, y: 10 })).toEqual({ x: 5, y: 5 });
    });

    it('handles negative coordinates', () => {
      expect(midpoint({ x: -4, y: -2 }, { x: 4, y: 2 })).toEqual({ x: 0, y: 0 });
    });
  });

  describe('add', () => {
    it('adds two points', () => {
      expect(add({ x: 1, y: 2 }, { x: 3, y: 4 })).toEqual({ x: 4, y: 6 });
    });
  });

  describe('subtract', () => {
    it('subtracts two points', () => {
      expect(subtract({ x: 5, y: 7 }, { x: 2, y: 3 })).toEqual({ x: 3, y: 4 });
    });
  });

  describe('scale', () => {
    it('scales a point', () => {
      expect(scale({ x: 3, y: 4 }, 2)).toEqual({ x: 6, y: 8 });
    });

    it('scales by zero', () => {
      expect(scale({ x: 3, y: 4 }, 0)).toEqual({ x: 0, y: 0 });
    });
  });

  describe('normalize', () => {
    it('normalizes a vector to unit length', () => {
      const n = normalize({ x: 3, y: 4 });
      const len = Math.sqrt(n.x * n.x + n.y * n.y);
      expect(len).toBeCloseTo(1);
    });

    it('handles zero vector', () => {
      expect(normalize({ x: 0, y: 0 })).toEqual({ x: 0, y: 0 });
    });
  });

  describe('perpendicular', () => {
    it('returns perpendicular vector', () => {
      const p = perpendicular({ x: 1, y: 0 });
      expect(p.x).toBeCloseTo(0);
      expect(p.y).toBeCloseTo(1);
    });

    it('is perpendicular (dot product is 0)', () => {
      const v = { x: 3, y: 7 };
      const p = perpendicular(v);
      expect(v.x * p.x + v.y * p.y).toBe(0);
    });
  });

  describe('angle', () => {
    it('returns 0 for point to the right', () => {
      expect(angle({ x: 0, y: 0 }, { x: 1, y: 0 })).toBe(0);
    });

    it('returns PI/2 for point below', () => {
      expect(angle({ x: 0, y: 0 }, { x: 0, y: 1 })).toBeCloseTo(Math.PI / 2);
    });
  });

  describe('pointOnCircle', () => {
    it('returns point at angle 0 on circle', () => {
      const p = pointOnCircle({ x: 10, y: 10 }, 5, 0);
      expect(p.x).toBeCloseTo(15);
      expect(p.y).toBeCloseTo(10);
    });
  });

  describe('clamp', () => {
    it('clamps below minimum', () => {
      expect(clamp(-5, 0, 10)).toBe(0);
    });

    it('clamps above maximum', () => {
      expect(clamp(15, 0, 10)).toBe(10);
    });

    it('returns value when in range', () => {
      expect(clamp(5, 0, 10)).toBe(5);
    });
  });

  // circleIntersection: finds the point on a circle's boundary closest to a
  // given "from" point. Used to compute where transition edges meet state circles.
  describe('circleIntersection', () => {
    it('returns point on circle boundary from horizontal approach', () => {
      // Approaching center (100,0) from the right (200,0), radius 30
      const p = circleIntersection({ x: 200, y: 0 }, { x: 100, y: 0 }, { x: 100, y: 0 }, 30);
      expect(p.x).toBeCloseTo(130);
      expect(p.y).toBeCloseTo(0);
    });

    it('returns point on circle boundary from vertical approach', () => {
      // Approaching center (100,100) from above (100,0), radius 50
      const p = circleIntersection({ x: 100, y: 0 }, { x: 100, y: 100 }, { x: 100, y: 100 }, 50);
      expect(p.x).toBeCloseTo(100);
      expect(p.y).toBeCloseTo(50);
    });

    it('handles coincident from and center without crashing', () => {
      // When from === center, angle is 0, so result should still be on the circle
      const p = circleIntersection({ x: 5, y: 5 }, { x: 5, y: 5 }, { x: 5, y: 5 }, 10);
      const d = distance(p, { x: 5, y: 5 });
      expect(d).toBeCloseTo(10);
    });
  });

  // pointToSegmentDist: shortest distance from a point to a line segment.
  // Used for hit-testing clicks on transition edges.
  describe('pointToSegmentDist', () => {
    it('returns 0 when point lies on the segment', () => {
      expect(pointToSegmentDist({ x: 5, y: 0 }, { x: 0, y: 0 }, { x: 10, y: 0 })).toBeCloseTo(0);
    });

    it('returns perpendicular distance for mid-segment projection', () => {
      // Point (5,3) is 3 units above the segment (0,0)-(10,0)
      expect(pointToSegmentDist({ x: 5, y: 3 }, { x: 0, y: 0 }, { x: 10, y: 0 })).toBeCloseTo(3);
    });

    it('returns distance to nearest endpoint when projection falls outside', () => {
      // Point (-5,0) projects before the start of segment (0,0)-(10,0)
      expect(pointToSegmentDist({ x: -5, y: 0 }, { x: 0, y: 0 }, { x: 10, y: 0 })).toBeCloseTo(5);
    });

    it('handles zero-length segment (point-to-point distance)', () => {
      // Degenerate segment where both endpoints are the same
      expect(pointToSegmentDist({ x: 3, y: 4 }, { x: 0, y: 0 }, { x: 0, y: 0 })).toBeCloseTo(5);
    });
  });
});

import type { Point } from '@/models/geometry';

export function quadraticBezierPoint(p0: Point, p1: Point, p2: Point, t: number): Point {
  const mt = 1 - t;
  return {
    x: mt * mt * p0.x + 2 * mt * t * p1.x + t * t * p2.x,
    y: mt * mt * p0.y + 2 * mt * t * p1.y + t * t * p2.y,
  };
}

export function quadraticBezierTangent(p0: Point, p1: Point, p2: Point, t: number): Point {
  const mt = 1 - t;
  return {
    x: 2 * mt * (p1.x - p0.x) + 2 * t * (p2.x - p1.x),
    y: 2 * mt * (p1.y - p0.y) + 2 * t * (p2.y - p1.y),
  };
}

export function cubicBezierPoint(p0: Point, p1: Point, p2: Point, p3: Point, t: number): Point {
  const mt = 1 - t;
  const mt2 = mt * mt;
  const t2 = t * t;
  return {
    x: mt2 * mt * p0.x + 3 * mt2 * t * p1.x + 3 * mt * t2 * p2.x + t2 * t * p3.x,
    y: mt2 * mt * p0.y + 3 * mt2 * t * p1.y + 3 * mt * t2 * p2.y + t2 * t * p3.y,
  };
}

export function cubicBezierTangent(p0: Point, p1: Point, p2: Point, p3: Point, t: number): Point {
  const mt = 1 - t;
  return {
    x: 3 * mt * mt * (p1.x - p0.x) + 6 * mt * t * (p2.x - p1.x) + 3 * t * t * (p3.x - p2.x),
    y: 3 * mt * mt * (p1.y - p0.y) + 6 * mt * t * (p2.y - p1.y) + 3 * t * t * (p3.y - p2.y),
  };
}

export function selfLoopControlPoints(
  center: Point,
  radius: number,
  loopRadius = 40,
): { cp1: Point; cp2: Point; start: Point; end: Point } {
  const startAngle = -Math.PI / 3;
  const endAngle = -2 * Math.PI / 3;

  const start = {
    x: center.x + radius * Math.cos(startAngle),
    y: center.y + radius * Math.sin(startAngle),
  };
  const end = {
    x: center.x + radius * Math.cos(endAngle),
    y: center.y + radius * Math.sin(endAngle),
  };

  const cp1 = {
    x: center.x + loopRadius * 1.5,
    y: center.y - radius - loopRadius * 1.8,
  };
  const cp2 = {
    x: center.x - loopRadius * 1.5,
    y: center.y - radius - loopRadius * 1.8,
  };

  return { cp1, cp2, start, end };
}

import type { Point } from '@/models/geometry';

interface GhostEdgeProps {
  start: Point;
  end: Point;
}

export function GhostEdge({ start, end }: GhostEdgeProps) {
  return (
    <line
      x1={start.x}
      y1={start.y}
      x2={end.x}
      y2={end.y}
      stroke="var(--color-primary)"
      strokeWidth={2}
      strokeDasharray="6 4"
      opacity={0.6}
      markerEnd="url(#arrowhead-ghost)"
      pointerEvents="none"
    />
  );
}

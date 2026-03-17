import type { EdgePath } from '@/services/layout/edge-routing';
import type { Transition } from '@/models/automaton';

interface TransitionEdgeProps {
  edgePath: EdgePath;
  transition: Transition;
  isSelected: boolean;
  isSimActive?: boolean;
  onClick: (e: React.MouseEvent, transitionId: string) => void;
  onDoubleClick: (e: React.MouseEvent, transitionId: string) => void;
}

export function TransitionEdge({ edgePath, transition, isSelected, isSimActive, onClick, onDoubleClick }: TransitionEdgeProps) {
  let strokeColor = 'var(--color-transition-stroke)';
  let strokeWidth = 2;

  if (isSimActive) {
    strokeColor = 'var(--color-accent)';
    strokeWidth = 3;
  } else if (isSelected) {
    strokeColor = 'var(--color-transition-selected)';
    strokeWidth = 2.5;
  }

  const label = transition.symbols.join(', ');
  const className = `transition-edge${isSimActive ? ' transition-edge--sim-active' : ''}`;

  return (
    <g
      className={className}
      data-testid={`transition-${transition.id}`}
      onClick={(e) => onClick(e, transition.id)}
      onDoubleClick={(e) => onDoubleClick(e, transition.id)}
      style={{ cursor: 'pointer' }}
    >
      {/* Invisible wider path for easier click targeting */}
      <path
        d={edgePath.path}
        fill="none"
        stroke="transparent"
        strokeWidth={12}
      />
      {/* Visible path */}
      <path
        d={edgePath.path}
        fill="none"
        stroke={strokeColor}
        strokeWidth={strokeWidth}
        markerEnd="url(#arrowhead)"
      />
      {/* Label background */}
      <rect
        x={edgePath.labelPosition.x - edgePath.labelWidth / 2}
        y={edgePath.labelPosition.y - 9}
        width={edgePath.labelWidth}
        height={18}
        fill="var(--color-canvas-bg)"
        rx={3}
      />
      {/* Label text */}
      <text
        x={edgePath.labelPosition.x}
        y={edgePath.labelPosition.y}
        textAnchor="middle"
        dominantBaseline="central"
        fontSize="13"
        fontFamily="var(--font-mono)"
        fontWeight="500"
        fill="var(--color-text)"
        pointerEvents="none"
      >
        {label}
      </text>
    </g>
  );
}

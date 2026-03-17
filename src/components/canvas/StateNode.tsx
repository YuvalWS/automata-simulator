import type { AutomatonState } from '@/models/automaton';

const RADIUS = 28;
const INNER_RADIUS = 22;
const HANDLE_DISTANCE = RADIUS + 12;
const HANDLE_RADIUS = 7;

interface StateNodeProps {
  state: AutomatonState;
  isSelected: boolean;
  isPendingSource?: boolean;
  onMouseDown: (e: React.MouseEvent, stateId: string) => void;
  onMouseUp: (e: React.MouseEvent, stateId: string) => void;
  onDoubleClick: (e: React.MouseEvent, stateId: string) => void;
  onHandleDragStart: (e: React.MouseEvent, stateId: string) => void;
}

export function StateNode({
  state,
  isSelected,
  isPendingSource,
  onMouseDown,
  onMouseUp,
  onDoubleClick,
  onHandleDragStart,
}: StateNodeProps) {
  const { x, y } = state.position;
  const strokeColor = isPendingSource
    ? 'var(--color-primary)'
    : isSelected
      ? 'var(--color-state-selected)'
      : 'var(--color-state-stroke)';
  const strokeWidth = isSelected || isPendingSource ? 2.5 : 2;

  return (
    <g
      className="state-node"
      onMouseDown={(e) => onMouseDown(e, state.id)}
      onMouseUp={(e) => onMouseUp(e, state.id)}
      onDoubleClick={(e) => onDoubleClick(e, state.id)}
      style={{ cursor: 'pointer' }}
      data-testid={`state-${state.id}`}
    >
      {/* Main circle */}
      <circle
        cx={x}
        cy={y}
        r={RADIUS}
        fill="var(--color-state-fill)"
        stroke={strokeColor}
        strokeWidth={strokeWidth}
      />
      {/* Inner circle for accepting states */}
      {state.isAccepting && (
        <circle
          cx={x}
          cy={y}
          r={INNER_RADIUS}
          fill="none"
          stroke={strokeColor}
          strokeWidth={strokeWidth}
        />
      )}
      {/* Pending source pulse ring */}
      {isPendingSource && (
        <circle
          cx={x}
          cy={y}
          r={RADIUS + 4}
          fill="none"
          stroke="var(--color-primary)"
          strokeWidth={1.5}
          strokeDasharray="4 3"
          opacity={0.6}
        />
      )}
      {/* Label */}
      <text
        x={x}
        y={y}
        textAnchor="middle"
        dominantBaseline="central"
        fontSize="14"
        fontFamily="var(--font-mono)"
        fill="var(--color-text)"
        pointerEvents="none"
      >
        {state.name}
      </text>
      {/* Drag handle for creating transitions — visible on hover */}
      <circle
        className="state-transition-handle"
        cx={x + HANDLE_DISTANCE}
        cy={y}
        r={HANDLE_RADIUS}
        fill="var(--color-primary)"
        stroke="white"
        strokeWidth={1.5}
        opacity={0}
        onMouseDown={(e) => {
          e.stopPropagation();
          onHandleDragStart(e, state.id);
        }}
        style={{ cursor: 'crosshair' }}
      />
      {/* Small arrow icon inside handle */}
      <text
        className="state-transition-handle"
        x={x + HANDLE_DISTANCE}
        y={y}
        textAnchor="middle"
        dominantBaseline="central"
        fontSize="10"
        fill="white"
        pointerEvents="none"
        opacity={0}
      >
        {'\u2192'}
      </text>
    </g>
  );
}

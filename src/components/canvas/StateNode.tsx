import type { AutomatonState } from '@/models/automaton';

const RADIUS = 28;
const INNER_RADIUS = 22;
const HANDLE_DISTANCE = RADIUS + 12;
const HANDLE_RADIUS = 7;

export type SimulationStatus = 'active' | 'accepted' | 'rejected' | null;

interface StateNodeProps {
  state: AutomatonState;
  isSelected: boolean;
  isPendingSource?: boolean;
  simulationStatus?: SimulationStatus;
  handleAngle?: number;
  onMouseDown: (e: React.MouseEvent, stateId: string) => void;
  onMouseUp: (e: React.MouseEvent, stateId: string) => void;
  onDoubleClick: (e: React.MouseEvent, stateId: string) => void;
  onHandleDragStart: (e: React.MouseEvent, stateId: string) => void;
}

export function StateNode({
  state,
  isSelected,
  isPendingSource,
  simulationStatus,
  handleAngle,
  onMouseDown,
  onMouseUp,
  onDoubleClick,
  onHandleDragStart,
}: StateNodeProps) {
  const { x, y } = state.position;

  let fillColor = 'var(--color-state-fill)';
  let strokeColor = 'var(--color-state-stroke)';
  let strokeWidth = 2;

  if (simulationStatus === 'active') {
    fillColor = 'var(--color-sim-active-fill)';
    strokeColor = 'var(--color-accent)';
    strokeWidth = 3;
  } else if (simulationStatus === 'accepted') {
    fillColor = 'var(--color-sim-accepted-fill)';
    strokeColor = 'var(--color-sim-accepted-stroke)';
    strokeWidth = 3;
  } else if (simulationStatus === 'rejected') {
    fillColor = 'var(--color-sim-rejected-fill)';
    strokeColor = 'var(--color-danger)';
    strokeWidth = 3;
  } else if (isPendingSource) {
    strokeColor = 'var(--color-primary)';
    strokeWidth = 2.5;
  } else if (isSelected) {
    strokeColor = 'var(--color-state-selected)';
    strokeWidth = 2.5;
  }

  const simClass = simulationStatus ? `state-node--sim-${simulationStatus}` : '';

  return (
    <g
      className={`state-node ${simClass}`}
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
        fill={fillColor}
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
      {isPendingSource && !simulationStatus && (
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
      {/* Drag handle for creating transitions — follows mouse angle around state, hidden during simulation */}
      {!simulationStatus && (() => {
        const angle = handleAngle ?? 0;
        const hx = x + HANDLE_DISTANCE * Math.cos(angle);
        const hy = y + HANDLE_DISTANCE * Math.sin(angle);
        return (
          <>
            <circle
              className="state-transition-handle"
              cx={hx}
              cy={hy}
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
            <text
              className="state-transition-handle"
              x={hx}
              y={hy}
              textAnchor="middle"
              dominantBaseline="central"
              fontSize="10"
              fill="white"
              pointerEvents="none"
              opacity={0}
            >
              {'\u2192'}
            </text>
          </>
        );
      })()}
    </g>
  );
}

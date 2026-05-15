import type { AutomatonState } from '@/models/automaton';

const RADIUS = 28;
const INNER_RADIUS = 22;
// "New transition" handle — arrow stretches from the state edge to the cursor while
// the cursor is in range. ≈ 2 cm of reach beyond the state edge at typical DPI.
const HANDLE_MIN_REACH = RADIUS + 8;   // cursor must be just outside the state edge
const HANDLE_MAX_REACH = RADIUS + 80;  // hide once the cursor is farther than ~2 cm past the edge
const HANDLE_CIRCLE_RADIUS = 10;

export type SimulationStatus = 'active' | 'accepted' | 'rejected' | null;

interface StateNodeProps {
  state: AutomatonState;
  isSelected: boolean;
  isPendingSource?: boolean;
  simulationStatus?: SimulationStatus;
  editingLocked?: boolean;
  /** Cursor position in SVG coords when the cursor is near this state. Drives the
   *  stretchy "new transition" arrow + `+` circle. Undefined hides the handle. */
  handleCursor?: { x: number; y: number };
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
  editingLocked,
  handleCursor,
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

  // Compute the stretchy handle geometry from the cursor position.
  let handleGeom: {
    shaftStartX: number;
    shaftStartY: number;
    shaftEndX: number;
    shaftEndY: number;
    tipX: number;
    tipY: number;
  } | null = null;
  if (handleCursor && !simulationStatus && !editingLocked) {
    const dx = handleCursor.x - x;
    const dy = handleCursor.y - y;
    const dist = Math.sqrt(dx * dx + dy * dy);
    if (dist >= HANDLE_MIN_REACH && dist <= HANDLE_MAX_REACH) {
      const nx = dx / dist;
      const ny = dy / dist;
      // Shaft ends just before the `+` circle so the arrowhead sits between
      // the shaft and the circle, forming a single coherent arrow.
      const shaftEndDist = dist - HANDLE_CIRCLE_RADIUS - 1;
      handleGeom = {
        shaftStartX: x + RADIUS * nx,
        shaftStartY: y + RADIUS * ny,
        shaftEndX: x + shaftEndDist * nx,
        shaftEndY: y + shaftEndDist * ny,
        tipX: handleCursor.x,
        tipY: handleCursor.y,
      };
    }
  }

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
      {/* Stretchy "new transition" handle — arrow from state edge to the cursor,
          terminating in a `+` circle. Only visible while the cursor is within range. */}
      {handleGeom && (
        <g
          className="state-transition-handle"
          onMouseDown={(e) => {
            e.stopPropagation();
            onHandleDragStart(e, state.id);
          }}
          style={{ cursor: 'crosshair' }}
        >
          {/* Transparent thick hit-area line along the shaft */}
          <line
            x1={handleGeom.shaftStartX}
            y1={handleGeom.shaftStartY}
            x2={handleGeom.tipX}
            y2={handleGeom.tipY}
            stroke="transparent"
            strokeWidth={16}
          />
          {/* Visible shaft with an arrowhead pointing at the `+` circle */}
          <line
            x1={handleGeom.shaftStartX}
            y1={handleGeom.shaftStartY}
            x2={handleGeom.shaftEndX}
            y2={handleGeom.shaftEndY}
            stroke="var(--color-primary)"
            strokeWidth={2.5}
            strokeLinecap="round"
            markerEnd="url(#arrowhead-ghost)"
            pointerEvents="none"
          />
          {/* `+` circle anchored at the cursor */}
          <circle
            cx={handleGeom.tipX}
            cy={handleGeom.tipY}
            r={HANDLE_CIRCLE_RADIUS}
            fill="var(--color-primary)"
            stroke="white"
            strokeWidth={1.5}
          />
          <text
            x={handleGeom.tipX}
            y={handleGeom.tipY + 0.5}
            textAnchor="middle"
            dominantBaseline="central"
            fontSize={15}
            fontWeight={700}
            fill="white"
            pointerEvents="none"
          >
            +
          </text>
        </g>
      )}
    </g>
  );
}

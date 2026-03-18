import { useRef, useCallback, useState } from 'react';
import { useAutomatonStore } from '@/stores/automaton-store';
import type { Automaton } from '@/models/automaton';
import { useEditorStore } from '@/stores/editor-store';
import { useSimulationStore } from '@/stores/simulation-store';
import { computeEdgePaths } from '@/services/layout/edge-routing';
import { StateNode } from './StateNode';
import type { SimulationStatus } from './StateNode';
import { TransitionEdge } from './TransitionEdge';
import { InitialArrow } from './InitialArrow';
import { GhostEdge } from './GhostEdge';
import { GridBackground } from './GridBackground';
import { TransitionSymbolModal } from './TransitionSymbolModal';
import { useHistoryStore } from '@/stores/history-store';
import { snapToAlignment, computeSnapGuides } from '@/utils/snap';
import { pointToSegmentDist } from '@/utils/math';
import type { SnapGuide } from '@/utils/snap';
import './AutomataCanvas.css';

const PENDING_TIMEOUT_MS = 3000;
const DRAG_THRESHOLD = 5;

interface SymbolModalState {
  sourceId: string;
  targetId: string;
  position: { x: number; y: number };
  existingSymbols?: string[];
  editingTransitionId?: string;
}

interface GroupDragState {
  primaryId: string;
  offset: { x: number; y: number };
  offsets: Map<string, { x: number; y: number }>;
  preDragAutomaton: Automaton;
}

export function AutomataCanvas() {
  const svgRef = useRef<SVGSVGElement>(null);
  const automaton = useAutomatonStore((s) => s.automaton);
  const addState = useAutomatonStore((s) => s.addState);
  const moveState = useAutomatonStore((s) => s.moveState);
  const addTransition = useAutomatonStore((s) => s.addTransition);
  const updateTransition = useAutomatonStore((s) => s.updateTransition);
  const setViewport = useAutomatonStore((s) => s.setViewport);

  const selection = useEditorStore((s) => s.selection);
  const setSelection = useEditorStore((s) => s.setSelection);
  const clearSelection = useEditorStore((s) => s.clearSelection);
  const toggleInSelection = useEditorStore((s) => s.toggleInSelection);
  const selectionBox = useEditorStore((s) => s.selectionBox);
  const setSelectionBox = useEditorStore((s) => s.setSelectionBox);
  const drawingTransition = useEditorStore((s) => s.drawingTransition);
  const startDrawingTransition = useEditorStore((s) => s.startDrawingTransition);
  const updateDrawingTransition = useEditorStore((s) => s.updateDrawingTransition);
  const stopDrawingTransition = useEditorStore((s) => s.stopDrawingTransition);
  const placingNewState = useEditorStore((s) => s.placingNewState);
  const stopPlacingState = useEditorStore((s) => s.stopPlacingState);
  const pendingTransitionSource = useEditorStore((s) => s.pendingTransitionSource);
  const setPendingTransitionSource = useEditorStore((s) => s.setPendingTransitionSource);

  const simIsActive = useSimulationStore((s) => s.isActive);
  const simTrace = useSimulationStore((s) => s.trace);
  const simCurrentStep = useSimulationStore((s) => s.currentStep);
  const simSnapshot = simTrace ? (simTrace.snapshots[simCurrentStep] ?? null) : null;

  const { panX, panY, zoom } = automaton.viewport;
  const [isPanning, setIsPanning] = useState(false);
  const [dragState, setDragState] = useState<GroupDragState | null>(null);
  const [symbolModal, setSymbolModal] = useState<SymbolModalState | null>(null);
  const [snapGuides, setSnapGuides] = useState<SnapGuide[]>([]);
  const [hoverPoint, setHoverPoint] = useState<{ x: number; y: number } | null>(null);
  const [handleHover, setHandleHover] = useState<{ stateId: string; angle: number } | null>(null);
  const panStart = useRef({ x: 0, y: 0, panX: 0, panY: 0 });
  const mouseDownPos = useRef<{ x: number; y: number } | null>(null);
  const didDrag = useRef(false);

  // Helper: is a given id in the current selection?
  const isSelected = useCallback(
    (type: 'state' | 'transition', id: string) =>
      selection.some((s) => s.type === type && s.id === id),
    [selection],
  );

  const getSvgPoint = useCallback(
    (clientX: number, clientY: number) => {
      const svg = svgRef.current;
      if (!svg) return { x: 0, y: 0 };
      const rect = svg.getBoundingClientRect();
      return {
        x: (clientX - rect.left - panX) / zoom,
        y: (clientY - rect.top - panY) / zoom,
      };
    },
    [panX, panY, zoom],
  );

  const findStateAtPoint = useCallback(
    (clientX: number, clientY: number) => {
      const point = getSvgPoint(clientX, clientY);
      return automaton.states.find((s) => {
        const dx = s.position.x - point.x;
        const dy = s.position.y - point.y;
        return Math.sqrt(dx * dx + dy * dy) <= 28;
      });
    },
    [getSvgPoint, automaton.states],
  );

  const handleCanvasMouseDown = useCallback(
    (e: React.MouseEvent) => {
      if (e.button !== 0) return;

      // During simulation, only allow panning
      if (simIsActive) {
        const target = e.target as SVGElement;
        const isCanvas = target === svgRef.current || (target as unknown as HTMLElement).dataset?.canvasBg === 'true';
        if (isCanvas) {
          setIsPanning(true);
          panStart.current = { x: e.clientX, y: e.clientY, panX, panY };
        }
        return;
      }

      const target = e.target as SVGElement;
      const isCanvas = target === svgRef.current || (target as unknown as HTMLElement).dataset?.canvasBg === 'true';

      if (placingNewState && isCanvas) {
        const point = getSvgPoint(e.clientX, e.clientY);
        addState(point);
        stopPlacingState();
        return;
      }

      if (isCanvas) {
        if (e.shiftKey) {
          // Start rubber-band selection
          const point = getSvgPoint(e.clientX, e.clientY);
          setSelectionBox({ start: point, end: point });
          mouseDownPos.current = { x: e.clientX, y: e.clientY };
        } else {
          clearSelection();
          setPendingTransitionSource(null);
          setIsPanning(true);
          mouseDownPos.current = { x: e.clientX, y: e.clientY };
          panStart.current = { x: e.clientX, y: e.clientY, panX, panY };
        }
      }
    },
    [simIsActive, placingNewState, getSvgPoint, addState, stopPlacingState, clearSelection, setPendingTransitionSource, setSelectionBox, panX, panY],
  );

  const handleMouseMove = useCallback(
    (e: React.MouseEvent) => {
      if (isPanning) {
        const dx = e.clientX - panStart.current.x;
        const dy = e.clientY - panStart.current.y;
        setViewport({
          panX: panStart.current.panX + dx,
          panY: panStart.current.panY + dy,
          zoom,
        });
        return;
      }

      // During simulation, no editing interactions
      if (simIsActive) return;

      // Rubber-band selection
      if (selectionBox) {
        const point = getSvgPoint(e.clientX, e.clientY);
        setSelectionBox({ start: selectionBox.start, end: point });

        // Compute which states are inside the box
        const minX = Math.min(selectionBox.start.x, point.x);
        const maxX = Math.max(selectionBox.start.x, point.x);
        const minY = Math.min(selectionBox.start.y, point.y);
        const maxY = Math.max(selectionBox.start.y, point.y);

        const insideStates = automaton.states.filter((s) =>
          s.position.x >= minX && s.position.x <= maxX &&
          s.position.y >= minY && s.position.y <= maxY,
        );
        setSelection(insideStates.map((s) => ({ type: 'state' as const, id: s.id })));
        return;
      }

      if (dragState) {
        didDrag.current = true;
        const point = getSvgPoint(e.clientX, e.clientY);
        const rawPos = {
          x: point.x + dragState.offset.x,
          y: point.y + dragState.offset.y,
        };
        const snappedPos = snapToAlignment(rawPos, dragState.primaryId, automaton.states);
        // Snap adjustment to apply to all states in the group
        const snapDelta = {
          x: snappedPos.x - rawPos.x,
          y: snappedPos.y - rawPos.y,
        };

        // Move the primary dragged state
        moveState(dragState.primaryId, snappedPos);
        setSnapGuides(computeSnapGuides(snappedPos, dragState.primaryId, automaton.states));

        // Move all other selected states by the same delta
        for (const [id, off] of dragState.offsets) {
          if (id === dragState.primaryId) continue;
          moveState(id, {
            x: point.x + off.x + snapDelta.x,
            y: point.y + off.y + snapDelta.y,
          });
        }
        return;
      }

      if (drawingTransition) {
        const point = getSvgPoint(e.clientX, e.clientY);
        updateDrawingTransition(point);
        return;
      }

      // Show "+" hint when hovering over empty canvas space, and compute handle angle for nearby states
      const svgPoint = getSvgPoint(e.clientX, e.clientY);
      let nearestState: { id: string; dist: number; angle: number } | null = null;
      for (const s of automaton.states) {
        const dx = svgPoint.x - s.position.x;
        const dy = svgPoint.y - s.position.y;
        const dist = Math.sqrt(dx * dx + dy * dy);
        if (dist <= 60 && (!nearestState || dist < nearestState.dist)) {
          nearestState = { id: s.id, dist, angle: Math.atan2(dy, dx) };
        }
      }
      setHandleHover(nearestState ? { stateId: nearestState.id, angle: nearestState.angle } : null);

      // Suppress "+" hint when near a transition edge
      let nearTransition = false;
      if (!nearestState) {
        const stateMap = new Map(automaton.states.map((s) => [s.id, s.position]));
        for (const t of automaton.transitions) {
          const src = stateMap.get(t.sourceId);
          const tgt = stateMap.get(t.targetId);
          if (src && tgt && t.sourceId !== t.targetId) {
            if (pointToSegmentDist(svgPoint, src, tgt) < 20) {
              nearTransition = true;
              break;
            }
          }
        }
      }
      setHoverPoint(nearestState || nearTransition ? null : svgPoint);
    },
    [isPanning, simIsActive, selectionBox, dragState, drawingTransition, getSvgPoint, setViewport, setSelectionBox, setSelection, updateDrawingTransition, zoom, automaton.states, automaton.transitions, moveState],
  );

  const handleMouseUp = useCallback(
    (e: React.MouseEvent) => {
      if (isPanning) {
        setIsPanning(false);
        // If the user barely moved the mouse and the "+" hint is visible, treat as click-to-add
        if (mouseDownPos.current && !simIsActive && hoverPoint) {
          const dx = e.clientX - mouseDownPos.current.x;
          const dy = e.clientY - mouseDownPos.current.y;
          if (Math.abs(dx) < DRAG_THRESHOLD && Math.abs(dy) < DRAG_THRESHOLD) {
            addState(hoverPoint);
          }
        }
        mouseDownPos.current = null;
        return;
      }

      if (simIsActive) return;

      // Finalize rubber-band selection
      if (selectionBox) {
        setSelectionBox(null);
        return;
      }

      if (dragState) {
        if (didDrag.current) {
          // Push the pre-drag automaton to history so undo restores the original position in one step
          useHistoryStore.getState().pushState(dragState.preDragAutomaton);
        }
        didDrag.current = false;
        setDragState(null);
        setSnapGuides([]);
        return;
      }

      if (drawingTransition) {
        const targetState = findStateAtPoint(e.clientX, e.clientY);
        if (targetState) {
          setSymbolModal({
            sourceId: drawingTransition.sourceId,
            targetId: targetState.id,
            position: { x: e.clientX, y: e.clientY },
          });
        } else {
          // Dropped on empty space — create a new state there and prompt for symbols
          const svgPoint = getSvgPoint(e.clientX, e.clientY);
          const newState = addState(svgPoint);
          if (newState) {
            setSymbolModal({
              sourceId: drawingTransition.sourceId,
              targetId: newState.id,
              position: { x: e.clientX, y: e.clientY },
            });
          }
        }
        stopDrawingTransition();
        return;
      }
    },
    [isPanning, simIsActive, selectionBox, dragState, drawingTransition, findStateAtPoint, stopDrawingTransition, getSvgPoint, addState, setSelectionBox],
  );

  const handleWheel = useCallback(
    (e: React.WheelEvent) => {
      e.preventDefault();
      const scaleFactor = e.deltaY > 0 ? 0.9 : 1.1;
      const newZoom = Math.max(0.2, Math.min(5, zoom * scaleFactor));

      const svg = svgRef.current;
      if (!svg) return;
      const rect = svg.getBoundingClientRect();
      const mx = e.clientX - rect.left;
      const my = e.clientY - rect.top;

      setViewport({
        panX: mx - (mx - panX) * (newZoom / zoom),
        panY: my - (my - panY) * (newZoom / zoom),
        zoom: newZoom,
      });
    },
    [zoom, panX, panY, setViewport],
  );

  const handleStateMouseDown = useCallback(
    (e: React.MouseEvent, stateId: string) => {
      if (simIsActive) return;
      e.stopPropagation();
      mouseDownPos.current = { x: e.clientX, y: e.clientY };
      didDrag.current = false;

      const isAlreadySelected = selection.some((s) => s.type === 'state' && s.id === stateId);

      if (e.shiftKey) {
        // Toggle this state in/out of selection
        toggleInSelection({ type: 'state', id: stateId });
      } else if (!isAlreadySelected) {
        // Replace selection with just this state
        setSelection({ type: 'state', id: stateId });
      }
      // If already selected (no shift), keep current selection for potential group drag

      // Compute offsets for group drag
      const point = getSvgPoint(e.clientX, e.clientY);
      const currentSel = e.shiftKey
        ? useEditorStore.getState().selection
        : isAlreadySelected ? selection : [{ type: 'state' as const, id: stateId }];

      const selectedStateIds = currentSel
        .filter((s) => s.type === 'state')
        .map((s) => s.id);

      const offsets = new Map<string, { x: number; y: number }>();
      for (const id of selectedStateIds) {
        const state = automaton.states.find((s) => s.id === id);
        if (state) {
          offsets.set(id, {
            x: state.position.x - point.x,
            y: state.position.y - point.y,
          });
        }
      }

      const primaryState = automaton.states.find((s) => s.id === stateId);
      if (primaryState) {
        setDragState({
          primaryId: stateId,
          offset: {
            x: primaryState.position.x - point.x,
            y: primaryState.position.y - point.y,
          },
          offsets,
          preDragAutomaton: automaton,
        });
      }
    },
    [simIsActive, automaton, getSvgPoint, setSelection, toggleInSelection, selection],
  );

  const handleStateMouseUp = useCallback(
    (e: React.MouseEvent, stateId: string) => {
      if (simIsActive) return;
      if (!mouseDownPos.current) return;
      const dx = e.clientX - mouseDownPos.current.x;
      const dy = e.clientY - mouseDownPos.current.y;
      const wasDrag = Math.sqrt(dx * dx + dy * dy) > DRAG_THRESHOLD;
      mouseDownPos.current = null;

      if (wasDrag) return;

      const pending = pendingTransitionSource;
      const now = Date.now();
      if (pending && pending.stateId !== stateId && now - pending.timestamp < PENDING_TIMEOUT_MS) {
        setSymbolModal({
          sourceId: pending.stateId,
          targetId: stateId,
          position: { x: e.clientX, y: e.clientY },
        });
        setPendingTransitionSource(null);
      } else {
        setPendingTransitionSource(stateId);
      }
    },
    [simIsActive, pendingTransitionSource, setPendingTransitionSource],
  );

  const handleStateDoubleClick = useCallback(
    (e: React.MouseEvent, stateId: string) => {
      if (simIsActive) return;
      e.stopPropagation();
      setPendingTransitionSource(null);
      setSymbolModal({
        sourceId: stateId,
        targetId: stateId,
        position: { x: e.clientX, y: e.clientY },
      });
    },
    [simIsActive, setPendingTransitionSource],
  );

  const handleHandleDragStart = useCallback(
    (e: React.MouseEvent, stateId: string) => {
      if (simIsActive) return;
      e.stopPropagation();
      const state = automaton.states.find((s) => s.id === stateId);
      if (state) {
        startDrawingTransition(stateId, state.position);
      }
    },
    [simIsActive, automaton.states, startDrawingTransition],
  );

  const handleTransitionClick = useCallback(
    (e: React.MouseEvent, transitionId: string) => {
      if (simIsActive) return;
      e.stopPropagation();
      setPendingTransitionSource(null);
      setSelection({ type: 'transition', id: transitionId });
    },
    [simIsActive, setSelection, setPendingTransitionSource],
  );

  const handleTransitionDoubleClick = useCallback(
    (e: React.MouseEvent, transitionId: string) => {
      if (simIsActive) return;
      e.stopPropagation();
      const transition = automaton.transitions.find((t) => t.id === transitionId);
      if (transition) {
        setSymbolModal({
          sourceId: transition.sourceId,
          targetId: transition.targetId,
          position: { x: e.clientX, y: e.clientY },
          existingSymbols: transition.symbols,
          editingTransitionId: transitionId,
        });
      }
    },
    [simIsActive, automaton.transitions],
  );

  const handleSymbolModalSubmit = useCallback(
    (symbols: string[]) => {
      if (!symbolModal) return;
      if (symbolModal.editingTransitionId) {
        updateTransition(symbolModal.editingTransitionId, { symbols });
      } else {
        addTransition(symbolModal.sourceId, symbolModal.targetId, symbols);
      }
      setSymbolModal(null);
    },
    [symbolModal, addTransition, updateTransition],
  );

  const handleSymbolModalCancel = useCallback(() => {
    setSymbolModal(null);
  }, []);

  const handleCanvasMouseLeave = useCallback(() => {
    setHoverPoint(null);
  }, []);

  // Compute simulation status for each state
  const getSimStatus = (stateId: string): SimulationStatus => {
    if (!simSnapshot) return null;
    const isActive = simSnapshot.activeStateIds.includes(stateId);
    if (!isActive) return null;
    if (simSnapshot.status === 'accepted') return 'accepted';
    if (simSnapshot.status === 'rejected') return 'rejected';
    return 'active';
  };

  const edgePaths = computeEdgePaths(automaton.states, automaton.transitions);
  const initialState = automaton.states.find((s) => s.isInitial);
  const drawingSource = drawingTransition
    ? automaton.states.find((s) => s.id === drawingTransition.sourceId)
    : null;

  const cursorClass = placingNewState ? 'cursor-crosshair' : '';
  const showHoverHint = hoverPoint && !drawingTransition && !dragState && !placingNewState && !simIsActive;

  // Rubber-band box coordinates
  const boxRect = selectionBox ? {
    x: Math.min(selectionBox.start.x, selectionBox.end.x),
    y: Math.min(selectionBox.start.y, selectionBox.end.y),
    width: Math.abs(selectionBox.end.x - selectionBox.start.x),
    height: Math.abs(selectionBox.end.y - selectionBox.start.y),
  } : null;

  return (
    <div className="canvas-container">
      <svg
        ref={svgRef}
        className={`automata-canvas ${cursorClass}`}
        onMouseDown={handleCanvasMouseDown}
        onMouseMove={handleMouseMove}
        onMouseUp={handleMouseUp}
        onMouseLeave={handleCanvasMouseLeave}
        onWheel={handleWheel}
        data-testid="automata-canvas"
      >
        <GridBackground />
        <rect width="100%" height="100%" fill="url(#grid)" data-canvas-bg="true" />

        <defs>
          <marker
            id="arrowhead"
            viewBox="0 0 10 10"
            refX="10"
            refY="5"
            markerWidth="8"
            markerHeight="8"
            orient="auto-start-reverse"
          >
            <path d="M 0 0 L 10 5 L 0 10 z" fill="var(--color-transition-stroke)" />
          </marker>
          <marker
            id="arrowhead-ghost"
            viewBox="0 0 10 10"
            refX="10"
            refY="5"
            markerWidth="8"
            markerHeight="8"
            orient="auto-start-reverse"
          >
            <path d="M 0 0 L 10 5 L 0 10 z" fill="var(--color-primary)" opacity="0.6" />
          </marker>
        </defs>

        <g transform={`translate(${panX}, ${panY}) scale(${zoom})`}>
          {/* Snap guides */}
          {snapGuides.map((g, i) =>
            g.axis === 'x' ? (
              <line
                key={`snap-${i}`}
                x1={g.position}
                y1={-10000}
                x2={g.position}
                y2={10000}
                stroke="var(--color-primary)"
                strokeWidth={0.5 / zoom}
                strokeDasharray={`${4 / zoom} ${4 / zoom}`}
                opacity={0.5}
              />
            ) : (
              <line
                key={`snap-${i}`}
                x1={-10000}
                y1={g.position}
                x2={10000}
                y2={g.position}
                stroke="var(--color-primary)"
                strokeWidth={0.5 / zoom}
                strokeDasharray={`${4 / zoom} ${4 / zoom}`}
                opacity={0.5}
              />
            ),
          )}

          {initialState && <InitialArrow state={initialState} />}

          {edgePaths.map((ep) => {
            const transition = automaton.transitions.find((t) => t.id === ep.transitionId);
            if (!transition) return null;
            const isSimActiveTransition = simSnapshot?.traversedTransitionIds.includes(transition.id) ?? false;
            return (
              <TransitionEdge
                key={ep.transitionId}
                edgePath={ep}
                transition={transition}
                isSelected={isSelected('transition', ep.transitionId)}
                isSimActive={isSimActiveTransition}
                onClick={handleTransitionClick}
                onDoubleClick={handleTransitionDoubleClick}
              />
            );
          })}

          {drawingSource && drawingTransition && (
            <GhostEdge
              start={drawingSource.position}
              end={drawingTransition.mousePos}
            />
          )}

          {automaton.states.map((state) => (
            <StateNode
              key={state.id}
              state={state}
              isSelected={isSelected('state', state.id)}
              isPendingSource={pendingTransitionSource?.stateId === state.id}
              simulationStatus={getSimStatus(state.id)}
              handleAngle={handleHover?.stateId === state.id ? handleHover.angle : undefined}
              onMouseDown={handleStateMouseDown}
              onMouseUp={handleStateMouseUp}
              onDoubleClick={handleStateDoubleClick}
              onHandleDragStart={handleHandleDragStart}
            />
          ))}

          {/* Rubber-band selection rectangle */}
          {boxRect && (
            <rect
              x={boxRect.x}
              y={boxRect.y}
              width={boxRect.width}
              height={boxRect.height}
              fill="var(--color-primary)"
              fillOpacity={0.08}
              stroke="var(--color-primary)"
              strokeWidth={1 / zoom}
              strokeDasharray={`${4 / zoom} ${4 / zoom}`}
              pointerEvents="none"
            />
          )}

          {/* Hover "+" hint for adding states on empty space */}
          {showHoverHint && (
            <g className="canvas-add-hint" pointerEvents="none">
              <circle
                cx={hoverPoint.x}
                cy={hoverPoint.y}
                r={12}
                fill="var(--color-primary)"
                opacity={0.15}
              />
              <text
                x={hoverPoint.x}
                y={hoverPoint.y}
                textAnchor="middle"
                dominantBaseline="central"
                fontSize={16}
                fontWeight="bold"
                fill="var(--color-primary)"
                opacity={0.5}
              >
                +
              </text>
            </g>
          )}
        </g>
      </svg>

      {symbolModal && (
        <TransitionSymbolModal
          position={symbolModal.position}
          initialSymbols={symbolModal.existingSymbols}
          onSubmit={handleSymbolModalSubmit}
          onCancel={handleSymbolModalCancel}
        />
      )}
    </div>
  );
}

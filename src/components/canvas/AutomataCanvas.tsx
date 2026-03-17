import { useRef, useCallback, useState } from 'react';
import { useAutomatonStore } from '@/stores/automaton-store';
import { useEditorStore } from '@/stores/editor-store';
import { computeEdgePaths } from '@/services/layout/edge-routing';
import { StateNode } from './StateNode';
import { TransitionEdge } from './TransitionEdge';
import { InitialArrow } from './InitialArrow';
import { GhostEdge } from './GhostEdge';
import { GridBackground } from './GridBackground';
import { TransitionSymbolModal } from './TransitionSymbolModal';
import { snapToAlignment, computeSnapGuides } from '@/utils/snap';
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

export function AutomataCanvas() {
  const svgRef = useRef<SVGSVGElement>(null);
  const automaton = useAutomatonStore((s) => s.automaton);
  const addState = useAutomatonStore((s) => s.addState);
  const removeTransition = useAutomatonStore((s) => s.removeTransition);
  const updateState = useAutomatonStore((s) => s.updateState);
  const addTransition = useAutomatonStore((s) => s.addTransition);
  const updateTransition = useAutomatonStore((s) => s.updateTransition);
  const setViewport = useAutomatonStore((s) => s.setViewport);

  const selection = useEditorStore((s) => s.selection);
  const setSelection = useEditorStore((s) => s.setSelection);
  const clearSelection = useEditorStore((s) => s.clearSelection);
  const drawingTransition = useEditorStore((s) => s.drawingTransition);
  const startDrawingTransition = useEditorStore((s) => s.startDrawingTransition);
  const updateDrawingTransition = useEditorStore((s) => s.updateDrawingTransition);
  const stopDrawingTransition = useEditorStore((s) => s.stopDrawingTransition);
  const placingNewState = useEditorStore((s) => s.placingNewState);
  const stopPlacingState = useEditorStore((s) => s.stopPlacingState);
  const pendingTransitionSource = useEditorStore((s) => s.pendingTransitionSource);
  const setPendingTransitionSource = useEditorStore((s) => s.setPendingTransitionSource);

  const { panX, panY, zoom } = automaton.viewport;
  const [isPanning, setIsPanning] = useState(false);
  const [dragState, setDragState] = useState<{ id: string; offset: { x: number; y: number } } | null>(null);
  const [symbolModal, setSymbolModal] = useState<SymbolModalState | null>(null);
  const [snapGuides, setSnapGuides] = useState<SnapGuide[]>([]);
  const panStart = useRef({ x: 0, y: 0, panX: 0, panY: 0 });
  const mouseDownPos = useRef<{ x: number; y: number } | null>(null);

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

      const target = e.target as SVGElement;
      const isCanvas = target === svgRef.current || target.tagName === 'rect';

      if (placingNewState && isCanvas) {
        const point = getSvgPoint(e.clientX, e.clientY);
        addState(point);
        stopPlacingState();
        return;
      }

      if (isCanvas) {
        clearSelection();
        setPendingTransitionSource(null);
        setIsPanning(true);
        panStart.current = { x: e.clientX, y: e.clientY, panX, panY };
      }
    },
    [placingNewState, getSvgPoint, addState, stopPlacingState, clearSelection, setPendingTransitionSource, panX, panY],
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

      if (dragState) {
        const point = getSvgPoint(e.clientX, e.clientY);
        const rawPos = {
          x: point.x + dragState.offset.x,
          y: point.y + dragState.offset.y,
        };
        const snappedPos = snapToAlignment(rawPos, dragState.id, automaton.states);
        updateState(dragState.id, { position: snappedPos });
        setSnapGuides(computeSnapGuides(snappedPos, dragState.id, automaton.states));
        return;
      }

      if (drawingTransition) {
        const point = getSvgPoint(e.clientX, e.clientY);
        updateDrawingTransition(point);
      }
    },
    [isPanning, dragState, drawingTransition, getSvgPoint, setViewport, updateState, updateDrawingTransition, zoom, automaton.states],
  );

  const handleMouseUp = useCallback(
    (e: React.MouseEvent) => {
      if (isPanning) {
        setIsPanning(false);
        return;
      }

      if (dragState) {
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
        }
        stopDrawingTransition();
        return;
      }
    },
    [isPanning, dragState, drawingTransition, findStateAtPoint, stopDrawingTransition],
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
      e.stopPropagation();
      mouseDownPos.current = { x: e.clientX, y: e.clientY };

      // Select + start drag
      setSelection({ type: 'state', id: stateId });
      const state = automaton.states.find((s) => s.id === stateId);
      if (state) {
        const point = getSvgPoint(e.clientX, e.clientY);
        setDragState({
          id: stateId,
          offset: {
            x: state.position.x - point.x,
            y: state.position.y - point.y,
          },
        });
      }
    },
    [automaton.states, getSvgPoint, setSelection],
  );

  const handleStateMouseUp = useCallback(
    (e: React.MouseEvent, stateId: string) => {
      // Only trigger click-to-click transition if this was a click (not a drag)
      if (!mouseDownPos.current) return;
      const dx = e.clientX - mouseDownPos.current.x;
      const dy = e.clientY - mouseDownPos.current.y;
      const wasDrag = Math.sqrt(dx * dx + dy * dy) > DRAG_THRESHOLD;
      mouseDownPos.current = null;

      if (wasDrag) return;

      // Check if there's a pending transition source from a previous click
      const pending = pendingTransitionSource;
      const now = Date.now();
      if (pending && pending.stateId !== stateId && now - pending.timestamp < PENDING_TIMEOUT_MS) {
        // Create transition from pending source to this state
        setSymbolModal({
          sourceId: pending.stateId,
          targetId: stateId,
          position: { x: e.clientX, y: e.clientY },
        });
        setPendingTransitionSource(null);
      } else {
        // Set this state as pending source for next click
        setPendingTransitionSource(stateId);
      }
    },
    [pendingTransitionSource, setPendingTransitionSource],
  );

  const handleStateDoubleClick = useCallback(
    (e: React.MouseEvent, stateId: string) => {
      e.stopPropagation();
      // Double-click on state = self-loop: open symbol modal immediately
      setPendingTransitionSource(null);
      setSymbolModal({
        sourceId: stateId,
        targetId: stateId,
        position: { x: e.clientX, y: e.clientY },
      });
    },
    [setPendingTransitionSource],
  );

  const handleHandleDragStart = useCallback(
    (e: React.MouseEvent, stateId: string) => {
      e.stopPropagation();
      const state = automaton.states.find((s) => s.id === stateId);
      if (state) {
        startDrawingTransition(stateId, state.position);
      }
    },
    [automaton.states, startDrawingTransition],
  );

  const handleTransitionClick = useCallback(
    (e: React.MouseEvent, transitionId: string) => {
      e.stopPropagation();
      setPendingTransitionSource(null);
      setSelection({ type: 'transition', id: transitionId });
    },
    [setSelection, setPendingTransitionSource],
  );

  const handleTransitionDoubleClick = useCallback(
    (e: React.MouseEvent, transitionId: string) => {
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
    [automaton.transitions],
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

  const edgePaths = computeEdgePaths(automaton.states, automaton.transitions);
  const initialState = automaton.states.find((s) => s.isInitial);
  const drawingSource = drawingTransition
    ? automaton.states.find((s) => s.id === drawingTransition.sourceId)
    : null;

  const cursorClass = placingNewState ? 'cursor-crosshair' : '';

  return (
    <div className="canvas-container">
      <svg
        ref={svgRef}
        className={`automata-canvas ${cursorClass}`}
        onMouseDown={handleCanvasMouseDown}
        onMouseMove={handleMouseMove}
        onMouseUp={handleMouseUp}
        onWheel={handleWheel}
        data-testid="automata-canvas"
      >
        <GridBackground />
        <rect width="100%" height="100%" fill="url(#grid)" />

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
            return (
              <TransitionEdge
                key={ep.transitionId}
                edgePath={ep}
                transition={transition}
                isSelected={selection?.type === 'transition' && selection.id === ep.transitionId}
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
              isSelected={selection?.type === 'state' && selection.id === state.id}
              isPendingSource={pendingTransitionSource?.stateId === state.id}
              onMouseDown={handleStateMouseDown}
              onMouseUp={handleStateMouseUp}
              onDoubleClick={handleStateDoubleClick}
              onHandleDragStart={handleHandleDragStart}
            />
          ))}
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

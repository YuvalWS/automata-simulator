import { useRef, useCallback, useState } from 'react';
import { useAutomatonStore } from '@/stores/automaton-store';
import type { Automaton, PdaRule, TmRule } from '@/models/automaton';
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
import { ContextMenu } from '@/components/mobile/ContextMenu';
import type { ContextMenuItem } from '@/components/mobile/ContextMenu';
import { useHistoryStore } from '@/stores/history-store';
import { useViewport } from '@/hooks/use-viewport';
import { useTouchCanvas } from '@/hooks/use-touch-canvas';
import type { TouchCanvasCallbacks } from '@/hooks/use-touch-canvas';
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
  existingPdaRules?: PdaRule[];
  existingTmRules?: TmRule[];
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
          // If the user was focused on a sidebar input or had a canvas element selected,
          // this click is intended to clear that focus/selection — don't also create a state.
          const hadInputFocus =
            document.activeElement instanceof HTMLInputElement ||
            document.activeElement instanceof HTMLTextAreaElement ||
            document.activeElement instanceof HTMLSelectElement;
          const hadSelection = useEditorStore.getState().selection.length > 0;
          clearSelection();
          setPendingTransitionSource(null);
          setIsPanning(true);
          mouseDownPos.current =
            hadInputFocus || hadSelection ? null : { x: e.clientX, y: e.clientY };
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
          existingPdaRules: transition.pdaRules,
          existingTmRules: transition.tmRules,
          editingTransitionId: transitionId,
        });
      }
    },
    [simIsActive, automaton.transitions],
  );

  const handleSymbolModalSubmit = useCallback(
    (symbols: string[], pdaRules?: PdaRule[], tmRules?: TmRule[]) => {
      if (!symbolModal) return;
      if (symbolModal.editingTransitionId) {
        if (pdaRules) {
          updateTransition(symbolModal.editingTransitionId, { pdaRules });
        } else if (tmRules) {
          updateTransition(symbolModal.editingTransitionId, { tmRules });
        } else {
          updateTransition(symbolModal.editingTransitionId, { symbols });
        }
      } else {
        addTransition(symbolModal.sourceId, symbolModal.targetId, symbols, pdaRules, tmRules);
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
    setHandleHover(null);
  }, []);

  // --- Touch support ---
  const { isMobile } = useViewport();
  const [contextMenu, setContextMenu] = useState<{ x: number; y: number; items: ContextMenuItem[] } | null>(null);

  const findStateNearClient = useCallback(
    (clientX: number, clientY: number) => {
      const point = getSvgPoint(clientX, clientY);
      return automaton.states.find((s) => {
        const dx = s.position.x - point.x;
        const dy = s.position.y - point.y;
        return Math.sqrt(dx * dx + dy * dy) <= 35; // slightly larger radius for touch
      });
    },
    [getSvgPoint, automaton.states],
  );

  const findTransitionNearClient = useCallback(
    (clientX: number, clientY: number) => {
      const point = getSvgPoint(clientX, clientY);
      const stateMap = new Map(automaton.states.map((s) => [s.id, s.position]));
      for (const t of automaton.transitions) {
        const src = stateMap.get(t.sourceId);
        const tgt = stateMap.get(t.targetId);
        if (src && tgt) {
          if (t.sourceId === t.targetId) {
            // Self-loop: check distance from loop center (above state)
            const dx = point.x - src.x;
            const dy = point.y - (src.y - 55);
            if (Math.sqrt(dx * dx + dy * dy) < 30) return t;
          } else if (pointToSegmentDist(point, src, tgt) < 20) {
            return t;
          }
        }
      }
      return undefined;
    },
    [getSvgPoint, automaton.states, automaton.transitions],
  );

  const pinchRef = useRef<{ startZoom: number; startPanX: number; startPanY: number; startCenterX: number; startCenterY: number; initialDist: number } | null>(null);
  const touchDragRef = useRef<{ type: 'state' | 'pan'; stateId?: string; preDragAutomaton?: Automaton; offset?: { x: number; y: number } } | null>(null);

  // No need for useMemo — the hook stores callbacks in a ref (cbRef.current)
  // so the native listeners always see the latest version regardless.
  const touchCallbacks: TouchCanvasCallbacks = {
    onTap: (clientX, clientY, _target) => {
      setContextMenu(null);

      if (simIsActive) return;

      // Placing new state mode
      if (placingNewState) {
        const point = getSvgPoint(clientX, clientY);
        addState(point);
        stopPlacingState();
        return;
      }

      const state = findStateNearClient(clientX, clientY);
      if (state) {
        // Check for pending transition source
        const pending = useEditorStore.getState().pendingTransitionSource;
        const now = Date.now();
        if (pending && pending.stateId !== state.id && now - pending.timestamp < PENDING_TIMEOUT_MS) {
          setSymbolModal({
            sourceId: pending.stateId,
            targetId: state.id,
            position: { x: clientX, y: clientY },
          });
          setPendingTransitionSource(null);
        } else {
          setSelection({ type: 'state', id: state.id });
          setPendingTransitionSource(state.id);
        }
        return;
      }

      const transition = findTransitionNearClient(clientX, clientY);
      if (transition) {
        setSelection({ type: 'transition', id: transition.id });
        setPendingTransitionSource(null);
        return;
      }

      // Tap on empty canvas
      clearSelection();
      setPendingTransitionSource(null);
    },

    onDoubleTap: (clientX, clientY, _target) => {
      if (simIsActive) return;
      setContextMenu(null);

      const state = findStateNearClient(clientX, clientY);
      if (state) {
        setPendingTransitionSource(null);
        setSymbolModal({
          sourceId: state.id,
          targetId: state.id,
          position: { x: clientX, y: clientY },
        });
        return;
      }

      const transition = findTransitionNearClient(clientX, clientY);
      if (transition) {
        setSymbolModal({
          sourceId: transition.sourceId,
          targetId: transition.targetId,
          position: { x: clientX, y: clientY },
          existingSymbols: transition.symbols,
          existingPdaRules: transition.pdaRules,
          existingTmRules: transition.tmRules,
          editingTransitionId: transition.id,
        });
      }
    },

    onLongPress: (clientX, clientY, _target) => {
      if (simIsActive) return;

      const state = findStateNearClient(clientX, clientY);
      if (state) {
        const removeState = useAutomatonStore.getState().removeState;
        const setInitialState = useAutomatonStore.getState().setInitialState;
        const toggleAccepting = useAutomatonStore.getState().toggleAccepting;
        setContextMenu({
          x: clientX,
          y: clientY,
          items: [
            { label: state.isAccepting ? 'Unset Accepting' : 'Set Accepting', action: () => toggleAccepting(state.id) },
            { label: state.isInitial ? 'Unset Initial' : 'Set Initial', action: () => setInitialState(state.id) },
            { label: 'Delete State', action: () => { removeState(state.id); clearSelection(); }, danger: true },
          ],
        });
        return;
      }

      const transition = findTransitionNearClient(clientX, clientY);
      if (transition) {
        const removeTransition = useAutomatonStore.getState().removeTransition;
        setContextMenu({
          x: clientX,
          y: clientY,
          items: [
            {
              label: 'Edit Symbols',
              action: () => setSymbolModal({
                sourceId: transition.sourceId,
                targetId: transition.targetId,
                position: { x: clientX, y: clientY },
                existingSymbols: transition.symbols,
                existingPdaRules: transition.pdaRules,
                existingTmRules: transition.tmRules,
                editingTransitionId: transition.id,
              }),
            },
            { label: 'Delete Transition', action: () => { removeTransition(transition.id); clearSelection(); }, danger: true },
          ],
        });
        return;
      }

      // Long press on empty space: offer to create a new state at that point
      const addState = useAutomatonStore.getState().addState;
      const point = getSvgPoint(clientX, clientY);
      setContextMenu({
        x: clientX,
        y: clientY,
        items: [
          { label: 'New State Here', action: () => { addState(point); } },
        ],
      });
    },

    onDragStart: (clientX, clientY, _target) => {
      setContextMenu(null);
      const state = findStateNearClient(clientX, clientY);
      if (state && !simIsActive) {
        const point = getSvgPoint(clientX, clientY);
        touchDragRef.current = {
          type: 'state',
          stateId: state.id,
          preDragAutomaton: useAutomatonStore.getState().automaton,
          offset: { x: state.position.x - point.x, y: state.position.y - point.y },
        };
        setSelection({ type: 'state', id: state.id });
        return;
      }
      // Pan
      touchDragRef.current = { type: 'pan' };
      const vp = useAutomatonStore.getState().automaton.viewport;
      panStart.current = { x: clientX, y: clientY, panX: vp.panX, panY: vp.panY };
    },

    onDragMove: (clientX, clientY) => {
      const td = touchDragRef.current;
      if (!td) return;

      if (td.type === 'state' && td.stateId && td.offset) {
        const point = getSvgPoint(clientX, clientY);
        const rawPos = { x: point.x + td.offset.x, y: point.y + td.offset.y };
        const snapped = snapToAlignment(rawPos, td.stateId, useAutomatonStore.getState().automaton.states);
        moveState(td.stateId, snapped);
        setSnapGuides(computeSnapGuides(snapped, td.stateId, useAutomatonStore.getState().automaton.states));
      } else if (td.type === 'pan') {
        const dx = clientX - panStart.current.x;
        const dy = clientY - panStart.current.y;
        const currentZoom = useAutomatonStore.getState().automaton.viewport.zoom;
        setViewport({
          panX: panStart.current.panX + dx,
          panY: panStart.current.panY + dy,
          zoom: currentZoom,
        });
      }
    },

    onDragEnd: (_clientX, _clientY) => {
      const td = touchDragRef.current;
      if (td?.type === 'state' && td.preDragAutomaton) {
        useHistoryStore.getState().pushState(td.preDragAutomaton);
      }
      setSnapGuides([]);
      touchDragRef.current = null;
    },

    onPinchStart: (centerX, centerY, distance) => {
      const vp = useAutomatonStore.getState().automaton.viewport;
      pinchRef.current = {
        startZoom: vp.zoom,
        startPanX: vp.panX,
        startPanY: vp.panY,
        startCenterX: centerX,
        startCenterY: centerY,
        initialDist: distance,
      };
    },

    onPinchMove: (centerX, centerY, distance) => {
      if (!pinchRef.current || !svgRef.current) return;
      const { startZoom, startPanX, startPanY, startCenterX, startCenterY, initialDist } = pinchRef.current;
      if (initialDist === 0) return;
      const scale = distance / initialDist;
      const newZoom = Math.max(0.2, Math.min(5, startZoom * scale));

      const svg = svgRef.current;
      const rect = svg.getBoundingClientRect();
      const mx = startCenterX - rect.left;
      const my = startCenterY - rect.top;

      // Also pan based on center movement
      const centerDx = centerX - startCenterX;
      const centerDy = centerY - startCenterY;

      setViewport({
        panX: mx - (mx - startPanX) * (newZoom / startZoom) + centerDx,
        panY: my - (my - startPanY) * (newZoom / startZoom) + centerDy,
        zoom: newZoom,
      });
    },

    onPinchEnd: () => {
      pinchRef.current = null;
    },
  };

  const nullRef = useRef<SVGSVGElement | null>(null);
  useTouchCanvas(touchCallbacks, isMobile ? svgRef : nullRef);

  // Compute simulation status for each state
  const getSimStatus = (stateId: string): SimulationStatus => {
    if (!simSnapshot) return null;
    const isActive = simSnapshot.activeStateIds.includes(stateId);
    if (!isActive) return null;
    if (simSnapshot.status === 'accepted') return 'accepted';
    if (simSnapshot.status === 'rejected') return 'rejected';
    return 'active';
  };

  const edgePaths = computeEdgePaths(automaton.states, automaton.transitions, automaton.type, automaton.tmBlankSymbol);
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
        style={isMobile ? { touchAction: 'none' } : undefined}
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
                automatonType={automaton.type}
                tmBlankSymbol={automaton.tmBlankSymbol}
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
              handleAngle={!isMobile && handleHover?.stateId === state.id ? handleHover.angle : undefined}
              showHandle={false}
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
          initialPdaRules={symbolModal.existingPdaRules}
          initialTmRules={symbolModal.existingTmRules}
          automatonType={automaton.type}
          pdaStackMode={automaton.pdaStackMode}
          tmBlankSymbol={automaton.tmBlankSymbol}
          onSubmit={handleSymbolModalSubmit}
          onCancel={handleSymbolModalCancel}
        />
      )}

      {contextMenu && (
        <ContextMenu
          x={contextMenu.x}
          y={contextMenu.y}
          items={contextMenu.items}
          onClose={() => setContextMenu(null)}
        />
      )}
    </div>
  );
}

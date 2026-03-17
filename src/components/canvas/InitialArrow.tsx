import type { AutomatonState } from '@/models/automaton';
import { computeInitialArrowPath } from '@/services/layout/edge-routing';

interface InitialArrowProps {
  state: AutomatonState;
}

export function InitialArrow({ state }: InitialArrowProps) {
  const path = computeInitialArrowPath(state);

  return (
    <path
      d={path}
      fill="none"
      stroke="var(--color-state-stroke)"
      strokeWidth={2}
      markerEnd="url(#arrowhead)"
      data-testid={`initial-arrow-${state.id}`}
    />
  );
}

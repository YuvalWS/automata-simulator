import { useSimulationStore } from '@/stores/simulation-store';

/**
 * Single source of truth for "is editing the automaton currently disallowed?".
 * Today this is exactly "a simulation is active" — if more sources are ever
 * added (e.g. a read-only mode), they plug in here so callers don't have to
 * change.
 */
export function useEditingLocked(): boolean {
  return useSimulationStore((s) => s.isActive);
}

/** Non-hook variant for use inside event handlers and one-off callbacks. */
export function isEditingLocked(): boolean {
  return useSimulationStore.getState().isActive;
}

/** Tooltip text shown when a user tries to interact with an editing control. */
export const EDITING_LOCKED_MESSAGE = 'Exit simulation mode to edit the machine';

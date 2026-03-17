import { describe, it, expect, beforeEach } from 'vitest';
import { useSimulationStore, getCurrentSnapshot } from '@/stores/simulation-store';
import { useAutomatonStore } from '@/stores/automaton-store';


function setupDfa() {
  const store = useAutomatonStore.getState();
  store.newAutomaton('Test DFA');
  // q0 is auto-created. Add q1 (accepting) and transitions.
  const q0 = store.automaton.states[0]!;
  const q1 = store.addState({ x: 100, y: 0 });
  store.toggleAccepting(q1.id);
  store.addTransition(q0.id, q1.id, ['a']);
  store.addTransition(q1.id, q1.id, ['b']);
  store.setAlphabet(['a', 'b']);
}

describe('simulation store', () => {
  beforeEach(() => {
    useSimulationStore.getState().exitSimulation();
    useAutomatonStore.getState().newAutomaton('Test');
  });

  it('starts inactive', () => {
    expect(useSimulationStore.getState().isActive).toBe(false);
  });

  it('enterSimulation activates and runs validation', () => {
    useSimulationStore.getState().enterSimulation();
    expect(useSimulationStore.getState().isActive).toBe(true);
  });

  it('exitSimulation deactivates and clears state', () => {
    useSimulationStore.getState().enterSimulation();
    useSimulationStore.getState().exitSimulation();
    expect(useSimulationStore.getState().isActive).toBe(false);
    expect(useSimulationStore.getState().trace).toBeNull();
  });

  describe('with DFA', () => {
    beforeEach(() => {
      setupDfa();
      useSimulationStore.getState().enterSimulation();
    });

    it('starts simulation with valid word', () => {
      useSimulationStore.getState().setWordInput('a');
      useSimulationStore.getState().startSimulation();

      const { trace } = useSimulationStore.getState();
      expect(trace).not.toBeNull();
      expect(trace!.snapshots).toHaveLength(2);
    });

    it('step 0 is initial state', () => {
      useSimulationStore.getState().setWordInput('a');
      useSimulationStore.getState().startSimulation();

      const snapshot = getCurrentSnapshot(useSimulationStore.getState());
      expect(snapshot!.step).toBe(0);
      expect(snapshot!.activeStateIds).toHaveLength(1);
    });

    it('stepForward advances currentStep', () => {
      useSimulationStore.getState().setWordInput('a');
      useSimulationStore.getState().startSimulation();
      useSimulationStore.getState().stepForward();

      expect(useSimulationStore.getState().currentStep).toBe(1);
    });

    it('stepBackward goes back', () => {
      useSimulationStore.getState().setWordInput('a');
      useSimulationStore.getState().startSimulation();
      useSimulationStore.getState().stepForward();
      useSimulationStore.getState().stepBackward();

      expect(useSimulationStore.getState().currentStep).toBe(0);
    });

    it('stepBackward does not go below 0', () => {
      useSimulationStore.getState().setWordInput('a');
      useSimulationStore.getState().startSimulation();
      useSimulationStore.getState().stepBackward();

      expect(useSimulationStore.getState().currentStep).toBe(0);
    });

    it('stepForward does not exceed trace length', () => {
      useSimulationStore.getState().setWordInput('a');
      useSimulationStore.getState().startSimulation();
      useSimulationStore.getState().stepForward();
      useSimulationStore.getState().stepForward();
      useSimulationStore.getState().stepForward();

      expect(useSimulationStore.getState().currentStep).toBe(1); // only 2 snapshots (0,1)
    });

    it('blocks simulation on validation error', () => {
      useSimulationStore.getState().setWordInput('c');
      useSimulationStore.getState().startSimulation();

      expect(useSimulationStore.getState().trace).toBeNull();
      expect(useSimulationStore.getState().validationMessages.some((m) => m.type === 'error')).toBe(true);
    });

    it('parses comma-separated word', () => {
      useSimulationStore.getState().setWordInput('a, b');
      useSimulationStore.getState().startSimulation();

      expect(useSimulationStore.getState().word).toEqual(['a', 'b']);
    });

    it('goToStep clamps to bounds', () => {
      useSimulationStore.getState().setWordInput('a');
      useSimulationStore.getState().startSimulation();
      useSimulationStore.getState().goToStep(100);

      expect(useSimulationStore.getState().currentStep).toBe(1);
    });
  });
});

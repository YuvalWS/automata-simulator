/**
 * Tests for simulation-store.ts
 *
 * The simulation store manages the simulation lifecycle: entering/exiting
 * simulation mode, running single-word traces with step navigation,
 * and batch mode for testing multiple words at once. It orchestrates
 * the simulator service and validator, gating simulation on validation.
 */
import { describe, it, expect, beforeEach } from 'vitest';
import { useSimulationStore, getCurrentSnapshot } from '@/stores/simulation-store';
import { useAutomatonStore } from '@/stores/automaton-store';
import { AutomatonType } from '@/models/types';


function setupDfa() {
  useAutomatonStore.getState().newAutomaton('Test DFA');
  // Re-read state after mutation to get fresh snapshot
  const q0 = useAutomatonStore.getState().automaton.states[0]!;
  const q1 = useAutomatonStore.getState().addState({ x: 100, y: 0 });
  useAutomatonStore.getState().toggleAccepting(q1.id);
  useAutomatonStore.getState().addTransition(q0.id, q1.id, ['a']);
  useAutomatonStore.getState().addTransition(q1.id, q1.id, ['b']);
  useAutomatonStore.getState().setAlphabet(['a', 'b']);
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

    it('startSimulation triggers autoRunning', () => {
      useSimulationStore.getState().setWordInput('a');
      useSimulationStore.getState().startSimulation();

      // After startSimulation, autoRunning should be true (auto-run starts)
      expect(useSimulationStore.getState().autoRunning).toBe(true);
    });
  });

  describe('batch simulation', () => {
    beforeEach(() => {
      setupDfa();
      useSimulationStore.getState().enterSimulation();
    });

    it('setBatchMode toggles batch mode', () => {
      useSimulationStore.getState().setBatchMode(true);
      expect(useSimulationStore.getState().batchMode).toBe(true);
      useSimulationStore.getState().setBatchMode(false);
      expect(useSimulationStore.getState().batchMode).toBe(false);
    });

    it('runBatch produces results for each word', () => {
      useSimulationStore.getState().setBatchMode(true);
      useSimulationStore.getState().setBatchInput('a\nab\nb');
      useSimulationStore.getState().runBatch();

      const { batchResults } = useSimulationStore.getState();
      expect(batchResults).not.toBeNull();
      expect(batchResults).toHaveLength(3);
    });

    it('runBatch correctly accepts and rejects', () => {
      const automaton = useAutomatonStore.getState().automaton;
      // Verify DFA is set up correctly
      expect(automaton.states).toHaveLength(2);
      expect(automaton.transitions).toHaveLength(2);
      const accepting = automaton.states.find((s) => s.isAccepting);
      expect(accepting).toBeDefined();

      useSimulationStore.getState().setBatchMode(true);
      useSimulationStore.getState().setBatchInput('a\nab\nb');
      useSimulationStore.getState().runBatch();

      const { batchResults, validationMessages } = useSimulationStore.getState();
      expect(validationMessages.some((m) => m.type === 'error')).toBe(false);
      expect(batchResults).not.toBeNull();
      // "a" → q0→q1 (accepting), "ab" → q0→q1→q1 (accepting, b self-loop), "b" → no transition → rejected
      expect(batchResults![0]!.status).toBe('accepted');
      expect(batchResults![1]!.status).toBe('accepted');
      expect(batchResults![2]!.status).toBe('rejected');
    });

    it('runBatch blocks on automaton validation error', () => {
      // Remove initial state to cause validation error
      const auto = useAutomatonStore.getState().automaton;
      const stateIds = auto.states.map((s) => s.id);
      for (const id of stateIds) {
        useAutomatonStore.getState().removeState(id);
      }

      useSimulationStore.getState().setBatchMode(true);
      useSimulationStore.getState().setBatchInput('a');
      useSimulationStore.getState().runBatch();

      expect(useSimulationStore.getState().batchResults).toBeNull();
      expect(useSimulationStore.getState().validationMessages.some((m) => m.type === 'error')).toBe(true);
    });

    it('runBatch shows error for empty input', () => {
      useSimulationStore.getState().setBatchMode(true);
      useSimulationStore.getState().setBatchInput('');
      useSimulationStore.getState().runBatch();

      expect(useSimulationStore.getState().batchResults).toBeNull();
      expect(useSimulationStore.getState().validationMessages.some((m) => m.type === 'error')).toBe(true);
    });

    it('clearBatchResults clears results', () => {
      useSimulationStore.getState().setBatchMode(true);
      useSimulationStore.getState().setBatchInput('a');
      useSimulationStore.getState().runBatch();
      expect(useSimulationStore.getState().batchResults).not.toBeNull();

      useSimulationStore.getState().clearBatchResults();
      expect(useSimulationStore.getState().batchResults).toBeNull();
    });

    it('exitSimulation clears batch state', () => {
      useSimulationStore.getState().setBatchMode(true);
      useSimulationStore.getState().setBatchInput('a\nb');
      useSimulationStore.getState().runBatch();
      useSimulationStore.getState().exitSimulation();

      expect(useSimulationStore.getState().batchMode).toBe(false);
      expect(useSimulationStore.getState().batchInput).toBe('');
      expect(useSimulationStore.getState().batchResults).toBeNull();
    });

    it('batch ignores empty lines and only processes non-empty words', () => {
      useSimulationStore.getState().setBatchMode(true);
      // Empty lines between words are filtered out by runBatch
      useSimulationStore.getState().setBatchInput('a\n\n\nb');
      useSimulationStore.getState().runBatch();

      const results = useSimulationStore.getState().batchResults!;
      // Only 'a' and 'b' should be processed — empty lines skipped
      expect(results).toHaveLength(2);
      expect(results[0]!.word).toEqual(['a']);
      expect(results[0]!.status).toBe('accepted');
      expect(results[1]!.word).toEqual(['b']);
      expect(results[1]!.status).toBe('rejected');
    });
  });

  // --- Additional edge cases ---

  describe('NFA simulation through store', () => {
    it('NFA simulation with epsilon transitions works through the store', () => {
      // Set up a simple NFA with epsilon: q0 --ε--> q1(accept)
      useAutomatonStore.getState().newAutomaton('Test NFA');
      useAutomatonStore.getState().setType(AutomatonType.NFA);
      const q0 = useAutomatonStore.getState().automaton.states[0]!;
      const q1 = useAutomatonStore.getState().addState({ x: 100, y: 0 });
      useAutomatonStore.getState().toggleAccepting(q1.id);
      useAutomatonStore.getState().addTransition(q0.id, q1.id, ['\u03B5']);

      useSimulationStore.getState().enterSimulation();
      useSimulationStore.getState().setWordInput('');
      useSimulationStore.getState().startSimulation();

      const { trace } = useSimulationStore.getState();
      expect(trace).not.toBeNull();
      // Empty word with epsilon to accepting state
      const lastSnap = trace!.snapshots[trace!.snapshots.length - 1]!;
      expect(lastSnap.status).toBe('accepted');
    });
  });

  describe('goToStep edge cases', () => {
    it('goToStep with negative value clamps to 0', () => {
      setupDfa();
      useSimulationStore.getState().enterSimulation();
      useSimulationStore.getState().setWordInput('a');
      useSimulationStore.getState().startSimulation();

      useSimulationStore.getState().goToStep(-5);
      expect(useSimulationStore.getState().currentStep).toBe(0);
    });
  });

  describe('empty word simulation', () => {
    it('starting simulation with empty word input runs trace on empty word', () => {
      setupDfa();
      useSimulationStore.getState().enterSimulation();
      useSimulationStore.getState().setWordInput('');
      useSimulationStore.getState().startSimulation();

      // Empty word on this DFA: q0 is not accepting, so rejected
      const { trace } = useSimulationStore.getState();
      expect(trace).not.toBeNull();
      expect(trace!.snapshots).toHaveLength(1);
      expect(trace!.snapshots[0]!.status).toBe('rejected');
    });
  });
});

import { create } from 'zustand';
import type { SimulationTrace, SimulationSnapshot } from '@/services/simulation/simulator';
import { buildSimulationTrace } from '@/services/simulation/simulator';
import { validateAutomaton, validateWord } from '@/services/simulation/validator';
import type { ValidationMessage } from '@/services/simulation/validator';
import { useAutomatonStore } from './automaton-store';
import { AutomatonType } from '@/models/types';

export interface BatchResult {
  word: string[];
  wordDisplay: string;
  status: 'accepted' | 'rejected';
}

interface SimulationStore {
  isActive: boolean;
  wordInput: string;
  word: string[];
  trace: SimulationTrace | null;
  currentStep: number;
  autoRunning: boolean;
  autoRunSpeed: number;
  validationMessages: ValidationMessage[];
  batchMode: boolean;
  batchInput: string;
  batchResults: BatchResult[] | null;

  // Actions
  enterSimulation: () => void;
  exitSimulation: () => void;
  setWordInput: (input: string) => void;
  startSimulation: () => void;
  stopTrace: () => void;
  stepForward: () => void;
  stepBackward: () => void;
  goToStep: (step: number) => void;
  startAutoRun: () => void;
  stopAutoRun: () => void;
  setAutoRunSpeed: (speed: number) => void;
  setBatchMode: (on: boolean) => void;
  setBatchInput: (input: string) => void;
  runBatch: () => void;
  clearBatchResults: () => void;
}

let autoRunInterval: ReturnType<typeof setInterval> | null = null;

function parseWord(input: string): string[] {
  const trimmed = input.trim();
  if (trimmed === '') return [];
  // If input contains commas or spaces, split by those; otherwise split char-by-char
  if (trimmed.includes(',')) {
    return trimmed.split(',').map((s) => s.trim()).filter((s) => s.length > 0);
  }
  if (trimmed.includes(' ')) {
    return trimmed.split(/\s+/).filter((s) => s.length > 0);
  }
  return trimmed.split('');
}

export const useSimulationStore = create<SimulationStore>((set, get) => ({
  isActive: false,
  wordInput: '',
  word: [],
  trace: null,
  currentStep: 0,
  autoRunning: false,
  autoRunSpeed: 500,
  validationMessages: [],
  batchMode: false,
  batchInput: '',
  batchResults: null,

  enterSimulation: () => {
    const automaton = useAutomatonStore.getState().automaton;
    const messages = validateAutomaton(automaton);
    set({ isActive: true, validationMessages: messages, trace: null, currentStep: 0, word: [], autoRunning: false });
  },

  exitSimulation: () => {
    if (autoRunInterval) {
      clearInterval(autoRunInterval);
      autoRunInterval = null;
    }
    set({ isActive: false, trace: null, currentStep: 0, word: [], wordInput: '', autoRunning: false, validationMessages: [], batchMode: false, batchInput: '', batchResults: null });
  },

  setWordInput: (input) => set({ wordInput: input }),

  startSimulation: () => {
    const { wordInput } = get();
    const automaton = useAutomatonStore.getState().automaton;
    const word = parseWord(wordInput);

    // Validate. TM has no fixed input alphabet (tape symbols are implicit), so skip word-alphabet check.
    const automatonMessages = validateAutomaton(automaton);
    const wordMessages = automaton.type === AutomatonType.TM ? [] : validateWord(word, automaton.alphabet);
    const allMessages = [...automatonMessages, ...wordMessages];
    const hasErrors = allMessages.some((m) => m.type === 'error');

    if (hasErrors) {
      set({ validationMessages: allMessages });
      return;
    }

    const trace = buildSimulationTrace(automaton, word);
    set({ trace, word, currentStep: 0, validationMessages: allMessages, autoRunning: false });

    // Auto-run from step 0 to show the full animation and final result
    get().startAutoRun();
  },

  stopTrace: () => {
    if (autoRunInterval) {
      clearInterval(autoRunInterval);
      autoRunInterval = null;
    }
    set({ trace: null, currentStep: 0, autoRunning: false });
  },

  stepForward: () => {
    const { trace, currentStep } = get();
    if (!trace) return;
    if (currentStep < trace.snapshots.length - 1) {
      set({ currentStep: currentStep + 1 });
    }
  },

  stepBackward: () => {
    const { currentStep } = get();
    if (currentStep > 0) {
      set({ currentStep: currentStep - 1 });
    }
  },

  goToStep: (step) => {
    const { trace } = get();
    if (!trace) return;
    const clamped = Math.max(0, Math.min(step, trace.snapshots.length - 1));
    set({ currentStep: clamped });
  },

  startAutoRun: () => {
    if (autoRunInterval) clearInterval(autoRunInterval);
    set({ autoRunning: true });
    autoRunInterval = setInterval(() => {
      const { trace, currentStep } = get();
      if (!trace || currentStep >= trace.snapshots.length - 1) {
        get().stopAutoRun();
        return;
      }
      set({ currentStep: currentStep + 1 });
    }, get().autoRunSpeed);
  },

  stopAutoRun: () => {
    if (autoRunInterval) {
      clearInterval(autoRunInterval);
      autoRunInterval = null;
    }
    set({ autoRunning: false });
  },

  setAutoRunSpeed: (speed) => {
    set({ autoRunSpeed: speed });
    // Restart interval if running
    if (get().autoRunning) {
      get().stopAutoRun();
      get().startAutoRun();
    }
  },

  setBatchMode: (on) => {
    // Clear single-word trace when switching modes
    if (autoRunInterval) {
      clearInterval(autoRunInterval);
      autoRunInterval = null;
    }
    set({ batchMode: on, trace: null, currentStep: 0, autoRunning: false, batchResults: null });
  },

  setBatchInput: (input) => set({ batchInput: input }),

  runBatch: () => {
    const { batchInput } = get();
    const automaton = useAutomatonStore.getState().automaton;

    // Validate automaton
    const automatonMessages = validateAutomaton(automaton);
    const hasErrors = automatonMessages.some((m) => m.type === 'error');
    if (hasErrors) {
      set({ validationMessages: automatonMessages, batchResults: null });
      return;
    }

    // Parse each line as a word
    const lines = batchInput.split('\n').map((l) => l.trim()).filter((l) => l.length > 0);
    if (lines.length === 0) {
      set({ validationMessages: [{ type: 'error', message: 'Enter at least one word (one per line)' }], batchResults: null });
      return;
    }

    const results: BatchResult[] = lines.map((line) => {
      const word = parseWord(line);
      const trace = buildSimulationTrace(automaton, word);
      const lastSnap = trace.snapshots[trace.snapshots.length - 1];
      return {
        word,
        wordDisplay: word.length === 0 ? '\u03B5' : word.join(''),
        status: lastSnap?.status === 'accepted' ? 'accepted' : 'rejected',
      };
    });

    set({ batchResults: results, validationMessages: automatonMessages });
  },

  clearBatchResults: () => set({ batchResults: null }),
}));

// Helper to get current snapshot
export function getCurrentSnapshot(store: SimulationStore): SimulationSnapshot | null {
  if (!store.trace) return null;
  return store.trace.snapshots[store.currentStep] ?? null;
}

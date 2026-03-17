import { create } from 'zustand';
import type { SimulationTrace, SimulationSnapshot } from '@/services/simulation/simulator';
import { buildSimulationTrace } from '@/services/simulation/simulator';
import { validateAutomaton, validateWord } from '@/services/simulation/validator';
import type { ValidationMessage } from '@/services/simulation/validator';
import { useAutomatonStore } from './automaton-store';

interface SimulationStore {
  isActive: boolean;
  wordInput: string;
  word: string[];
  trace: SimulationTrace | null;
  currentStep: number;
  autoRunning: boolean;
  autoRunSpeed: number;
  validationMessages: ValidationMessage[];

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
    set({ isActive: false, trace: null, currentStep: 0, word: [], wordInput: '', autoRunning: false, validationMessages: [] });
  },

  setWordInput: (input) => set({ wordInput: input }),

  startSimulation: () => {
    const { wordInput } = get();
    const automaton = useAutomatonStore.getState().automaton;
    const word = parseWord(wordInput);

    // Validate
    const automatonMessages = validateAutomaton(automaton);
    const wordMessages = validateWord(word, automaton.alphabet);
    const allMessages = [...automatonMessages, ...wordMessages];
    const hasErrors = allMessages.some((m) => m.type === 'error');

    if (hasErrors) {
      set({ validationMessages: allMessages });
      return;
    }

    const trace = buildSimulationTrace(automaton, word);
    set({ trace, word, currentStep: 0, validationMessages: allMessages, autoRunning: false });
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
}));

// Helper to get current snapshot
export function getCurrentSnapshot(store: SimulationStore): SimulationSnapshot | null {
  if (!store.trace) return null;
  return store.trace.snapshots[store.currentStep] ?? null;
}

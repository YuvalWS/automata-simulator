import { Page } from '@playwright/test';

/**
 * Helper to programmatically set up automata via store injection in E2E tests.
 * Uses the dev-only __stores__ exposed on window in App.tsx.
 */
export class AutomatonBuilder {
  constructor(private page: Page) {}

  /**
   * Load a simple 2-state DFA:
   * q0 --a--> q1(accept)
   * q0 --b--> q0
   * q1 --a--> q1
   * q1 --b--> q0
   * Alphabet: [a, b]
   */
  async loadSimpleDFA() {
    await this.page.evaluate(() => {
      const stores = (window as any).__stores__;
      if (!stores) throw new Error('Stores not exposed — is dev mode running?');
      const store = stores.automatonStore.getState();
      store.newAutomaton('Test DFA');
      const automaton = stores.automatonStore.getState().automaton;
      const q0 = automaton.states[0];
      const q1 = store.addState({ x: 400, y: 250 });
      store.toggleAccepting(q1.id);
      store.addTransition(q0.id, q1.id, ['a']);
      store.addTransition(q0.id, q0.id, ['b']);
      store.addTransition(q1.id, q1.id, ['a']);
      store.addTransition(q1.id, q0.id, ['b']);
    });
  }

  /**
   * Load a 3-state NFA with epsilon transitions:
   * q0 --ε--> q1
   * q0 --a--> q0
   * q1 --b--> q2(accept)
   */
  async loadNFAWithEpsilon() {
    await this.page.evaluate(() => {
      const stores = (window as any).__stores__;
      const store = stores.automatonStore.getState();
      store.newAutomaton('Test NFA');
      store.setType('NFA');
      const automaton = stores.automatonStore.getState().automaton;
      const q0 = automaton.states[0];
      const q1 = store.addState({ x: 350, y: 250 });
      const q2 = store.addState({ x: 500, y: 250 });
      store.toggleAccepting(q2.id);
      store.addTransition(q0.id, q1.id, ['ε']);
      store.addTransition(q0.id, q0.id, ['a']);
      store.addTransition(q1.id, q2.id, ['b']);
    });
  }

  /**
   * Load a simple PDA for a^n b^n:
   * q0: push A for each 'a'
   * q1: pop A for each 'b'
   * q2: accepting state (reached when stack has only Z₀)
   */
  async loadSimplePDA() {
    await this.page.evaluate(() => {
      const stores = (window as any).__stores__;
      if (!stores) throw new Error('Stores not exposed — is dev mode running?');
      const store = stores.automatonStore.getState();
      store.newAutomaton('Test PDA');
      store.setType('PDA');
      store.setAcceptanceMode('finalState');
      const automaton = stores.automatonStore.getState().automaton;
      const q0 = automaton.states[0];
      const q1 = store.addState({ x: 350, y: 250 });
      const q2 = store.addState({ x: 500, y: 250 });
      store.toggleAccepting(q2.id);

      const EPS = '\u03B5';
      const Z0 = 'Z\u2080';

      // q0: read 'a', pop Z₀, push A,Z₀
      store.addTransition(q0.id, q0.id, [], [{ inputSymbol: 'a', stackPop: Z0, stackPush: ['A', Z0] }]);
      // q0: read 'a', pop A, push A,A
      store.addTransition(q0.id, q0.id, [], [{ inputSymbol: 'a', stackPop: 'A', stackPush: ['A', 'A'] }]);
      // q0 -> q1: epsilon, pop A, push A (switch to popping phase)
      store.addTransition(q0.id, q1.id, [], [{ inputSymbol: EPS, stackPop: 'A', stackPush: ['A'] }]);
      // q1: read 'b', pop A, push nothing
      store.addTransition(q1.id, q1.id, [], [{ inputSymbol: 'b', stackPop: 'A', stackPush: [] }]);
      // q1 -> q2: epsilon, pop Z₀, push Z₀ (done)
      store.addTransition(q1.id, q2.id, [], [{ inputSymbol: EPS, stackPop: Z0, stackPush: [Z0] }]);
    });
  }

  /**
   * Reset to a fresh empty automaton (with just q0 as initial).
   */
  async reset() {
    await this.page.evaluate(() => {
      const stores = (window as any).__stores__;
      if (!stores) throw new Error('Stores not exposed');
      stores.automatonStore.getState().newAutomaton('Untitled');
      stores.editorStore.getState().clearSelection();
    });
  }

  /** Get the current automaton state from the store */
  async getAutomaton() {
    return this.page.evaluate(() => {
      const stores = (window as any).__stores__;
      return stores.automatonStore.getState().automaton;
    });
  }

  /** Get the current selection from the editor store */
  async getSelection() {
    return this.page.evaluate(() => {
      const stores = (window as any).__stores__;
      return stores.editorStore.getState().selection;
    });
  }

  /** Check if simulation is active */
  async isSimulationActive(): Promise<boolean> {
    return this.page.evaluate(() => {
      const stores = (window as any).__stores__;
      return stores.simulationStore.getState().isActive;
    });
  }
}

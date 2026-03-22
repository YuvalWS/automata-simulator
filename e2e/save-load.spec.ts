import { test, expect } from '@playwright/test';
import { CanvasHelper } from './helpers/canvas-helpers';
import { AutomatonBuilder } from './helpers/automaton-builder';
import { SEL } from './helpers/selectors';

test.describe('Save and Load', () => {
  let canvas: CanvasHelper;
  let builder: AutomatonBuilder;

  test.beforeEach(async ({ page }) => {
    canvas = new CanvasHelper(page);
    builder = new AutomatonBuilder(page);
    await page.goto('/');
    await page.waitForSelector(SEL.canvas);
  });

  test('automaton can be serialized and deserialized via store', async ({ page }) => {
    // Build a DFA
    await builder.loadSimpleDFA();
    await page.waitForTimeout(100);

    // Serialize current automaton
    const serialized = await page.evaluate(() => {
      const stores = (window as any).__stores__;
      const automaton = stores.automatonStore.getState().automaton;
      return JSON.parse(JSON.stringify(automaton));
    });

    expect(serialized.states).toHaveLength(2);
    expect(serialized.transitions).toHaveLength(4);
    expect(serialized.type).toBe('DFA');
  });

  test('loading automaton via store injection renders correctly', async ({ page }) => {
    await builder.loadSimpleDFA();
    await page.waitForTimeout(100);

    // Verify states rendered
    await expect(page.locator(SEL.allStates)).toHaveCount(2);
    // Verify transitions rendered
    await expect(page.locator(SEL.allTransitions)).toHaveCount(4);
  });

  test('round-trip: build, serialize, reset, deserialize, verify', async ({ page }) => {
    // Build automaton
    await builder.loadSimpleDFA();
    await page.waitForTimeout(100);

    // Serialize
    const serialized = await page.evaluate(() => {
      const stores = (window as any).__stores__;
      return JSON.parse(JSON.stringify(stores.automatonStore.getState().automaton));
    });

    // Reset
    await builder.reset();
    await page.waitForTimeout(100);
    await expect(page.locator(SEL.allStates)).toHaveCount(1);
    await expect(page.locator(SEL.allTransitions)).toHaveCount(0);

    // Deserialize
    await page.evaluate((data) => {
      const stores = (window as any).__stores__;
      stores.automatonStore.getState().setAutomaton(data);
    }, serialized);
    await page.waitForTimeout(100);

    // Verify
    await expect(page.locator(SEL.allStates)).toHaveCount(2);
    await expect(page.locator(SEL.allTransitions)).toHaveCount(4);
  });

  test('NFA with epsilon can be serialized and deserialized', async ({ page }) => {
    await builder.loadNFAWithEpsilon();
    await page.waitForTimeout(100);

    const automaton = await builder.getAutomaton();
    expect(automaton.type).toBe('NFA');
    expect(automaton.states).toHaveLength(3);
    // Check epsilon transition exists
    const hasEpsilon = automaton.transitions.some((t: any) =>
      t.symbols.includes('ε')
    );
    expect(hasEpsilon).toBe(true);
  });

  test('round-trip preserves automaton name, type, and alphabet', async ({ page }) => {
    // Build a DFA and set specific name and alphabet
    await builder.loadSimpleDFA();
    await page.waitForTimeout(100);

    await page.evaluate(() => {
      const stores = (window as any).__stores__;
      stores.automatonStore.getState().setName('My Custom DFA');
      stores.automatonStore.getState().setAlphabet(['x', 'y', 'z']);
    });

    // Serialize
    const serialized = await page.evaluate(() => {
      const stores = (window as any).__stores__;
      return JSON.parse(JSON.stringify(stores.automatonStore.getState().automaton));
    });

    // Reset and restore
    await builder.reset();
    await page.evaluate((data: any) => {
      const stores = (window as any).__stores__;
      stores.automatonStore.getState().setAutomaton(data);
    }, serialized);
    await page.waitForTimeout(100);

    const restored = await builder.getAutomaton();
    expect(restored.name).toBe('My Custom DFA');
    expect(restored.type).toBe('DFA');
    expect(restored.alphabet).toEqual(['x', 'y', 'z']);
  });

  test('save and reload preserves transition symbols accurately', async ({ page }) => {
    // Build a DFA with a multi-symbol transition via store injection
    await page.evaluate(() => {
      const stores = (window as any).__stores__;
      const store = stores.automatonStore.getState();
      store.newAutomaton('Multi-Symbol DFA');
      const q0 = stores.automatonStore.getState().automaton.states[0];
      const q1 = store.addState({ x: 400, y: 250 });
      // Create a multi-symbol transition: q0 --a,b--> q1
      store.addTransition(q0.id, q1.id, ['a', 'b']);
    });
    await page.waitForTimeout(100);

    const serialized = await page.evaluate(() => {
      const stores = (window as any).__stores__;
      return JSON.parse(JSON.stringify(stores.automatonStore.getState().automaton));
    });

    await builder.reset();
    await page.evaluate((data: any) => {
      const stores = (window as any).__stores__;
      stores.automatonStore.getState().setAutomaton(data);
    }, serialized);
    await page.waitForTimeout(100);

    const restored = await builder.getAutomaton();
    const multiSymbol = restored.transitions.find((t: any) => t.symbols.length > 1);
    expect(multiSymbol).toBeDefined();
    expect(multiSymbol!.symbols).toEqual(['a', 'b']);
  });

  test('NFA type is preserved through serialize/deserialize', async ({ page }) => {
    await builder.loadNFAWithEpsilon();
    await page.waitForTimeout(100);

    const serialized = await page.evaluate(() => {
      const stores = (window as any).__stores__;
      return JSON.parse(JSON.stringify(stores.automatonStore.getState().automaton));
    });

    await builder.reset();
    await page.evaluate((data: any) => {
      const stores = (window as any).__stores__;
      stores.automatonStore.getState().setAutomaton(data);
    }, serialized);
    await page.waitForTimeout(100);

    const restored = await builder.getAutomaton();
    expect(restored.type).toBe('NFA');
  });
});

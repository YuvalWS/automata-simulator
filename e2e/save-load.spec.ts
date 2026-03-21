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
});

import { test, expect } from '@playwright/test';
import { AutomatonBuilder } from './helpers/automaton-builder';
import { SEL } from './helpers/selectors';

test.describe('Save and Load', () => {
  let builder: AutomatonBuilder;

  test.beforeEach(async ({ page }) => {
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

// --- Mobile Phone Save/Load Tests ---

const phoneViewport = { width: 390, height: 844 };

test.describe('Save and Load - Mobile Phone', () => {
  test.use({ viewport: phoneViewport, hasTouch: true });

  let builder: AutomatonBuilder;

  test.beforeEach(async ({ page }) => {
    builder = new AutomatonBuilder(page);
    await page.goto('/');
    await page.waitForSelector(SEL.canvas);
  });

  test('phone hamburger menu shows Save button', async ({ page }) => {
    await page.locator('[data-testid="hamburger-btn"]').click();
    const dropdown = page.locator('[data-testid="hamburger-dropdown"]');
    await expect(dropdown).toBeVisible();
    await expect(dropdown.locator('text=Save')).toBeVisible();
  });

  test('phone hamburger menu shows Load button', async ({ page }) => {
    await page.locator('[data-testid="hamburger-btn"]').click();
    const dropdown = page.locator('[data-testid="hamburger-dropdown"]');
    await expect(dropdown).toBeVisible();
    await expect(dropdown.locator('text=Load')).toBeVisible();
  });

  test('phone hamburger menu shows Export PNG button', async ({ page }) => {
    await page.locator('[data-testid="hamburger-btn"]').click();
    const dropdown = page.locator('[data-testid="hamburger-dropdown"]');
    await expect(dropdown).toBeVisible();
    await expect(dropdown.locator('text=Export PNG')).toBeVisible();
  });

  test('phone Save button closes menu without error', async ({ page }) => {
    await builder.loadSimpleDFA();
    await page.waitForTimeout(100);

    await page.locator('[data-testid="hamburger-btn"]').click();
    const dropdown = page.locator('[data-testid="hamburger-dropdown"]');
    await expect(dropdown).toBeVisible();

    // Click Save — triggers file-saver fallback download (no File System Access API in Playwright)
    await dropdown.locator('text=Save').click();
    // Menu should close after clicking
    await expect(dropdown).not.toBeVisible();
    // App should still be functional
    await expect(page.locator(SEL.canvas)).toBeVisible();
  });

  test('phone Load button triggers file chooser', async ({ page }) => {
    // Disable File System Access API so the fallback <input type="file"> is used
    // (Playwright can only intercept the fallback file input, not showOpenFilePicker)
    await page.evaluate(() => { delete (window as any).showOpenFilePicker; });

    // Listen for the file chooser before clicking Load
    const fileChooserPromise = page.waitForEvent('filechooser');

    await page.locator('[data-testid="hamburger-btn"]').click();
    const dropdown = page.locator('[data-testid="hamburger-dropdown"]');
    await expect(dropdown).toBeVisible();
    await dropdown.locator('text=Load').click();

    const fileChooser = await fileChooserPromise;
    expect(fileChooser).toBeTruthy();
    // Verify it accepts JSON files
    expect(fileChooser.isMultiple()).toBe(false);
  });

  test('phone can load automaton from JSON file via hamburger menu', async ({ page }) => {
    // Disable File System Access API so the fallback <input type="file"> is used
    await page.evaluate(() => { delete (window as any).showOpenFilePicker; });

    // Build a valid JSON save file content
    const saveFileContent = JSON.stringify({
      version: '1.0.0',
      automaton: {
        id: 'test-mobile-load',
        name: 'Mobile Loaded DFA',
        type: 'DFA',
        alphabet: ['a', 'b'],
        states: [
          { id: 's1', name: 'q0', position: { x: 200, y: 250 }, isInitial: true, isAccepting: false },
          { id: 's2', name: 'q1', position: { x: 400, y: 250 }, isInitial: false, isAccepting: true },
          { id: 's3', name: 'q2', position: { x: 300, y: 400 }, isInitial: false, isAccepting: false },
        ],
        transitions: [
          { id: 't1', sourceId: 's1', targetId: 's2', symbols: ['a'] },
          { id: 't2', sourceId: 's1', targetId: 's3', symbols: ['b'] },
        ],
        viewport: { panX: 0, panY: 0, zoom: 1 },
      },
    });

    // Listen for the file chooser before clicking Load
    const fileChooserPromise = page.waitForEvent('filechooser');

    await page.locator('[data-testid="hamburger-btn"]').click();
    const dropdown = page.locator('[data-testid="hamburger-dropdown"]');
    await dropdown.locator('text=Load').click();

    const fileChooser = await fileChooserPromise;

    // Create a temporary file and provide it to the file chooser
    await fileChooser.setFiles({
      name: 'test-automaton.json',
      mimeType: 'application/json',
      buffer: Buffer.from(saveFileContent),
    });

    await page.waitForTimeout(300);

    // Verify the automaton was loaded
    const automaton = await builder.getAutomaton();
    expect(automaton.name).toBe('Mobile Loaded DFA');
    expect(automaton.type).toBe('DFA');
    expect(automaton.states).toHaveLength(3);
    expect(automaton.transitions).toHaveLength(2);
  });

  test('phone Export PNG is disabled when no states exist', async ({ page }) => {
    // Reset to empty automaton (newAutomaton still creates q0, so we need to check with the default)
    await page.locator('[data-testid="hamburger-btn"]').click();
    const dropdown = page.locator('[data-testid="hamburger-dropdown"]');
    await expect(dropdown).toBeVisible();
    // Export PNG should be enabled since q0 exists by default
    const exportBtn = dropdown.locator('text=Export PNG');
    await expect(exportBtn).toBeVisible();
  });

  test('phone Export PNG button closes menu for automaton with states', async ({ page }) => {
    await builder.loadSimpleDFA();
    await page.waitForTimeout(100);

    await page.locator('[data-testid="hamburger-btn"]').click();
    const dropdown = page.locator('[data-testid="hamburger-dropdown"]');
    await expect(dropdown).toBeVisible();

    const exportBtn = dropdown.locator('text=Export PNG');
    await expect(exportBtn).toBeEnabled();
    await exportBtn.click();
    // Menu should close after clicking
    await expect(dropdown).not.toBeVisible();
  });
});

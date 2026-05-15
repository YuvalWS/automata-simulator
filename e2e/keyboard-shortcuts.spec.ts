import { test, expect, type Page } from '@playwright/test';
import { CanvasHelper } from './helpers/canvas-helpers';
import { AutomatonBuilder } from './helpers/automaton-builder';
import { SEL } from './helpers/selectors';

test.describe('Keyboard Shortcuts', () => {
  let canvas: CanvasHelper;
  let builder: AutomatonBuilder;

  test.beforeEach(async ({ page }) => {
    canvas = new CanvasHelper(page);
    builder = new AutomatonBuilder(page);
    await page.goto('/');
    await page.waitForSelector(SEL.canvas);
  });

  const placingNewState = (page: Page) =>
    page.evaluate(
      () => (window as { __stores__?: any }).__stores__.editorStore.getState().placingNewState,
    );

  test('N key activates new state placement mode', async ({ page }) => {
    await page.keyboard.press('n');
    expect(await placingNewState(page)).toBe(true);
  });

  test('Escape clears selection', async ({ page }) => {
    const firstState = page.locator(SEL.allStates).first();
    await firstState.click();

    let selection = await builder.getSelection();
    expect(selection.length).toBeGreaterThan(0);

    await page.keyboard.press('Escape');

    selection = await builder.getSelection();
    expect(selection).toHaveLength(0);
  });

  test('Escape cancels new state placement mode', async ({ page }) => {
    await page.keyboard.press('n');
    expect(await placingNewState(page)).toBe(true);

    await page.keyboard.press('Escape');
    expect(await placingNewState(page)).toBe(false);
  });

  test('Space toggles accepting on selected state', async ({ page }) => {
    const firstState = page.locator(SEL.allStates).first();
    await firstState.click();

    let automaton = await builder.getAutomaton();
    expect(automaton.states[0].isAccepting).toBe(false);

    await page.keyboard.press('Space');

    automaton = await builder.getAutomaton();
    expect(automaton.states[0].isAccepting).toBe(true);

    // Toggle back
    await page.keyboard.press('Space');
    automaton = await builder.getAutomaton();
    expect(automaton.states[0].isAccepting).toBe(false);
  });

  test('Ctrl+A selects all states', async ({ page }) => {
    // Create additional states
    await canvas.clickCanvas(400, 100);
    await canvas.clickCanvas(600, 100);
    await expect(page.locator(SEL.allStates)).toHaveCount(3);

    await page.keyboard.press('Control+a');

    const selection = await builder.getSelection();
    expect(selection).toHaveLength(3);
  });

  test('Delete removes selected element', async ({ page }) => {
    await canvas.clickCanvas(500, 200);
    await expect(page.locator(SEL.allStates)).toHaveCount(2);

    const states = page.locator(SEL.allStates);
    await states.nth(1).click();
    await page.keyboard.press('Delete');

    await expect(page.locator(SEL.allStates)).toHaveCount(1);
  });

  test('shortcuts are suppressed when typing in input fields', async ({ page }) => {
    // Select state to show properties panel with name input
    const firstState = page.locator(SEL.allStates).first();
    await firstState.click();

    // Focus the name input
    const nameInput = page.locator(SEL.stateNameInput);
    await nameInput.focus();

    // Type 'n' — should NOT activate new state mode
    await page.keyboard.press('n');

    expect(await placingNewState(page)).toBe(false);
  });

  test('Ctrl+Z and Ctrl+Shift+Z work for undo/redo', async ({ page }) => {
    await canvas.clickCanvas(500, 200);
    await expect(page.locator(SEL.allStates)).toHaveCount(2);

    await page.keyboard.press('Control+z');
    await expect(page.locator(SEL.allStates)).toHaveCount(1);

    await page.keyboard.press('Control+Shift+z');
    await expect(page.locator(SEL.allStates)).toHaveCount(2);
  });

  test('Ctrl+Y triggers redo', async ({ page }) => {
    await canvas.clickCanvas(500, 200);
    await expect(page.locator(SEL.allStates)).toHaveCount(2);

    await page.keyboard.press('Control+z');
    await expect(page.locator(SEL.allStates)).toHaveCount(1);

    await page.keyboard.press('Control+y');
    await expect(page.locator(SEL.allStates)).toHaveCount(2);
  });

  test('Ctrl+N creates a new automaton', async ({ page }) => {
    // Add a second state so the new-automaton confirm dialog is triggered
    await canvas.clickCanvas(500, 200);
    await expect(page.locator(SEL.allStates)).toHaveCount(2);

    page.on('dialog', (dialog) => dialog.accept());
    await page.keyboard.press('Control+n');

    // A fresh automaton has just the initial state
    await expect(page.locator(SEL.allStates)).toHaveCount(1);
  });

  test('Escape cancels a pending transition source', async ({ page }) => {
    // Simulate the click-to-connect flow by marking a state as the pending source
    await page.evaluate(() => {
      const stores = (window as { __stores__?: any }).__stores__;
      const stateId = stores.automatonStore.getState().automaton.states[0].id;
      stores.editorStore.getState().setPendingTransitionSource(stateId);
    });

    let pending = await page.evaluate(
      () => (window as { __stores__?: any }).__stores__.editorStore.getState().pendingTransitionSource,
    );
    expect(pending).not.toBeNull();

    await page.keyboard.press('Escape');

    pending = await page.evaluate(
      () => (window as { __stores__?: any }).__stores__.editorStore.getState().pendingTransitionSource,
    );
    expect(pending).toBeNull();
  });
});

test.describe('Simulation Keyboard Shortcuts', () => {
  let builder: AutomatonBuilder;

  const simState = (page: Page) =>
    page.evaluate(() => {
      const s = (window as { __stores__?: any }).__stores__.simulationStore.getState();
      return { hasTrace: s.trace !== null, currentStep: s.currentStep, autoRunning: s.autoRunning };
    });

  test.beforeEach(async ({ page }) => {
    builder = new AutomatonBuilder(page);
    await page.goto('/');
    await page.waitForSelector(SEL.canvas);
    await builder.loadSimpleDFA();
    await page.waitForTimeout(100);
    // Enter simulation mode and queue a multi-step word via the store
    await page.locator(SEL.toolbarSimulate).click();
    await page.evaluate(() => {
      (window as { __stores__?: any }).__stores__.simulationStore.getState().setWordInput('a,b,a');
    });
    // Blur the focused toolbar button so Space/Enter reach the global handler
    await page.evaluate(() => (document.activeElement as HTMLElement)?.blur());
  });

  test('Space starts the simulation when no trace exists', async ({ page }) => {
    expect((await simState(page)).hasTrace).toBe(false);

    await page.keyboard.press('Space');

    await expect.poll(async () => (await simState(page)).hasTrace).toBe(true);
  });

  test('Space steps forward once a trace exists', async ({ page }) => {
    // Build a trace and pause it at step 0
    await page.evaluate(() => {
      const s = (window as { __stores__?: any }).__stores__.simulationStore.getState();
      s.startSimulation();
      s.stopAutoRun();
      s.goToStep(0);
    });
    expect((await simState(page)).currentStep).toBe(0);

    await page.keyboard.press('Space');

    await expect.poll(async () => (await simState(page)).currentStep).toBe(1);
  });

  test('ArrowRight steps forward and ArrowLeft steps backward', async ({ page }) => {
    await page.evaluate(() => {
      const s = (window as { __stores__?: any }).__stores__.simulationStore.getState();
      s.startSimulation();
      s.stopAutoRun();
      s.goToStep(0);
    });

    await page.keyboard.press('ArrowRight');
    await expect.poll(async () => (await simState(page)).currentStep).toBe(1);

    await page.keyboard.press('ArrowLeft');
    await expect.poll(async () => (await simState(page)).currentStep).toBe(0);
  });

  test('Enter toggles auto-run', async ({ page }) => {
    await page.evaluate(() => {
      const s = (window as { __stores__?: any }).__stores__.simulationStore.getState();
      s.startSimulation();
      s.stopAutoRun();
      s.goToStep(0);
    });
    expect((await simState(page)).autoRunning).toBe(false);

    await page.keyboard.press('Enter');
    await expect.poll(async () => (await simState(page)).autoRunning).toBe(true);

    await page.keyboard.press('Enter');
    await expect.poll(async () => (await simState(page)).autoRunning).toBe(false);
  });
});

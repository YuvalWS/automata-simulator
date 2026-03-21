import { test, expect } from '@playwright/test';
import { CanvasHelper } from './helpers/canvas-helpers';
import { AutomatonBuilder } from './helpers/automaton-builder';
import { SEL } from './helpers/selectors';

test.describe('Simulation', () => {
  let canvas: CanvasHelper;
  let builder: AutomatonBuilder;

  test.beforeEach(async ({ page }) => {
    canvas = new CanvasHelper(page);
    builder = new AutomatonBuilder(page);
    await page.goto('/');
    await page.waitForSelector(SEL.canvas);
    // Load a simple DFA: q0 --a--> q1(accept), q0 --b--> q0, q1 --a--> q1, q1 --b--> q0
    await builder.loadSimpleDFA();
    await page.waitForTimeout(100);
  });

  test('clicking Simulate enters simulation mode', async ({ page }) => {
    await page.locator(SEL.toolbarSimulate).click();

    await expect(page.locator('.simulation-panel')).toBeVisible();
    const isActive = await builder.isSimulationActive();
    expect(isActive).toBe(true);
  });

  test('simulation panel shows word input', async ({ page }) => {
    await page.locator(SEL.toolbarSimulate).click();
    await expect(page.locator(SEL.simWordInput)).toBeVisible();
  });

  test('running accepted word shows Accepted status', async ({ page }) => {
    await page.locator(SEL.toolbarSimulate).click();

    await page.locator(SEL.simWordInput).fill('a');
    await page.locator(SEL.simRunBtn).click();

    // Wait for trace to complete — go to end
    await page.waitForTimeout(200);

    // Navigate to end of trace
    const goToEndBtn = page.locator('button[title="Go to end"]');
    await goToEndBtn.click();

    await expect(page.locator('.sim-status-accepted')).toBeVisible();
  });

  test('running rejected word shows Rejected status', async ({ page }) => {
    await page.locator(SEL.toolbarSimulate).click();

    await page.locator(SEL.simWordInput).fill('b');
    await page.locator(SEL.simRunBtn).click();

    await page.waitForTimeout(200);
    const goToEndBtn = page.locator('button[title="Go to end"]');
    await goToEndBtn.click();

    await expect(page.locator('.sim-status-rejected')).toBeVisible();
  });

  test('step forward and backward navigate through trace', async ({ page }) => {
    await page.locator(SEL.toolbarSimulate).click();

    await page.locator(SEL.simWordInput).fill('a,b');
    await page.locator(SEL.simRunBtn).click();
    await page.waitForTimeout(200);

    // Stop auto-run first so we can manually step
    const pauseBtn = page.locator('button[title="Pause"]');
    if (await pauseBtn.isVisible()) {
      await pauseBtn.click();
    }

    // Go to start
    await page.locator('button[title="Go to start"]').click();

    const stepForwardBtn = page.locator('button[title="Step forward"]');
    const stepBackBtn = page.locator('button[title="Step back"]');

    const stepText = page.locator('.panel-title').nth(1);
    const text0 = await stepText.textContent();

    // Step forward
    await stepForwardBtn.click();
    const text1 = await stepText.textContent();

    // Step back
    await stepBackBtn.click();
    const text2 = await stepText.textContent();

    // After stepping forward then back, we should be at the same step as before
    expect(text0).toBe(text2);
    // Step forward should have moved us to a different step
    expect(text0).not.toBe(text1);
  });

  test('exit simulation returns to editing mode', async ({ page }) => {
    await page.locator(SEL.toolbarSimulate).click();
    await expect(page.locator('.simulation-panel')).toBeVisible();

    await page.locator(SEL.simExitBtn).click();

    await expect(page.locator('.simulation-panel')).not.toBeVisible();
    await expect(page.locator(SEL.propertiesPanel)).toBeVisible();
    const isActive = await builder.isSimulationActive();
    expect(isActive).toBe(false);
  });

  test('during simulation, clicking canvas does not create states', async ({ page }) => {
    await page.locator(SEL.toolbarSimulate).click();
    const countBefore = await canvas.stateCount();

    await canvas.clickCanvas(600, 100);

    const countAfter = await canvas.stateCount();
    expect(countAfter).toBe(countBefore);
  });

  test('Escape exits simulation', async ({ page }) => {
    await page.locator(SEL.toolbarSimulate).click();
    await expect(page.locator('.simulation-panel')).toBeVisible();

    await page.keyboard.press('Escape');

    const isActive = await builder.isSimulationActive();
    expect(isActive).toBe(false);
  });

  test('batch mode: run multiple words and see results', async ({ page }) => {
    await page.locator(SEL.toolbarSimulate).click();

    // Switch to batch mode
    await page.locator('text=Batch').click();

    await expect(page.locator(SEL.simBatchInput)).toBeVisible();
    await page.locator(SEL.simBatchInput).fill('a\nb\naa\nba');

    await page.locator('text=Run All').click();
    await page.waitForTimeout(200);

    // Should see results
    const results = page.locator('.sim-batch-row');
    await expect(results).toHaveCount(4);

    // 'a' ends in q1 (accepting) → accepted
    // 'b' ends in q0 (not accepting) → rejected
    // 'aa' ends in q1 → accepted
    // 'ba' ends in q1 → accepted
    const acceptedBadges = page.locator('.sim-batch-badge-accepted');
    const rejectedBadges = page.locator('.sim-batch-badge-rejected');
    expect(await acceptedBadges.count()).toBe(3);
    expect(await rejectedBadges.count()).toBe(1);
  });

  test('simulation toolbar button changes to Exit Sim', async ({ page }) => {
    await page.locator(SEL.toolbarSimulate).click();
    await expect(page.locator(SEL.toolbarSimulateActive)).toBeVisible();
    // Use the toolbar-specific selector to avoid matching the panel's "Exit Simulation" button
    await expect(page.locator(`${SEL.toolbarSimulateActive} .tool-label`)).toHaveText('Exit Sim');
  });

  test('editing buttons are disabled during simulation', async ({ page }) => {
    await page.locator(SEL.toolbarSimulate).click();

    // Undo/redo should be disabled during simulation
    await expect(page.locator(SEL.toolbarUndo)).toBeDisabled();
    await expect(page.locator(SEL.toolbarRedo)).toBeDisabled();
  });
});

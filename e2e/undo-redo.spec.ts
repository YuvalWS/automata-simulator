import { test, expect } from '@playwright/test';
import { CanvasHelper } from './helpers/canvas-helpers';
import { AutomatonBuilder } from './helpers/automaton-builder';
import { SEL } from './helpers/selectors';

test.describe('Undo/Redo', () => {
  let canvas: CanvasHelper;
  let builder: AutomatonBuilder;

  test.beforeEach(async ({ page }) => {
    canvas = new CanvasHelper(page);
    builder = new AutomatonBuilder(page);
    await page.goto('/');
    await page.waitForSelector(SEL.canvas);
  });

  test('undo button is disabled initially', async ({ page }) => {
    await expect(page.locator(SEL.toolbarUndo)).toBeDisabled();
  });

  test('redo button is disabled initially', async ({ page }) => {
    await expect(page.locator(SEL.toolbarRedo)).toBeDisabled();
  });

  test('adding a state enables undo', async ({ page }) => {
    await canvas.clickCanvas(500, 200);
    await expect(page.locator(SEL.allStates)).toHaveCount(2);

    await expect(page.locator(SEL.toolbarUndo)).toBeEnabled();
  });

  test('undo removes added state', async ({ page }) => {
    await canvas.clickCanvas(500, 200);
    await expect(page.locator(SEL.allStates)).toHaveCount(2);

    await page.locator(SEL.toolbarUndo).click();
    await expect(page.locator(SEL.allStates)).toHaveCount(1);
  });

  test('redo restores undone state', async ({ page }) => {
    await canvas.clickCanvas(500, 200);
    await expect(page.locator(SEL.allStates)).toHaveCount(2);

    await page.locator(SEL.toolbarUndo).click();
    await expect(page.locator(SEL.allStates)).toHaveCount(1);

    await page.locator(SEL.toolbarRedo).click();
    await expect(page.locator(SEL.allStates)).toHaveCount(2);
  });

  test('Ctrl+Z triggers undo', async ({ page }) => {
    await canvas.clickCanvas(500, 200);
    await expect(page.locator(SEL.allStates)).toHaveCount(2);

    await page.keyboard.press('Control+z');
    await expect(page.locator(SEL.allStates)).toHaveCount(1);
  });

  test('Ctrl+Shift+Z triggers redo', async ({ page }) => {
    await canvas.clickCanvas(500, 200);
    await page.keyboard.press('Control+z');
    await expect(page.locator(SEL.allStates)).toHaveCount(1);

    await page.keyboard.press('Control+Shift+z');
    await expect(page.locator(SEL.allStates)).toHaveCount(2);
  });

  test('undo after delete restores state', async ({ page }) => {
    await canvas.clickCanvas(500, 200);
    await expect(page.locator(SEL.allStates)).toHaveCount(2);

    // Select and delete the new state
    const states = page.locator(SEL.allStates);
    await states.nth(1).click();
    await page.keyboard.press('Delete');
    await expect(page.locator(SEL.allStates)).toHaveCount(1);

    // Undo should restore it
    await page.keyboard.press('Control+z');
    await expect(page.locator(SEL.allStates)).toHaveCount(2);
  });

  test('undo after delete restores state and its transitions', async ({ page }) => {
    // Build a DFA with transitions
    await builder.loadSimpleDFA();
    await page.waitForTimeout(100);

    const initialTransitionCount = await canvas.transitionCount();
    expect(initialTransitionCount).toBeGreaterThan(0);

    // Select second state and delete
    const states = page.locator(SEL.allStates);
    await states.nth(1).click();
    await page.keyboard.press('Delete');

    // Transitions should be reduced
    const afterDeleteCount = await canvas.transitionCount();
    expect(afterDeleteCount).toBeLessThan(initialTransitionCount);

    // Undo should restore everything
    await page.keyboard.press('Control+z');
    await expect(page.locator(SEL.allStates)).toHaveCount(2);
    const restoredCount = await canvas.transitionCount();
    expect(restoredCount).toBe(initialTransitionCount);
  });

  test('redo is disabled after a new action breaks the redo chain', async ({ page }) => {
    // Add state, undo it
    await canvas.clickCanvas(500, 200);
    await page.keyboard.press('Control+z');
    await expect(page.locator(SEL.toolbarRedo)).toBeEnabled();

    // New action (add another state) should clear redo
    await canvas.clickCanvas(600, 200);
    await expect(page.locator(SEL.toolbarRedo)).toBeDisabled();
  });
});

import { test, expect } from '@playwright/test';
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

  test('N key activates new state placement mode', async ({ page }) => {
    await page.keyboard.press('n');

    // The toolbar button should have active class
    await expect(page.locator(`${SEL.toolbarNewState}.active`)).toBeVisible();
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
    await expect(page.locator(`${SEL.toolbarNewState}.active`)).toBeVisible();

    await page.keyboard.press('Escape');
    await expect(page.locator(`${SEL.toolbarNewState}.active`)).not.toBeVisible();
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

    // Check that new state mode is not active
    await expect(page.locator(`${SEL.toolbarNewState}.active`)).not.toBeVisible();
  });

  test('Ctrl+Z and Ctrl+Shift+Z work for undo/redo', async ({ page }) => {
    await canvas.clickCanvas(500, 200);
    await expect(page.locator(SEL.allStates)).toHaveCount(2);

    await page.keyboard.press('Control+z');
    await expect(page.locator(SEL.allStates)).toHaveCount(1);

    await page.keyboard.press('Control+Shift+z');
    await expect(page.locator(SEL.allStates)).toHaveCount(2);
  });
});

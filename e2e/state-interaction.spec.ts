import { test, expect } from '@playwright/test';
import { CanvasHelper } from './helpers/canvas-helpers';
import { AutomatonBuilder } from './helpers/automaton-builder';
import { SEL } from './helpers/selectors';

test.describe('State Interaction', () => {
  let canvas: CanvasHelper;
  let builder: AutomatonBuilder;

  test.beforeEach(async ({ page }) => {
    canvas = new CanvasHelper(page);
    builder = new AutomatonBuilder(page);
    await page.goto('/');
    await page.waitForSelector(SEL.canvas);
  });

  test('clicking a state selects it and shows state properties', async ({ page }) => {
    const firstState = page.locator(SEL.allStates).first();
    await firstState.click();

    await expect(page.locator(SEL.stateProperties)).toBeVisible();
    await expect(page.locator(SEL.stateNameInput)).toBeVisible();
  });

  test('clicking empty canvas deselects all', async ({ page }) => {
    // Select a state first
    const firstState = page.locator(SEL.allStates).first();
    await firstState.click();
    await expect(page.locator(SEL.stateProperties)).toBeVisible();

    // Click empty area — this pans but also clears selection if no drag
    // Use a position far from q0
    await canvas.clickCanvas(700, 100);

    // After clicking empty canvas, a new state is created (existing behavior)
    // but the previous selection should be replaced
    const selection = await builder.getSelection();
    const automaton = await builder.getAutomaton();
    const q0Id = automaton.states[0]?.id;
    // The original q0 should no longer be selected
    const hasOldState = selection.some((s: any) => s.type === 'state' && s.id === q0Id);
    expect(hasOldState).toBe(false);
  });

  test('shift+click adds state to multi-selection', async ({ page }) => {
    // Create a second state
    await canvas.clickCanvas(500, 200);
    await expect(page.locator(SEL.allStates)).toHaveCount(2);

    // Click first state
    const states = page.locator(SEL.allStates);
    await states.first().click();

    // Shift+click second state
    await states.nth(1).click({ modifiers: ['Shift'] });

    const selection = await builder.getSelection();
    expect(selection).toHaveLength(2);
  });

  test('shift+click on selected state deselects it', async ({ page }) => {
    // Create second state
    await canvas.clickCanvas(500, 200);

    // Set both states as selected via store to avoid triggering pending transitions
    await page.evaluate(() => {
      const stores = (window as any).__stores__;
      const automaton = stores.automatonStore.getState().automaton;
      stores.editorStore.getState().setSelection(
        automaton.states.map((s: any) => ({ type: 'state', id: s.id }))
      );
    });

    let selection = await builder.getSelection();
    expect(selection).toHaveLength(2);

    // Shift+click first to deselect it
    const states = page.locator(SEL.allStates);
    await states.first().click({ modifiers: ['Shift'] });

    selection = await builder.getSelection();
    expect(selection).toHaveLength(1);
  });

  test('dragging a state moves it', async ({ page }) => {
    const automaton = await builder.getAutomaton();
    const q0 = automaton.states[0];
    const originalX = q0.position.x;
    const originalY = q0.position.y;

    // Get the state element and drag it
    const stateEl = page.locator(SEL.allStates).first();
    const box = await stateEl.boundingBox();
    if (!box) throw new Error('State not found');

    // Drag right and down
    await page.mouse.move(box.x + box.width / 2, box.y + box.height / 2);
    await page.mouse.down();
    await page.mouse.move(box.x + box.width / 2 + 100, box.y + box.height / 2 + 50, { steps: 10 });
    await page.mouse.up();

    const updatedAutomaton = await builder.getAutomaton();
    const updatedQ0 = updatedAutomaton.states[0];
    // Position should have changed
    expect(Math.abs(updatedQ0.position.x - originalX)).toBeGreaterThan(10);
    expect(Math.abs(updatedQ0.position.y - originalY)).toBeGreaterThan(10);
  });

  test('delete key removes selected state', async ({ page }) => {
    // Create a second state and select it
    await canvas.clickCanvas(500, 200);
    await expect(page.locator(SEL.allStates)).toHaveCount(2);

    const states = page.locator(SEL.allStates);
    await states.nth(1).click();

    await page.keyboard.press('Delete');

    await expect(page.locator(SEL.allStates)).toHaveCount(1);
  });

  test('backspace key also removes selected state', async ({ page }) => {
    await canvas.clickCanvas(500, 200);
    await expect(page.locator(SEL.allStates)).toHaveCount(2);

    const states = page.locator(SEL.allStates);
    await states.nth(1).click();

    await page.keyboard.press('Backspace');

    await expect(page.locator(SEL.allStates)).toHaveCount(1);
  });

  test('deleting a state removes its connected transitions', async ({ page }) => {
    // Build a DFA with transitions
    await builder.loadSimpleDFA();
    await page.waitForTimeout(100); // Let React re-render

    const automaton = await builder.getAutomaton();
    expect(automaton.transitions.length).toBeGreaterThan(0);

    // Select q1 (second state) and delete it
    const states = page.locator(SEL.allStates);
    await states.nth(1).click();
    await page.keyboard.press('Delete');

    const updatedAutomaton = await builder.getAutomaton();
    // All transitions involving the deleted state should be gone
    expect(updatedAutomaton.states).toHaveLength(1);
    // Only self-loop on q0 (if any) should remain; transitions to/from q1 are removed
    for (const t of updatedAutomaton.transitions) {
      expect(t.sourceId).not.toBe(automaton.states[1].id);
      expect(t.targetId).not.toBe(automaton.states[1].id);
    }
  });

  test('click transition selects it and shows transition properties', async ({ page }) => {
    // Build automaton with transitions
    await builder.loadSimpleDFA();
    await page.waitForTimeout(100);

    const transition = page.locator(SEL.allTransitions).first();
    await transition.click();

    await expect(page.locator(SEL.transitionProperties)).toBeVisible();
  });

  test('delete key removes selected transition', async ({ page }) => {
    await builder.loadSimpleDFA();
    await page.waitForTimeout(100);

    const initialCount = await canvas.transitionCount();
    expect(initialCount).toBeGreaterThan(0);

    const transition = page.locator(SEL.allTransitions).first();
    await transition.click();
    await page.keyboard.press('Delete');

    const newCount = await canvas.transitionCount();
    expect(newCount).toBe(initialCount - 1);
  });
});

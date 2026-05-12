import { test, expect } from '@playwright/test';
import { CanvasHelper } from './helpers/canvas-helpers';
import { AutomatonBuilder } from './helpers/automaton-builder';
import { SEL } from './helpers/selectors';

test.describe('State Creation', () => {
  let canvas: CanvasHelper;
  let builder: AutomatonBuilder;

  test.beforeEach(async ({ page }) => {
    canvas = new CanvasHelper(page);
    builder = new AutomatonBuilder(page);
    await page.goto('/');
    await page.waitForSelector(SEL.canvas);
  });

  test('app starts with one initial state (q0)', async () => {
    const count = await canvas.stateCount();
    expect(count).toBe(1);

    const automaton = await builder.getAutomaton();
    expect(automaton.states).toHaveLength(1);
    expect(automaton.states[0].name).toBe('q0');
    expect(automaton.states[0].isInitial).toBe(true);
  });

  test('clicking empty canvas creates a new state', async ({ page }) => {
    // The app starts with q0 at roughly (200, 250). Click far from it.
    await canvas.clickCanvas(500, 150);

    await expect(page.locator(SEL.allStates)).toHaveCount(2);

    const automaton = await builder.getAutomaton();
    expect(automaton.states).toHaveLength(2);
  });

  test('first state is initial, subsequent states are not', async () => {
    await canvas.clickCanvas(500, 150);
    await canvas.clickCanvas(500, 350);

    const automaton = await builder.getAutomaton();
    expect(automaton.states).toHaveLength(3);

    const initialStates = automaton.states.filter((s: any) => s.isInitial);
    expect(initialStates).toHaveLength(1);
    expect(initialStates[0].name).toBe('q0');
  });

  test('states get sequential names q0, q1, q2', async () => {
    await canvas.clickCanvas(400, 100);
    await canvas.clickCanvas(600, 100);

    const automaton = await builder.getAutomaton();
    const names = automaton.states.map((s: any) => s.name).sort();
    expect(names).toEqual(['q0', 'q1', 'q2']);
  });

  test('New State toolbar button then click canvas creates state', async ({ page }) => {
    await page.click(SEL.toolbarNewState);
    await canvas.clickCanvas(500, 200);

    await expect(page.locator(SEL.allStates)).toHaveCount(2);
  });

  test('clicking on an existing state does NOT create a new state', async ({ page }) => {
    // Click on q0 directly — this selects it but should not create a new state
    const firstState = page.locator(SEL.allStates).first();
    await firstState.click();

    // Wait a moment to ensure no async state creation
    await page.waitForTimeout(200);

    // Should still have only 1 state
    const automaton = await new (await import('./helpers/automaton-builder')).AutomatonBuilder(page).getAutomaton();
    expect(automaton.states).toHaveLength(1);
  });

  test('state appears visually in the SVG with circle and label', async ({ page }) => {
    await canvas.clickCanvas(500, 200);

    // Check that the new state has a circle and text label
    const newState = page.locator(SEL.allStates).nth(1);
    await expect(newState).toBeVisible();
    await expect(newState.locator('circle').first()).toBeVisible();
    // Use .first() since there may be multiple text elements (label + handle arrow)
    await expect(newState.locator('text').first()).toBeVisible();
  });

  test('multiple states can be created in succession', async ({ page }) => {
    await canvas.clickCanvas(400, 100);
    await canvas.clickCanvas(600, 100);
    await canvas.clickCanvas(400, 300);
    await canvas.clickCanvas(600, 300);

    await expect(page.locator(SEL.allStates)).toHaveCount(5); // q0 + 4 new
  });
});

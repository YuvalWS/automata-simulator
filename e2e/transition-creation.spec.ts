import { test, expect } from '@playwright/test';
import { CanvasHelper } from './helpers/canvas-helpers';
import { AutomatonBuilder } from './helpers/automaton-builder';
import { SEL } from './helpers/selectors';

test.describe('Transition Creation', () => {
  let canvas: CanvasHelper;
  let builder: AutomatonBuilder;

  test.beforeEach(async ({ page }) => {
    canvas = new CanvasHelper(page);
    builder = new AutomatonBuilder(page);
    await page.goto('/');
    await page.waitForSelector(SEL.canvas);
    // Create a second state so we have q0 and q1
    await canvas.clickCanvas(500, 250);
    await expect(page.locator(SEL.allStates)).toHaveCount(2);
  });

  test('click state A then state B opens symbol modal', async ({ page }) => {
    const states = page.locator(SEL.allStates);
    await states.first().click();
    await states.nth(1).click();

    await expect(page.locator(SEL.symbolModalOverlay)).toBeVisible();
  });

  test('entering symbols and confirming creates a transition', async ({ page }) => {
    const states = page.locator(SEL.allStates);
    await states.first().click();
    await states.nth(1).click();

    await expect(page.locator(SEL.symbolModalInput)).toBeVisible();
    await page.locator(SEL.symbolModalInput).fill('a');
    await page.locator(SEL.symbolModalConfirm).click();

    // Transition should appear
    await expect(page.locator(SEL.allTransitions)).toHaveCount(1);

    const automaton = await builder.getAutomaton();
    expect(automaton.transitions).toHaveLength(1);
    expect(automaton.transitions[0].symbols).toContain('a');
  });

  test('pressing Enter in modal confirms the transition', async ({ page }) => {
    const states = page.locator(SEL.allStates);
    await states.first().click();
    await states.nth(1).click();

    await page.locator(SEL.symbolModalInput).fill('b');
    await page.keyboard.press('Enter');

    await expect(page.locator(SEL.allTransitions)).toHaveCount(1);
  });

  test('double-click state opens self-loop modal', async ({ page }) => {
    const firstState = page.locator(SEL.allStates).first();
    await firstState.dblclick();

    await expect(page.locator(SEL.symbolModalOverlay)).toBeVisible();
  });

  test('self-loop transition is created after confirming', async ({ page }) => {
    const firstState = page.locator(SEL.allStates).first();
    await firstState.dblclick();

    await page.locator(SEL.symbolModalInput).fill('a');
    await page.locator(SEL.symbolModalConfirm).click();

    const automaton = await builder.getAutomaton();
    expect(automaton.transitions).toHaveLength(1);
    expect(automaton.transitions[0].sourceId).toBe(automaton.transitions[0].targetId);
  });

  test('Escape in symbol modal cancels without creating transition', async ({ page }) => {
    const states = page.locator(SEL.allStates);
    await states.first().click();
    await states.nth(1).click();

    await expect(page.locator(SEL.symbolModalOverlay)).toBeVisible();
    await page.keyboard.press('Escape');

    await expect(page.locator(SEL.symbolModalOverlay)).not.toBeVisible();
    await expect(page.locator(SEL.allTransitions)).toHaveCount(0);
  });

  test('comma-separated symbols create multi-symbol transition', async ({ page }) => {
    const states = page.locator(SEL.allStates);
    await states.first().click();
    await states.nth(1).click();

    await page.locator(SEL.symbolModalInput).fill('a, b, c');
    await page.locator(SEL.symbolModalConfirm).click();

    const automaton = await builder.getAutomaton();
    expect(automaton.transitions[0].symbols).toEqual(['a', 'b', 'c']);
  });

  test('empty input does not create transition', async ({ page }) => {
    const states = page.locator(SEL.allStates);
    await states.first().click();
    await states.nth(1).click();

    await page.locator(SEL.symbolModalInput).fill('');
    await page.locator(SEL.symbolModalConfirm).click();

    // Modal should still be visible since empty input is rejected
    // or transition count should be 0
    const automaton = await builder.getAutomaton();
    expect(automaton.transitions).toHaveLength(0);
  });

  test('clicking modal overlay cancels', async ({ page }) => {
    const states = page.locator(SEL.allStates);
    await states.first().click();
    await states.nth(1).click();

    await expect(page.locator(SEL.symbolModalOverlay)).toBeVisible();
    // Click the overlay (not the modal content)
    await page.locator(SEL.symbolModalOverlay).click({ position: { x: 10, y: 10 } });

    await expect(page.locator(SEL.symbolModalOverlay)).not.toBeVisible();
    await expect(page.locator(SEL.allTransitions)).toHaveCount(0);
  });
});

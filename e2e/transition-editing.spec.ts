import { test, expect } from '@playwright/test';
import { CanvasHelper } from './helpers/canvas-helpers';
import { AutomatonBuilder } from './helpers/automaton-builder';
import { SEL } from './helpers/selectors';

test.describe('Transition Editing', () => {
  let canvas: CanvasHelper;
  let builder: AutomatonBuilder;

  test.beforeEach(async ({ page }) => {
    canvas = new CanvasHelper(page);
    builder = new AutomatonBuilder(page);
    await page.goto('/');
    await page.waitForSelector(SEL.canvas);
    await builder.loadSimpleDFA();
    await page.waitForTimeout(100);
  });

  test('double-click transition opens edit modal with existing symbols', async ({ page }) => {
    const transition = page.locator(SEL.allTransitions).first();
    await transition.dblclick();

    await expect(page.locator(SEL.symbolModalOverlay)).toBeVisible();
    const inputValue = await page.locator(SEL.symbolModalInput).inputValue();
    expect(inputValue.length).toBeGreaterThan(0);
  });

  test('editing transition symbols updates the transition', async ({ page }) => {
    const automaton = await builder.getAutomaton();
    const firstTransition = automaton.transitions[0];

    const transition = page.locator(SEL.allTransitions).first();
    await transition.dblclick();

    await page.locator(SEL.symbolModalInput).fill('x, y');
    await page.locator(SEL.symbolModalConfirm).click();

    const updated = await builder.getAutomaton();
    const updatedTransition = updated.transitions.find((t: any) => t.id === firstTransition.id);
    expect(updatedTransition?.symbols).toEqual(['x', 'y']);
  });

  test('clicking transition selects it and shows properties panel', async ({ page }) => {
    const transition = page.locator(SEL.allTransitions).first();
    await transition.click();

    await expect(page.locator(SEL.transitionProperties)).toBeVisible();
    await expect(page.locator(SEL.transitionSymbolsInput)).toBeVisible();
  });
});

import { test, expect } from '@playwright/test';
import { CanvasHelper } from './helpers/canvas-helpers';
import { AutomatonBuilder } from './helpers/automaton-builder';
import { SEL } from './helpers/selectors';

test.describe('DFA/NFA Switching', () => {
  let canvas: CanvasHelper;
  let builder: AutomatonBuilder;

  test.beforeEach(async ({ page }) => {
    canvas = new CanvasHelper(page);
    builder = new AutomatonBuilder(page);
    await page.goto('/');
    await page.waitForSelector(SEL.canvas);
  });

  test('default type is DFA', async ({ page }) => {
    const automaton = await builder.getAutomaton();
    expect(automaton.type).toBe('DFA');

    // Badge should show DFA
    await expect(page.locator('.automaton-type-badge')).toHaveText('DFA');
  });

  test('switching to NFA via properties panel', async ({ page }) => {
    await page.locator(SEL.automatonTypeSelect).selectOption('NFA');

    const automaton = await builder.getAutomaton();
    expect(automaton.type).toBe('NFA');
    await expect(page.locator('.automaton-type-badge')).toHaveText('NFA');
  });

  test('in DFA mode, epsilon button in symbol modal is disabled', async ({ page }) => {
    // Create second state and open transition modal
    await canvas.clickCanvas(500, 250);
    const states = page.locator(SEL.allStates);
    await states.first().click();
    await states.nth(1).click();

    await expect(page.locator(SEL.symbolModalOverlay)).toBeVisible();
    await expect(page.locator(SEL.symbolModalEpsilon)).toBeDisabled();
  });

  test('in NFA mode, epsilon button in symbol modal is enabled', async ({ page }) => {
    // Switch to NFA
    await page.locator(SEL.automatonTypeSelect).selectOption('NFA');

    // Create second state and open transition modal
    await canvas.clickCanvas(500, 250);
    const states = page.locator(SEL.allStates);
    await states.first().click();
    await states.nth(1).click();

    await expect(page.locator(SEL.symbolModalOverlay)).toBeVisible();
    await expect(page.locator(SEL.symbolModalEpsilon)).toBeEnabled();
  });

  test('epsilon button adds epsilon symbol to input', async ({ page }) => {
    await page.locator(SEL.automatonTypeSelect).selectOption('NFA');

    await canvas.clickCanvas(500, 250);
    const states = page.locator(SEL.allStates);
    await states.first().click();
    await states.nth(1).click();

    await page.locator(SEL.symbolModalEpsilon).click();
    const value = await page.locator(SEL.symbolModalInput).inputValue();
    expect(value).toContain('ε');
  });

  test('switching back from NFA to DFA', async ({ page }) => {
    await page.locator(SEL.automatonTypeSelect).selectOption('NFA');
    expect((await builder.getAutomaton()).type).toBe('NFA');

    await page.locator(SEL.automatonTypeSelect).selectOption('DFA');
    expect((await builder.getAutomaton()).type).toBe('DFA');
  });

  test('switching DFA to NFA preserves existing transitions', async ({ page }) => {
    // Load a DFA with transitions
    await builder.loadSimpleDFA();
    await page.waitForTimeout(100);

    const beforeTransitions = (await builder.getAutomaton()).transitions.length;
    const beforeStates = (await builder.getAutomaton()).states.length;

    // Switch to NFA
    await page.locator(SEL.automatonTypeSelect).selectOption('NFA');
    await page.waitForTimeout(50);

    const afterTransitions = (await builder.getAutomaton()).transitions.length;
    const afterStates = (await builder.getAutomaton()).states.length;

    // All states and transitions should be preserved
    expect(afterStates).toBe(beforeStates);
    expect(afterTransitions).toBe(beforeTransitions);
  });

  test('switching NFA to DFA preserves states', async ({ page }) => {
    await builder.loadNFAWithEpsilon();
    await page.waitForTimeout(100);

    const beforeStates = (await builder.getAutomaton()).states.length;

    await page.locator(SEL.automatonTypeSelect).selectOption('DFA');
    await page.waitForTimeout(50);

    const afterStates = (await builder.getAutomaton()).states.length;
    expect(afterStates).toBe(beforeStates);
    expect((await builder.getAutomaton()).type).toBe('DFA');
  });

  test('type change is reflected in properties panel badge', async ({ page }) => {
    // Default is DFA
    await expect(page.locator('.automaton-type-badge')).toHaveText('DFA');

    // Switch to NFA
    await page.locator(SEL.automatonTypeSelect).selectOption('NFA');
    await expect(page.locator('.automaton-type-badge')).toHaveText('NFA');

    // Switch back
    await page.locator(SEL.automatonTypeSelect).selectOption('DFA');
    await expect(page.locator('.automaton-type-badge')).toHaveText('DFA');
  });
});

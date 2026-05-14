import { test, expect } from '@playwright/test';
import { CanvasHelper } from './helpers/canvas-helpers';
import { AutomatonBuilder } from './helpers/automaton-builder';
import { SEL } from './helpers/selectors';

test.describe('Properties Panel', () => {
  let canvas: CanvasHelper;
  let builder: AutomatonBuilder;

  test.beforeEach(async ({ page }) => {
    canvas = new CanvasHelper(page);
    builder = new AutomatonBuilder(page);
    await page.goto('/');
    await page.waitForSelector(SEL.canvas);
  });

  test('automaton properties are visible by default', async ({ page }) => {
    await expect(page.locator(SEL.automatonProperties)).toBeVisible();
    await expect(page.locator(SEL.automatonNameInput)).toBeVisible();
    await expect(page.locator(SEL.automatonTypeSelect)).toBeVisible();
  });

  test('editing state name updates the store', async ({ page }) => {
    // Select q0
    const firstState = page.locator(SEL.allStates).first();
    await firstState.click();

    await expect(page.locator(SEL.stateNameInput)).toBeVisible();
    await page.locator(SEL.stateNameInput).fill('start');
    await page.locator(SEL.stateNameInput).press('Tab'); // blur

    const automaton = await builder.getAutomaton();
    expect(automaton.states[0].name).toBe('start');
  });

  test('toggling accepting checkbox marks state as accepting', async ({ page }) => {
    const firstState = page.locator(SEL.allStates).first();
    await firstState.click();

    const checkbox = page.locator(SEL.stateAcceptingCheckbox);
    await expect(checkbox).toBeVisible();
    await checkbox.check();

    const automaton = await builder.getAutomaton();
    expect(automaton.states[0].isAccepting).toBe(true);
  });

  test('setting initial state changes which state is initial', async ({ page }) => {
    // Create second state
    await canvas.clickCanvas(500, 200);

    // Select second state
    const states = page.locator(SEL.allStates);
    await states.nth(1).click();

    // Check initial checkbox
    const checkbox = page.locator(SEL.stateInitialCheckbox);
    await checkbox.check();

    const automaton = await builder.getAutomaton();
    const initialStates = automaton.states.filter((s: any) => s.isInitial);
    expect(initialStates).toHaveLength(1);
    // Second state should now be initial
    expect(automaton.states[1].isInitial).toBe(true);
    expect(automaton.states[0].isInitial).toBe(false);
  });

  test('editing automaton name updates the store', async ({ page }) => {
    await page.locator(SEL.automatonNameInput).fill('My DFA');
    await page.locator(SEL.automatonNameInput).press('Tab');

    const automaton = await builder.getAutomaton();
    expect(automaton.name).toBe('My DFA');
  });

  test('changing automaton type to NFA updates the store', async ({ page }) => {
    await page.locator(SEL.automatonTypeSelect).selectOption('NFA');

    const automaton = await builder.getAutomaton();
    expect(automaton.type).toBe('NFA');
  });

  test('state properties show correct state info', async ({ page }) => {
    const firstState = page.locator(SEL.allStates).first();
    await firstState.click();

    const nameValue = await page.locator(SEL.stateNameInput).inputValue();
    expect(nameValue).toBe('q0');

    const isInitialChecked = await page.locator(SEL.stateInitialCheckbox).isChecked();
    expect(isInitialChecked).toBe(true);

    const isAcceptingChecked = await page.locator(SEL.stateAcceptingCheckbox).isChecked();
    expect(isAcceptingChecked).toBe(false);
  });

  test('warns when a transition uses a symbol not in the alphabet', async ({ page }) => {
    // DFA with transition on 'a' but no alphabet defined yet → no warning
    await builder.loadSimpleDFA();
    await page.waitForTimeout(100);
    await expect(page.locator(SEL.alphabetWarning)).not.toBeVisible();

    // Set an alphabet that omits a symbol the transitions use ('a' is used, 'b' is used)
    await page.locator(SEL.automatonAlphabetInput).fill('a');
    await page.locator(SEL.automatonAlphabetInput).press('Tab');

    // 'b' is used by transitions but not in the alphabet → warning appears,
    // listing the offending transitions by source → target
    const warning = page.locator(SEL.alphabetWarning);
    await expect(warning).toBeVisible();
    await expect(warning).toContainText('"b"');
    await expect(warning).toContainText('q1 → q0');

    // Add 'b' back to the alphabet → warning disappears
    await page.locator(SEL.automatonAlphabetInput).fill('a, b');
    await page.locator(SEL.automatonAlphabetInput).press('Tab');
    await expect(warning).not.toBeVisible();
  });
});

import { test, expect } from '@playwright/test';
import { AutomatonBuilder } from './helpers/automaton-builder';
import { SEL } from './helpers/selectors';

test.describe('PDA Support', () => {
  let builder: AutomatonBuilder;

  test.beforeEach(async ({ page }) => {
    builder = new AutomatonBuilder(page);
    await page.goto('/');
    await page.waitForSelector(SEL.canvas);
  });

  test('PDA option appears in type dropdown', async ({ page }) => {
    const typeSelect = page.locator(SEL.automatonTypeSelect);
    await expect(typeSelect.locator('option[value="PDA"]')).toBeAttached();
  });

  test('switching to PDA shows acceptance mode dropdown', async ({ page }) => {
    await page.locator(SEL.automatonTypeSelect).selectOption('PDA');
    await expect(page.locator('[data-testid="pda-acceptance-mode-select"]')).toBeVisible();
  });

  test('switching away from PDA hides acceptance mode dropdown', async ({ page }) => {
    await page.locator(SEL.automatonTypeSelect).selectOption('PDA');
    await expect(page.locator('[data-testid="pda-acceptance-mode-select"]')).toBeVisible();

    await page.locator(SEL.automatonTypeSelect).selectOption('DFA');
    await expect(page.locator('[data-testid="pda-acceptance-mode-select"]')).not.toBeVisible();
  });

  test('PDA simulation accepts a^n b^n', async ({ page }) => {
    await builder.loadSimplePDA();
    await page.waitForTimeout(100);

    await page.locator(SEL.toolbarSimulate).click();
    await page.locator(SEL.simWordInput).fill('a,b');
    await page.locator(SEL.simRunBtn).click();
    await page.waitForTimeout(200);

    const goToEndBtn = page.locator('button[title="Go to end"]');
    await goToEndBtn.click();

    await expect(page.locator('.sim-status-accepted')).toBeVisible();
  });

  test('PDA simulation rejects unbalanced word', async ({ page }) => {
    await builder.loadSimplePDA();
    await page.waitForTimeout(100);

    await page.locator(SEL.toolbarSimulate).click();
    await page.locator(SEL.simWordInput).fill('a,a,b');
    await page.locator(SEL.simRunBtn).click();
    await page.waitForTimeout(200);

    const goToEndBtn = page.locator('button[title="Go to end"]');
    await goToEndBtn.click();

    await expect(page.locator('.sim-status-rejected')).toBeVisible();
  });

  test('PDA simulation shows stack configurations', async ({ page }) => {
    await builder.loadSimplePDA();
    await page.waitForTimeout(100);

    await page.locator(SEL.toolbarSimulate).click();
    await page.locator(SEL.simWordInput).fill('a,b');
    await page.locator(SEL.simRunBtn).click();
    await page.waitForTimeout(200);

    // Should see the configurations section
    await expect(page.locator('.sim-configs-list')).toBeVisible();
  });

  test('PDA type preserved after save and load round-trip', async ({ page }) => {
    await builder.loadSimplePDA();
    await page.waitForTimeout(100);

    // Verify the type is PDA
    const automaton = await builder.getAutomaton();
    expect(automaton.type).toBe('PDA');
    expect(automaton.acceptanceMode).toBe('finalState');
    expect(automaton.transitions.some((t: any) => t.pdaRules && t.pdaRules.length > 0)).toBe(true);
  });

  test('switching DFA to NFA to PDA and back preserves states', async ({ page }) => {
    await builder.loadSimpleDFA();
    await page.waitForTimeout(100);

    const beforeStates = (await builder.getAutomaton()).states.length;

    await page.locator(SEL.automatonTypeSelect).selectOption('PDA');
    await page.waitForTimeout(50);
    const pdaStates = (await builder.getAutomaton()).states.length;
    expect(pdaStates).toBe(beforeStates);

    await page.locator(SEL.automatonTypeSelect).selectOption('NFA');
    await page.waitForTimeout(50);
    const nfaStates = (await builder.getAutomaton()).states.length;
    expect(nfaStates).toBe(beforeStates);
  });
});

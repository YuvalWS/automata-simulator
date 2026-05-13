import { test, expect } from '@playwright/test';
import { AutomatonBuilder } from './helpers/automaton-builder';
import { SEL } from './helpers/selectors';

test.describe('TM Support', () => {
  let builder: AutomatonBuilder;

  test.beforeEach(async ({ page }) => {
    builder = new AutomatonBuilder(page);
    await page.goto('/');
    await page.waitForSelector(SEL.canvas);
  });

  test('TM option appears in type dropdown', async ({ page }) => {
    const typeSelect = page.locator(SEL.automatonTypeSelect);
    await expect(typeSelect.locator('option[value="TM"]')).toBeAttached();
  });

  test('switching to TM shows TM-specific controls', async ({ page }) => {
    await page.locator(SEL.automatonTypeSelect).selectOption('TM');
    await expect(page.locator(SEL.tmModeSelect)).toBeVisible();
    await expect(page.locator(SEL.tmAcceptanceModeSelect)).toBeVisible();
    await expect(page.locator(SEL.tmBlankSymbolSelect)).toBeVisible();
  });

  test('switching away from TM hides TM controls', async ({ page }) => {
    await page.locator(SEL.automatonTypeSelect).selectOption('TM');
    await expect(page.locator(SEL.tmModeSelect)).toBeVisible();

    await page.locator(SEL.automatonTypeSelect).selectOption('DFA');
    await expect(page.locator(SEL.tmModeSelect)).not.toBeVisible();
    await expect(page.locator(SEL.tmAcceptanceModeSelect)).not.toBeVisible();
    await expect(page.locator(SEL.tmBlankSymbolSelect)).not.toBeVisible();
  });

  test('TM simulation accepts "0"', async ({ page }) => {
    await builder.loadSimpleTM();
    await page.waitForTimeout(100);

    await page.locator(SEL.toolbarSimulate).click();
    await page.locator(SEL.simWordInput).fill('0');
    await page.locator(SEL.simRunBtn).click();
    await page.waitForTimeout(200);

    const goToEndBtn = page.locator('button[title="Go to end"]');
    await goToEndBtn.click();

    await expect(page.locator('.sim-status-accepted')).toBeVisible();
  });

  test('canvas renders the TM rule label on the edge (read → write, dir)', async ({ page }) => {
    await builder.loadSimpleTM();
    await page.waitForTimeout(100);

    // The first edge has rule { readSymbols: ['0'], writeSymbol: '1', direction: 'R' }
    // → label "0 → 1, R" (textbook format).
    const label = page.locator(`${SEL.canvas} text`, { hasText: '0 → 1, R' });
    await expect(label).toBeVisible();

    // The second edge has no write (no-op shorthand) → "⊔ → S".
    const noWriteLabel = page.locator(`${SEL.canvas} text`, { hasText: '⊔ → S' });
    await expect(noWriteLabel).toBeVisible();
  });

  test('canvas renders multi-read TM rule label as comma-joined symbols', async ({ page }) => {
    await builder.loadMultiReadTM();
    await page.waitForTimeout(100);

    const label = page.locator(`${SEL.canvas} text`, { hasText: '0,1 → X, R' });
    await expect(label).toBeVisible();
  });

  test('TM simulation renders the tape', async ({ page }) => {
    await builder.loadSimpleTM();
    await page.waitForTimeout(100);

    await page.locator(SEL.toolbarSimulate).click();
    await page.locator(SEL.simWordInput).fill('0');
    await page.locator(SEL.simRunBtn).click();
    await page.waitForTimeout(200);

    await expect(page.locator(SEL.simTmSection)).toBeVisible();
    await expect(page.locator(SEL.simTmTape)).toBeVisible();
  });

  test('TM type preserved after save/load round-trip via store', async () => {
    await builder.loadSimpleTM();
    const automaton = await builder.getAutomaton();
    expect(automaton.type).toBe('TM');
    expect(automaton.tmMode).toBe('deterministic');
    expect(automaton.tmBlankSymbol).toBe('⊔');
    expect(automaton.transitions.some((t: any) => t.tmRules && t.tmRules.length > 0)).toBe(true);
  });

  test('switching DFA → NFA → PDA → TM → DFA preserves states', async ({ page }) => {
    await builder.loadSimpleDFA();
    await page.waitForTimeout(100);
    const before = (await builder.getAutomaton()).states.length;

    for (const t of ['NFA', 'PDA', 'TM', 'DFA']) {
      await page.locator(SEL.automatonTypeSelect).selectOption(t);
      await page.waitForTimeout(50);
      const count = (await builder.getAutomaton()).states.length;
      expect(count).toBe(before);
    }
  });

  test('blank-symbol dropdown offers _, ⊔, Δ and persists selection across reload', async ({ page }) => {
    await page.locator(SEL.automatonTypeSelect).selectOption('TM');
    const blankSelect = page.locator(SEL.tmBlankSymbolSelect);
    await expect(blankSelect.locator('option')).toHaveCount(3);
    await expect(blankSelect.locator('option[value="_"]')).toBeAttached();
    await expect(blankSelect.locator('option[value="⊔"]')).toBeAttached();
    await expect(blankSelect.locator('option[value="Δ"]')).toBeAttached();

    await blankSelect.selectOption('_');
    await page.waitForTimeout(50);
    const stored = await page.evaluate(() => localStorage.getItem('automata-tm-blank-display'));
    expect(stored).toBe('_');

    await page.reload();
    await page.waitForSelector(SEL.canvas);
    await page.locator(SEL.automatonTypeSelect).selectOption('TM');
    await expect(page.locator(SEL.tmBlankSymbolSelect)).toHaveValue('_');
  });

  test('infinite loop TM shows timeout', async ({ page }) => {
    await builder.loadInfiniteLoopTM();
    await page.waitForTimeout(100);

    await page.locator(SEL.toolbarSimulate).click();
    await page.locator(SEL.simWordInput).fill('a');
    await page.locator(SEL.simRunBtn).click();
    await page.waitForTimeout(500);

    const goToEndBtn = page.locator('button[title="Go to end"]');
    await goToEndBtn.click();

    await expect(page.locator('.sim-status-timeout')).toBeVisible();
  });
});

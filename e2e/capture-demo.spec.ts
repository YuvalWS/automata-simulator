/**
 * Playwright script to capture demo screenshots and video frames for README.
 * Run: npx playwright test scripts/capture-demo.ts --project=chromium
 */
import { test } from '@playwright/test';
import type { Page } from '@playwright/test';
import path from 'path';
import fs from 'fs';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const OUTPUT_DIR = path.resolve(__dirname, '../docs/demo');

// Ensure output dirs exist
fs.mkdirSync(path.join(OUTPUT_DIR, 'frames'), { recursive: true });

test.describe('Demo asset capture', () => {
  test.beforeEach(async ({ page }) => {
    await page.setViewportSize({ width: 1280, height: 720 });
    await page.goto('/');
    await page.waitForSelector('[data-testid="automata-canvas"]');
    // Dismiss help panel if visible
    const helpPanel = page.locator('.shortcuts-panel');
    if (await helpPanel.isVisible().catch(() => false)) {
      await page.locator('.shortcuts-close').click();
    }
    await page.waitForTimeout(300);
  });

  test('01 - hero screenshot light mode', async ({ page }) => {
    await buildShowcaseAutomaton(page);
    await page.waitForTimeout(600);
    await page.screenshot({
      path: path.join(OUTPUT_DIR, 'hero-light.png'),
    });
  });

  test('02 - hero screenshot dark mode', async ({ page }) => {
    await page.locator('button[title="Toggle dark/light mode"]').click();
    await page.waitForTimeout(300);
    await buildShowcaseAutomaton(page);
    await page.waitForTimeout(600);
    await page.screenshot({
      path: path.join(OUTPUT_DIR, 'hero-dark.png'),
    });
  });

  test('03 - simulation running', async ({ page }) => {
    await buildShowcaseAutomaton(page);
    await page.waitForTimeout(300);

    // Enter simulation
    await page.locator('.toolbar-simulate').click();
    await page.waitForTimeout(300);

    // Enter word and run
    await page.locator('.sim-word-input').fill('a,b,a');
    await page.waitForTimeout(200);

    // Click Run button
    await page.locator('.sim-btn-primary').click();
    await page.waitForTimeout(600);

    await page.screenshot({
      path: path.join(OUTPUT_DIR, 'simulation.png'),
    });
  });

  test('04 - batch simulation results', async ({ page }) => {
    await buildShowcaseAutomaton(page);
    await page.waitForTimeout(300);

    // Enter simulation
    await page.locator('.toolbar-simulate').click();
    await page.waitForTimeout(300);

    // Switch to batch mode
    await page.locator('.sim-mode-toggle').click();
    await page.waitForTimeout(200);

    // Enter batch words
    const batchInput = page.locator('.sim-batch-input');
    await batchInput.fill('a,b\na,b,a,b\nb,a\na,a,b\nb,b\na\nb\na,b,a');
    await page.waitForTimeout(200);

    // Run batch
    await page.locator('.sim-btn-primary').click();
    await page.waitForTimeout(500);

    await page.screenshot({
      path: path.join(OUTPUT_DIR, 'batch-simulation.png'),
    });
  });

  test('05 - simulation video frames', async ({ page }) => {
    await buildShowcaseAutomaton(page);
    await page.waitForTimeout(300);

    // Enter simulation
    await page.locator('.toolbar-simulate').click();
    await page.waitForTimeout(400);

    // Enter word
    await page.locator('.sim-word-input').fill('a,b,a,b');
    await page.waitForTimeout(300);

    // Frame 0: before starting (word entered, ready to run)
    await page.screenshot({
      path: path.join(OUTPUT_DIR, 'frames/frame-000.png'),
    });

    // Click Run to start the trace, then immediately stop auto-run
    // so we can step manually without double-advancing
    await page.locator('.sim-btn-primary').click();
    await page.waitForTimeout(100);
    await page.evaluate(() => {
      const stores = (window as any).__stores__;
      stores.simulationStore.getState().stopAutoRun();
      // Reset to step 0 since auto-run may have advanced
      stores.simulationStore.setState({ currentStep: 0 });
    });
    await page.waitForTimeout(300);

    // Capture each step: step 0 through step 4 (word "a,b,a,b" = 4 symbols)
    for (let i = 0; i <= 4; i++) {
      await page.screenshot({
        path: path.join(OUTPUT_DIR, `frames/frame-${String(i + 1).padStart(3, '0')}.png`),
      });
      if (i < 4) {
        await page.keyboard.press('ArrowRight');
        await page.waitForTimeout(400);
      }
    }

    // Extra frame at the end showing final "Accepted" result
    await page.waitForTimeout(500);
    await page.screenshot({
      path: path.join(OUTPUT_DIR, 'frames/frame-006.png'),
    });
  });
});

/**
 * Build a 3-state DFA that recognizes strings ending in "ab".
 * Triangle layout: q0 top-left, q1 top-right, q2 bottom-center.
 * This avoids overlapping back-transitions that occur in a horizontal layout.
 */
async function buildShowcaseAutomaton(page: Page) {
  await page.evaluate(() => {
    const stores = (window as any).__stores__;
    if (!stores) throw new Error('Stores not exposed');
    const store = stores.automatonStore.getState();

    store.newAutomaton('Ends with "ab"');

    const automaton = stores.automatonStore.getState().automaton;
    const q0 = automaton.states[0]; // initial state

    // Triangle layout — q0 top-left, q1 top-right, q2 bottom-center
    store.moveState(q0.id, { x: 300, y: 240 });
    const q1 = store.addState({ x: 600, y: 240 });
    const q2 = store.addState({ x: 450, y: 430 });

    // Update names
    store.updateState(q0.id, { name: 'q0' });
    store.updateState(q1.id, { name: 'q1' });
    store.updateState(q2.id, { name: 'q2' });

    // q2 is accepting
    store.toggleAccepting(q2.id);

    // Set alphabet to dismiss the "Alphabet is empty" warning
    store.setAlphabet(['a', 'b']);

    // DFA transitions for "ends with ab":
    store.addTransition(q0.id, q1.id, ['a']);   // saw 'a'
    store.addTransition(q0.id, q0.id, ['b']);   // reset
    store.addTransition(q1.id, q1.id, ['a']);   // another 'a', stay
    store.addTransition(q1.id, q2.id, ['b']);   // saw 'ab'!
    store.addTransition(q2.id, q1.id, ['a']);   // saw 'a' again
    store.addTransition(q2.id, q0.id, ['b']);   // reset

    // Set a nice viewport
    store.setViewport({ x: 50, y: 60, zoom: 1.1 });

    // Clear selection so nothing looks highlighted
    stores.editorStore.getState().clearSelection();
  });
}

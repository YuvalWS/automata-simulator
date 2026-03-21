import { test, expect } from '@playwright/test';
import { CanvasHelper } from './helpers/canvas-helpers';
import { AutomatonBuilder } from './helpers/automaton-builder';
import { SEL } from './helpers/selectors';

test.describe('Tabs', () => {
  let canvas: CanvasHelper;
  let builder: AutomatonBuilder;

  test.beforeEach(async ({ page }) => {
    canvas = new CanvasHelper(page);
    builder = new AutomatonBuilder(page);
    await page.goto('/');
    await page.waitForSelector(SEL.canvas);
  });

  test('app starts with one tab', async ({ page }) => {
    await expect(page.locator(SEL.allTabs)).toHaveCount(1);
    await expect(page.locator(SEL.activeTab)).toHaveCount(1);
  });

  test('tab bar and new tab button are visible', async ({ page }) => {
    await expect(page.locator(SEL.tabBar)).toBeVisible();
    await expect(page.locator(SEL.tabNewBtn)).toBeVisible();
  });

  test('clicking + button creates a new tab', async ({ page }) => {
    await page.locator(SEL.tabNewBtn).click();
    await expect(page.locator(SEL.allTabs)).toHaveCount(2);
    // The new tab should be active
    const activeTabs = page.locator(SEL.activeTab);
    await expect(activeTabs).toHaveCount(1);
  });

  test('Ctrl+T creates a new tab', async ({ page }) => {
    await page.keyboard.press('Control+t');
    await expect(page.locator(SEL.allTabs)).toHaveCount(2);
  });

  test('new tab starts with a fresh automaton (q0 only)', async ({ page }) => {
    // Build something in the first tab
    await canvas.clickCanvas(500, 150);
    await expect(page.locator(SEL.allStates)).toHaveCount(2);

    // Create a new tab
    await page.locator(SEL.tabNewBtn).click();

    // Should have only q0 in the new tab
    await expect(page.locator(SEL.allStates)).toHaveCount(1);
    const automaton = await builder.getAutomaton();
    expect(automaton.states).toHaveLength(1);
    expect(automaton.states[0].name).toBe('q0');
  });

  test('switching tabs restores state', async ({ page }) => {
    // First tab: add a state so we have q0 + q1
    await canvas.clickCanvas(500, 150);
    await expect(page.locator(SEL.allStates)).toHaveCount(2);

    // Create a second tab (should have only q0)
    await page.locator(SEL.tabNewBtn).click();
    await expect(page.locator(SEL.allStates)).toHaveCount(1);

    // Switch back to first tab
    const tabs = page.locator(SEL.allTabs);
    await tabs.first().click();

    // First tab should still have 2 states
    await expect(page.locator(SEL.allStates)).toHaveCount(2);
  });

  test('each tab has independent automaton state', async ({ page }) => {
    // First tab: rename to "DFA1"
    await page.evaluate(() => {
      const stores = (window as any).__stores__;
      stores.automatonStore.getState().setName('DFA1');
    });

    // Create second tab, rename to "DFA2"
    await page.locator(SEL.tabNewBtn).click();
    await page.evaluate(() => {
      const stores = (window as any).__stores__;
      stores.automatonStore.getState().setName('DFA2');
    });

    // Verify second tab shows DFA2
    let automaton = await builder.getAutomaton();
    expect(automaton.name).toBe('DFA2');

    // Switch to first tab, should show DFA1
    const tabs = page.locator(SEL.allTabs);
    await tabs.first().click();
    automaton = await builder.getAutomaton();
    expect(automaton.name).toBe('DFA1');
  });

  test('closing a tab switches to adjacent tab', async ({ page }) => {
    // Create a second tab
    await page.locator(SEL.tabNewBtn).click();
    await expect(page.locator(SEL.allTabs)).toHaveCount(2);

    // Close the active (second) tab via the close button
    const activeTab = page.locator(SEL.activeTab);
    await activeTab.hover();
    await activeTab.locator(SEL.tabCloseBtn).click();

    // Should be back to one tab
    await expect(page.locator(SEL.allTabs)).toHaveCount(1);
  });

  test('closing the last tab creates a fresh empty tab', async ({ page }) => {
    // Close the only tab
    const tab = page.locator(SEL.allTabs).first();
    await tab.hover();
    await tab.locator(SEL.tabCloseBtn).click();

    // Should still have 1 tab with a fresh automaton
    await expect(page.locator(SEL.allTabs)).toHaveCount(1);
    await expect(page.locator(SEL.allStates)).toHaveCount(1);
  });

  test('Ctrl+W closes the active tab', async ({ page }) => {
    await page.locator(SEL.tabNewBtn).click();
    await expect(page.locator(SEL.allTabs)).toHaveCount(2);

    await page.keyboard.press('Control+w');
    await expect(page.locator(SEL.allTabs)).toHaveCount(1);
  });

  test('Ctrl+PageDown and Ctrl+PageUp switch tabs', async ({ page }) => {
    // Set up first tab name
    await page.evaluate(() => {
      const stores = (window as any).__stores__;
      stores.automatonStore.getState().setName('Tab1');
    });

    // Create second tab
    await page.locator(SEL.tabNewBtn).click();
    await page.evaluate(() => {
      const stores = (window as any).__stores__;
      stores.automatonStore.getState().setName('Tab2');
    });

    // Currently on Tab2. Switch to prev (Tab1).
    await page.keyboard.press('Control+PageUp');
    let automaton = await builder.getAutomaton();
    expect(automaton.name).toBe('Tab1');

    // Switch to next (Tab2)
    await page.keyboard.press('Control+PageDown');
    automaton = await builder.getAutomaton();
    expect(automaton.name).toBe('Tab2');
  });

  test('tab shows automaton name', async ({ page }) => {
    await page.evaluate(() => {
      const stores = (window as any).__stores__;
      stores.automatonStore.getState().setName('My DFA');
    });
    await page.waitForTimeout(100);

    const tabName = await page.locator(SEL.activeTab).locator('.tab-name').textContent();
    expect(tabName).toContain('My DFA');
  });

  test('dirty tab shows dirty dot indicator', async ({ page }) => {
    // Initially not dirty (no dot)
    await expect(page.locator(`${SEL.activeTab} ${SEL.tabDirtyDot}`)).toHaveCount(0);

    // Make a change to set dirty
    await canvas.clickCanvas(500, 150);
    await page.waitForTimeout(100);

    // Should now have dirty dot
    await expect(page.locator(`${SEL.activeTab} ${SEL.tabDirtyDot}`)).toHaveCount(1);
  });

  test('undo/redo are independent per tab', async ({ page }) => {
    // First tab: add a state (q0 + q1)
    await canvas.clickCanvas(500, 150);
    await expect(page.locator(SEL.allStates)).toHaveCount(2);

    // Create second tab, add a state in it too
    await page.locator(SEL.tabNewBtn).click();
    await canvas.clickCanvas(500, 150);
    await expect(page.locator(SEL.allStates)).toHaveCount(2);

    // Undo in second tab — should go back to 1 state
    await page.keyboard.press('Control+z');
    await expect(page.locator(SEL.allStates)).toHaveCount(1);

    // Switch to first tab — should still have 2 states (undo didn't affect it)
    const tabs = page.locator(SEL.allTabs);
    await tabs.first().click();
    await expect(page.locator(SEL.allStates)).toHaveCount(2);
  });

  test('simulation exits when switching tabs', async ({ page }) => {
    // Build a simple automaton and enter simulation
    await builder.loadSimpleDFA();
    await page.locator(SEL.toolbarSimulate).click();
    await expect(page.locator(SEL.simWordInput)).toBeVisible();

    // Create a new tab (should exit simulation)
    await page.locator(SEL.tabNewBtn).click();

    // Verify simulation is not active in the new tab
    const isActive = await builder.isSimulationActive();
    expect(isActive).toBe(false);
  });

  test('tabs wrap correctly with many tabs', async ({ page }) => {
    // Create 4 more tabs (5 total)
    for (let i = 0; i < 4; i++) {
      await page.locator(SEL.tabNewBtn).click();
    }
    await expect(page.locator(SEL.allTabs)).toHaveCount(5);

    // All tabs should be rendered
    const tabCount = await page.locator(SEL.allTabs).count();
    expect(tabCount).toBe(5);
  });

  test('closing non-active tab does not switch focus', async ({ page }) => {
    // Setup: name first tab
    await page.evaluate(() => {
      const stores = (window as any).__stores__;
      stores.automatonStore.getState().setName('StaysActive');
    });

    // Create second tab (becomes active)
    await page.locator(SEL.tabNewBtn).click();

    // Create third tab (becomes active)
    await page.locator(SEL.tabNewBtn).click();
    await page.evaluate(() => {
      const stores = (window as any).__stores__;
      stores.automatonStore.getState().setName('ThirdActive');
    });

    // Close the second (non-active, clean) tab by clicking its close button
    const secondTab = page.locator(SEL.allTabs).nth(1);
    await secondTab.hover();
    await secondTab.locator(SEL.tabCloseBtn).click();

    // Should still be on the third tab
    const automaton = await builder.getAutomaton();
    expect(automaton.name).toBe('ThirdActive');
    await expect(page.locator(SEL.allTabs)).toHaveCount(2);
  });

  test('autosave restores tabs on reload', async ({ page }) => {
    // Build something in first tab
    await page.evaluate(() => {
      const stores = (window as any).__stores__;
      stores.automatonStore.getState().setName('Saved Tab');
    });

    // Create a second tab
    await page.locator(SEL.tabNewBtn).click();

    // Wait for autosave debounce (500ms) + buffer
    await page.waitForTimeout(800);

    // Reload page
    await page.reload();
    await page.waitForSelector(SEL.canvas);

    // Should restore both tabs
    await expect(page.locator(SEL.allTabs)).toHaveCount(2);
  });
});

import { test, expect } from '@playwright/test';
import { AutomatonBuilder } from './helpers/automaton-builder';
import { SEL } from './helpers/selectors';

// Use iPhone 13 viewport for phone tests
const phoneViewport = { width: 390, height: 844 };
// Use iPad viewport for tablet tests
const tabletViewport = { width: 768, height: 1024 };

test.describe('Mobile Touch UI - Phone', () => {
  test.use({ viewport: phoneViewport, hasTouch: true });

  let builder: AutomatonBuilder;

  test.beforeEach(async ({ page }) => {
    builder = new AutomatonBuilder(page);
    await page.goto('/');
    await page.waitForSelector(SEL.canvas);
  });

  test('shows hamburger menu on phone', async ({ page }) => {
    await expect(page.locator('[data-testid="hamburger-btn"]')).toBeVisible();
  });

  test('shows tab dropdown on phone', async ({ page }) => {
    await expect(page.locator('[data-testid="tab-dropdown-btn"]')).toBeVisible();
  });

  test('shows bottom bar on phone', async ({ page }) => {
    await expect(page.locator('[data-testid="bottom-bar"]')).toBeVisible();
  });

  test('shows bottom sheet on phone', async ({ page }) => {
    await expect(page.locator('[data-testid="bottom-sheet"]')).toBeVisible();
  });

  test('hides desktop toolbar elements on phone', async ({ page }) => {
    // Desktop-only elements should not be visible
    await expect(page.locator('.toolbar-zoom')).not.toBeVisible();
    await expect(page.locator('.toolbar-separator')).not.toBeVisible();
  });

  test('hides tab bar on phone', async ({ page }) => {
    await expect(page.locator('[data-testid="tab-bar"]')).not.toBeVisible();
  });

  test('hamburger menu opens and shows all file operations', async ({ page }) => {
    await page.locator('[data-testid="hamburger-btn"]').click();
    const dropdown = page.locator('[data-testid="hamburger-dropdown"]');
    await expect(dropdown).toBeVisible();
    // Phone should have Save/Load/Export PNG (same as tablet)
    await expect(dropdown.locator('text=New Automaton')).toBeVisible();
    await expect(dropdown.locator('text=Save')).toBeVisible();
    await expect(dropdown.locator('text=Load')).toBeVisible();
    await expect(dropdown.locator('text=Export PNG')).toBeVisible();
  });

  test('tab dropdown opens and shows tabs', async ({ page }) => {
    await page.locator('[data-testid="tab-dropdown-btn"]').click();
    const list = page.locator('[data-testid="tab-dropdown-list"]');
    await expect(list).toBeVisible();
    await expect(list.locator('text=+ New Tab')).toBeVisible();
  });

  test('bottom bar shows edit mode actions', async ({ page }) => {
    const bar = page.locator('[data-testid="bottom-bar"]');
    await expect(bar.locator('text=+ State')).toBeVisible();
    await expect(bar.locator('text=Simulate')).toBeVisible();
  });

  test('tapping canvas creates state via "+" State button flow', async ({ page }) => {
    // Click "+ State" in bottom bar
    await page.locator('[data-testid="bottom-bar"]').locator('text=+ State').click();
    // Tap on canvas using touchscreen API
    const canvas = page.locator(SEL.canvas);
    const box = await canvas.boundingBox();
    if (!box) throw new Error('Canvas not found');
    await page.touchscreen.tap(box.x + 200, box.y + 200);
    // Verify a new state was created
    const automaton = await builder.getAutomaton();
    expect(automaton.states.length).toBeGreaterThanOrEqual(2); // q0 + new state
  });

  test('bottom sheet expands on handle tap', async ({ page }) => {
    const sheet = page.locator('[data-testid="bottom-sheet"]');
    const handle = sheet.locator('.bottom-sheet-handle');
    // Initially collapsed (48px)
    const initialBox = await sheet.boundingBox();
    expect(initialBox).toBeTruthy();
    expect(initialBox!.height).toBeLessThan(60);
    // Tap handle to expand to half
    await handle.click();
    await page.waitForTimeout(300); // wait for transition
    const expandedBox = await sheet.boundingBox();
    expect(expandedBox!.height).toBeGreaterThan(100);
  });
});

test.describe('Mobile Touch UI - Tablet', () => {
  test.use({ viewport: tabletViewport, hasTouch: true });

  test.beforeEach(async ({ page }) => {
    await page.goto('/');
    await page.waitForSelector(SEL.canvas);
  });

  test('shows hamburger menu on tablet', async ({ page }) => {
    await expect(page.locator('[data-testid="hamburger-btn"]')).toBeVisible();
  });

  test('shows tab bar on tablet (not dropdown)', async ({ page }) => {
    await expect(page.locator('[data-testid="tab-bar"]')).toBeVisible();
  });

  test('shows bottom bar on tablet', async ({ page }) => {
    await expect(page.locator('[data-testid="bottom-bar"]')).toBeVisible();
  });

  test('shows right panel on tablet (not bottom sheet)', async ({ page }) => {
    // Tablet shows side panel, not bottom sheet
    await expect(page.locator('.properties-panel')).toBeVisible();
    await expect(page.locator('[data-testid="bottom-sheet"]')).not.toBeVisible();
  });

  test('hamburger menu includes Save/Load on tablet', async ({ page }) => {
    await page.locator('[data-testid="hamburger-btn"]').click();
    const dropdown = page.locator('[data-testid="hamburger-dropdown"]');
    await expect(dropdown).toBeVisible();
    await expect(dropdown.locator('text=Save')).toBeVisible();
    await expect(dropdown.locator('text=Load')).toBeVisible();
  });
});

test.describe('Mobile Touch UI - Interactions', () => {
  test.use({ viewport: phoneViewport, hasTouch: true });

  let builder: AutomatonBuilder;

  test.beforeEach(async ({ page }) => {
    builder = new AutomatonBuilder(page);
    await page.goto('/');
    await page.waitForSelector(SEL.canvas);
  });

  test('undo and redo from bottom bar', async ({ page }) => {
    const bar = page.locator('[data-testid="bottom-bar"]');
    // Undo should be disabled initially (no history)
    await expect(bar.locator('button[title="Undo"]')).toBeDisabled();
    // Create a new state to push history
    await bar.locator('text=+ State').click();
    const canvas = page.locator(SEL.canvas);
    const box = await canvas.boundingBox();
    if (!box) throw new Error('Canvas not found');
    await page.touchscreen.tap(box.x + 200, box.y + 200);
    let automaton = await builder.getAutomaton();
    expect(automaton.states.length).toBe(2);
    // Undo should now be enabled
    await expect(bar.locator('button[title="Undo"]')).toBeEnabled();
    await bar.locator('button[title="Undo"]').click();
    automaton = await builder.getAutomaton();
    expect(automaton.states.length).toBe(1);
    // Redo
    await expect(bar.locator('button[title="Redo"]')).toBeEnabled();
    await bar.locator('button[title="Redo"]').click();
    automaton = await builder.getAutomaton();
    expect(automaton.states.length).toBe(2);
  });

  test('simulate button enters simulation mode', async ({ page }) => {
    // Load a DFA to simulate
    await builder.loadSimpleDFA();
    const bar = page.locator('[data-testid="bottom-bar"]');
    await bar.locator('text=Simulate').click();
    const isActive = await builder.isSimulationActive();
    expect(isActive).toBe(true);
    // Exit button should appear
    await expect(bar.locator('text=Exit')).toBeVisible();
    // Click exit
    await bar.locator('text=Exit').click();
    const isActiveAfter = await builder.isSimulationActive();
    expect(isActiveAfter).toBe(false);
  });

  test('delete button removes selected state', async ({ page }) => {
    // Create a second state
    await page.locator('[data-testid="bottom-bar"]').locator('text=+ State').click();
    const canvas = page.locator(SEL.canvas);
    const box = await canvas.boundingBox();
    if (!box) throw new Error('Canvas not found');
    await page.touchscreen.tap(box.x + 200, box.y + 200);
    let automaton = await builder.getAutomaton();
    expect(automaton.states.length).toBe(2);
    // Tap the new state to select it (it should be near where we placed it)
    await page.touchscreen.tap(box.x + 200, box.y + 200);
    // Delete should be enabled now
    const deleteBtn = page.locator('[data-testid="bottom-bar"]').locator('button[title="Delete selected"]');
    await expect(deleteBtn).toBeEnabled();
    await deleteBtn.click();
    automaton = await builder.getAutomaton();
    expect(automaton.states.length).toBe(1);
  });
});

test.describe('Mobile Touch UI - Help Panel', () => {
  test.use({ viewport: phoneViewport, hasTouch: true });

  test.beforeEach(async ({ page }) => {
    await page.goto('/');
    await page.evaluate(() => localStorage.removeItem('automata-help-seen'));
    await page.reload();
    await page.waitForSelector(SEL.canvas);
  });

  test('help panel shows touch gestures on phone (not keyboard shortcuts)', async ({ page }) => {
    const panel = page.locator('.shortcuts-panel');
    await expect(panel).toBeVisible();
    // Should show touch gestures section
    await expect(panel.locator('h4', { hasText: 'Touch Gestures' })).toBeVisible();
    // Should NOT show keyboard shortcuts or simulation shortcuts
    await expect(panel.locator('h4', { hasText: 'Keyboard Shortcuts' })).not.toBeVisible();
    await expect(panel.locator('h4', { hasText: 'During Simulation' })).not.toBeVisible();
    // Should show How to Use
    await expect(panel.locator('h4', { hasText: 'How to Use' })).toBeVisible();
  });

  test('help panel lists expected touch gestures', async ({ page }) => {
    const panel = page.locator('.shortcuts-panel');
    await expect(panel).toBeVisible();
    // Verify gesture names appear in the gesture table
    const table = panel.locator('.shortcuts-table');
    await expect(table.locator('text=Select state or transition')).toBeVisible();
    await expect(table.locator('text=Create self-loop')).toBeVisible();
    await expect(table.locator('text=Context menu')).toBeVisible();
    await expect(table.locator('text=Zoom in/out')).toBeVisible();
  });
});

test.describe('Mobile Touch UI - Context Menu', () => {
  test.use({ viewport: phoneViewport, hasTouch: true });

  test.beforeEach(async ({ page }) => {
    await page.goto('/');
    await page.waitForSelector(SEL.canvas);
  });

  test('long-press on state shows context menu', async ({ page }) => {
    // Find the SVG canvas and q0 state position
    const canvas = page.locator(SEL.canvas);
    const box = await canvas.boundingBox();
    if (!box) throw new Error('Canvas not found');

    // q0 starts near center of the canvas area
    const x = box.x + 200;
    const y = box.y + 250;

    // Simulate long-press: dispatch touchstart on the SVG, wait, then touchend
    // We dispatch on the SVG element directly so the native listener catches it
    await page.evaluate(({ x, y }) => {
      const svg = document.querySelector('[data-testid="automata-canvas"]');
      if (!svg) return;
      const el = document.elementFromPoint(x, y) || svg;
      const touchObj = new Touch({
        identifier: 0,
        target: el,
        clientX: x,
        clientY: y,
      });
      // Dispatch on SVG so native addEventListener catches it
      svg.dispatchEvent(new TouchEvent('touchstart', {
        touches: [touchObj],
        changedTouches: [touchObj],
        cancelable: true,
        bubbles: true,
      }));
    }, { x, y });

    await page.waitForTimeout(600); // longer than LONG_PRESS_MS (500ms)

    await page.evaluate(({ x, y }) => {
      const svg = document.querySelector('[data-testid="automata-canvas"]');
      if (!svg) return;
      const el = document.elementFromPoint(x, y) || svg;
      const touchObj = new Touch({
        identifier: 0,
        target: el,
        clientX: x,
        clientY: y,
      });
      svg.dispatchEvent(new TouchEvent('touchend', {
        touches: [],
        changedTouches: [touchObj],
        cancelable: true,
        bubbles: true,
      }));
    }, { x, y });

    // Context menu should appear
    const menu = page.locator('[data-testid="context-menu"]');
    await expect(menu).toBeVisible({ timeout: 2000 });
    await expect(menu.locator('text=Delete State')).toBeVisible();
    await expect(menu.locator('text=Set Accepting')).toBeVisible();
  });
});

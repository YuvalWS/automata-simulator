import { test, expect } from '@playwright/test';
import { SEL } from './helpers/selectors';

test.describe('Help Menu', () => {
  test.beforeEach(async ({ page }) => {
    // Clear localStorage so each test simulates a fresh visit
    await page.goto('/');
    await page.evaluate(() => localStorage.removeItem('automata-help-seen'));
    await page.reload();
    await page.waitForSelector(SEL.canvas);
  });

  test('help panel is shown on first visit', async ({ page }) => {
    await expect(page.locator(SEL.helpPanel)).toBeVisible();
  });

  test('help panel is not shown on subsequent visits', async ({ page }) => {
    // Panel should be visible on first visit
    await expect(page.locator(SEL.helpPanel)).toBeVisible();

    // Close the panel
    await page.locator(SEL.helpClose).click();
    await expect(page.locator(SEL.helpPanel)).not.toBeVisible();

    // Reload — should not reappear
    await page.reload();
    await page.waitForSelector(SEL.canvas);
    await expect(page.locator(SEL.helpPanel)).not.toBeVisible();
  });

  test('clicking the ? button toggles the help panel', async ({ page }) => {
    // Close first
    await page.locator(SEL.helpClose).click();
    await expect(page.locator(SEL.helpPanel)).not.toBeVisible();

    // Open via toggle
    await page.locator(SEL.helpToggle).click();
    await expect(page.locator(SEL.helpPanel)).toBeVisible();

    // Close via toggle
    await page.locator(SEL.helpToggle).click();
    await expect(page.locator(SEL.helpPanel)).not.toBeVisible();
  });

  test('clicking outside the help panel closes it', async ({ page }) => {
    await expect(page.locator(SEL.helpPanel)).toBeVisible();

    // Click on the canvas (outside the help panel)
    await page.locator(SEL.canvas).click({ position: { x: 100, y: 100 } });
    await expect(page.locator(SEL.helpPanel)).not.toBeVisible();
  });

  test('clicking the X button closes the help panel', async ({ page }) => {
    await expect(page.locator(SEL.helpPanel)).toBeVisible();

    await page.locator(SEL.helpClose).click();
    await expect(page.locator(SEL.helpPanel)).not.toBeVisible();
  });

  test('help panel contains expected sections', async ({ page }) => {
    const panel = page.locator(SEL.helpPanel);
    await expect(panel.locator('h4', { hasText: 'Keyboard Shortcuts' })).toBeVisible();
    await expect(panel.locator('h4', { hasText: 'During Simulation' })).toBeVisible();
    await expect(panel.locator('h4', { hasText: 'How to Use' })).toBeVisible();
  });
});

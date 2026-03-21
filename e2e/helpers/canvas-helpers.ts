import { Page, Locator } from '@playwright/test';
import { SEL } from './selectors';

/**
 * Helper class for interacting with the SVG automata canvas in E2E tests.
 *
 * Key insight: The canvas requires a mousemove event to set `hoverPoint`
 * before mouseup can use it to add a state. Using hover() before click()
 * ensures this works correctly.
 */
export class CanvasHelper {
  constructor(private page: Page) {}

  get canvas(): Locator {
    return this.page.locator(SEL.canvas);
  }

  /** Get the bounding box of the canvas */
  async getBBox() {
    const box = await this.canvas.boundingBox();
    if (!box) throw new Error('Canvas not found');
    return box;
  }

  /**
   * Click at a canvas position (relative to the canvas element).
   * Hover first to ensure hoverPoint is set, which is required for state creation.
   */
  async clickCanvas(x: number, y: number) {
    await this.canvas.hover({ position: { x, y } });
    await this.canvas.click({ position: { x, y } });
  }

  /**
   * Click canvas while holding Shift (for rubber-band selection start or multi-select).
   */
  async shiftClickCanvas(x: number, y: number) {
    await this.canvas.hover({ position: { x, y } });
    await this.canvas.click({ position: { x, y }, modifiers: ['Shift'] });
  }

  /**
   * Drag from one canvas point to another with precise mouse control.
   * Uses absolute page coordinates derived from canvas bounding box.
   */
  async drag(fromX: number, fromY: number, toX: number, toY: number, options?: { shift?: boolean }) {
    const box = await this.getBBox();
    const absFromX = box.x + fromX;
    const absFromY = box.y + fromY;
    const absToX = box.x + toX;
    const absToY = box.y + toY;

    if (options?.shift) {
      await this.page.keyboard.down('Shift');
    }
    await this.page.mouse.move(absFromX, absFromY);
    await this.page.mouse.down();
    // Move in steps for smooth drag (important for snap detection)
    await this.page.mouse.move(absToX, absToY, { steps: 10 });
    await this.page.mouse.up();
    if (options?.shift) {
      await this.page.keyboard.up('Shift');
    }
  }

  /** Get count of state nodes on canvas */
  async stateCount(): Promise<number> {
    return this.page.locator(SEL.allStates).count();
  }

  /** Get count of transition edges on canvas */
  async transitionCount(): Promise<number> {
    return this.page.locator(SEL.allTransitions).count();
  }

  /** Click a state node by its data-testid */
  async clickState(testId: string) {
    await this.page.locator(`[data-testid="${testId}"]`).click();
  }

  /** Double-click a state node */
  async dblClickState(testId: string) {
    await this.page.locator(`[data-testid="${testId}"]`).dblclick();
  }

  /** Click a transition edge by its data-testid */
  async clickTransition(testId: string) {
    await this.page.locator(`[data-testid="${testId}"]`).click();
  }

  /** Double-click a transition edge */
  async dblClickTransition(testId: string) {
    await this.page.locator(`[data-testid="${testId}"]`).dblclick();
  }

  /** Shift+click a state node for multi-select */
  async shiftClickState(testId: string) {
    await this.page.locator(`[data-testid="${testId}"]`).click({ modifiers: ['Shift'] });
  }

  /** Get the text content of all state labels on canvas */
  async getStateNames(): Promise<string[]> {
    return this.page.locator(`${SEL.allStates} text.state-label`).allTextContents();
  }

  /** Scroll wheel at a position to zoom */
  async wheelAt(x: number, y: number, deltaY: number) {
    const box = await this.getBBox();
    await this.page.mouse.wheel(deltaY, 0);
    // Playwright wheel sends to current mouse position, so move first
    await this.page.mouse.move(box.x + x, box.y + y);
    await this.page.mouse.wheel(0, deltaY);
  }
}

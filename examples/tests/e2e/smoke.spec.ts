import { test, expect } from '@playwright/test';

/**
 * Smoke tests for Cliffy WASM loading and basic functionality
 */
test.describe('Cliffy WASM Smoke Tests', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/');
  });

  test('page loads without errors', async ({ page }) => {
    // Check that no console errors occurred during page load
    const errors: string[] = [];
    page.on('console', (msg) => {
      if (msg.type() === 'error') {
        errors.push(msg.text());
      }
    });

    // Wait for the page to fully load
    await page.waitForLoadState('networkidle');

    // Check for critical elements
    await expect(page.locator('#app')).toBeVisible();
    await expect(page.locator('#canvas')).toBeVisible();

    // Filter out expected WASM-related warnings
    const criticalErrors = errors.filter(
      (e) =>
        !e.includes('SharedArrayBuffer') &&
        !e.includes('cross-origin-isolated')
    );

    expect(criticalErrors).toHaveLength(0);
  });

  test('WASM module initializes successfully', async ({ page }) => {
    // Wait for WASM to load by checking for a specific log message
    const wasmLoaded = await page.evaluate(async () => {
      // Wait a bit for WASM to initialize
      await new Promise((resolve) => setTimeout(resolve, 2000));

      // Check if Cliffy is available on the window
      // (exposed for debugging in the whiteboard app)
      return typeof (window as any).benchmark !== 'undefined';
    });

    // The benchmark panel is created after WASM loads
    await expect(page.locator('.benchmark-panel')).toBeVisible({
      timeout: 10000,
    });
  });

  test('canvas element is properly sized', async ({ page }) => {
    const canvas = page.locator('#canvas');

    // Canvas should be visible
    await expect(canvas).toBeVisible();

    // Get canvas dimensions
    const dimensions = await canvas.evaluate((el) => {
      const canvas = el as HTMLCanvasElement;
      return {
        width: canvas.width,
        height: canvas.height,
        clientWidth: canvas.clientWidth,
        clientHeight: canvas.clientHeight,
      };
    });

    // Canvas should have non-zero dimensions
    expect(dimensions.width).toBeGreaterThan(0);
    expect(dimensions.height).toBeGreaterThan(0);
    expect(dimensions.clientWidth).toBeGreaterThan(0);
    expect(dimensions.clientHeight).toBeGreaterThan(0);
  });
});

test.describe('Behavior and Event Tests', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/');
    // Wait for WASM to initialize
    await page.waitForTimeout(2000);
  });

  test('can create and sample a Behavior', async ({ page }) => {
    const result = await page.evaluate(async () => {
      // Import Cliffy dynamically (already loaded in page context)
      const cliffy = await import('@cliffy/core');

      // Create a behavior with initial value
      const count = new cliffy.Behavior(42);

      // Sample the value
      return count.sample();
    });

    expect(result).toBe(42);
  });

  test('Behavior update triggers subscribers', async ({ page }) => {
    const result = await page.evaluate(async () => {
      const cliffy = await import('@cliffy/core');

      const count = new cliffy.Behavior(0);
      const values: number[] = [];

      // Subscribe to changes
      count.subscribe((value: number) => {
        values.push(value);
      });

      // Update the value
      count.update((n: number) => n + 1);
      count.update((n: number) => n + 1);
      count.set(10);

      return { finalValue: count.sample(), receivedValues: values };
    });

    expect(result.finalValue).toBe(10);
    // Should have received: 0 (initial), 1, 2, 10
    expect(result.receivedValues).toEqual([0, 1, 2, 10]);
  });

  test('Event emits to subscribers', async ({ page }) => {
    const result = await page.evaluate(async () => {
      const cliffy = await import('@cliffy/core');

      const clicks = new cliffy.Event<number>();
      const received: number[] = [];

      clicks.subscribe((value: number) => {
        received.push(value);
      });

      clicks.emit(1);
      clicks.emit(2);
      clicks.emit(3);

      return received;
    });

    expect(result).toEqual([1, 2, 3]);
  });

  test('combine two Behaviors', async ({ page }) => {
    const result = await page.evaluate(async () => {
      const cliffy = await import('@cliffy/core');

      const width = new cliffy.Behavior(10);
      const height = new cliffy.Behavior(5);

      // Combine to compute area
      const area = width.combine(height, (w: number, h: number) => w * h);

      const initial = area.sample();

      // Update width
      width.set(20);
      const afterWidthUpdate = area.sample();

      // Update height
      height.set(10);
      const afterHeightUpdate = area.sample();

      return { initial, afterWidthUpdate, afterHeightUpdate };
    });

    expect(result.initial).toBe(50);
    expect(result.afterWidthUpdate).toBe(100);
    expect(result.afterHeightUpdate).toBe(200);
  });
});

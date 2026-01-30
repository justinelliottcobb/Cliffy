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

  test('console shows Cliffy initialization message', async ({ page }) => {
    const messages: string[] = [];
    page.on('console', (msg) => {
      messages.push(msg.text());
    });

    await page.goto('/');
    await page.waitForSelector('.benchmark-panel', { timeout: 10000 });

    // Check for initialization message
    const hasInitMessage = messages.some((m) =>
      m.includes('Cliffy') || m.includes('initialized')
    );
    expect(hasInitMessage).toBe(true);
  });
});

test.describe('Whiteboard App Functionality', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/');
    // Wait for WASM to initialize
    await page.waitForSelector('.benchmark-panel', { timeout: 10000 });
  });

  test('stroke count starts at zero', async ({ page }) => {
    const strokeCount = await page.locator('#strokeCount').textContent();
    expect(strokeCount).toBe('Strokes: 0');
  });

  test('point count starts at zero', async ({ page }) => {
    const pointCount = await page.locator('#pointCount').textContent();
    expect(pointCount).toBe('Points: 0');
  });

  test('peer count starts at one', async ({ page }) => {
    const peerCount = await page.locator('#peerCount').textContent();
    expect(peerCount).toBe('Peers: 1');
  });

  test('drawing increments stroke and point counts', async ({ page }) => {
    const canvas = page.locator('#canvas');
    const box = await canvas.boundingBox();
    if (!box) throw new Error('Canvas not found');

    // Draw a stroke
    const startX = box.x + box.width / 2;
    const startY = box.y + box.height / 2;

    await page.mouse.move(startX, startY);
    await page.mouse.down();
    await page.mouse.move(startX + 100, startY + 50, { steps: 10 });
    await page.mouse.up();

    await page.waitForTimeout(200);

    // Check stroke count increased
    const strokeCount = await page.locator('#strokeCount').textContent();
    expect(strokeCount).toBe('Strokes: 1');

    // Check point count increased
    const pointCount = await page.locator('#pointCount').textContent();
    expect(pointCount).not.toBe('Points: 0');
  });
});

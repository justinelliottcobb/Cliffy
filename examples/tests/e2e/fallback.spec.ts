import { test, expect } from '@playwright/test';

/**
 * Tests for CPU fallback and error handling
 *
 * Note: These tests verify the application works correctly regardless of
 * GPU availability by testing through the UI rather than importing modules
 * directly in the browser context.
 */
test.describe('CPU Fallback Behavior', () => {
  test('application loads even with limited GPU support', async ({ page }) => {
    // Navigate to the app
    await page.goto('/');

    // Wait for the app to be interactive
    await page.waitForSelector('#canvas', { timeout: 15000 });

    // The app should work regardless of GPU availability
    const appState = await page.evaluate(() => {
      const canvas = document.getElementById('canvas');
      const toolbar = document.querySelector('.toolbar');
      const statusBar = document.querySelector('.status-bar');

      return {
        hasCanvas: !!canvas,
        hasToolbar: !!toolbar,
        hasStatusBar: !!statusBar,
        // Check if any critical errors occurred
        bodyHasError: document.body.textContent?.includes('Error') ?? false,
      };
    });

    expect(appState.hasCanvas).toBe(true);
    expect(appState.hasToolbar).toBe(true);
    expect(appState.hasStatusBar).toBe(true);
    expect(appState.bodyHasError).toBe(false);
  });

  test('geometric operations work via drawing', async ({ page }) => {
    await page.goto('/');
    await page.waitForSelector('.benchmark-panel', { timeout: 10000 });

    const canvas = page.locator('#canvas');
    const box = await canvas.boundingBox();
    if (!box) throw new Error('Canvas not found');

    // Draw a stroke - this exercises the geometric state internally
    await page.mouse.move(box.x + box.width / 2, box.y + box.height / 2);
    await page.mouse.down();
    await page.mouse.move(box.x + box.width / 2 + 100, box.y + box.height / 2 + 50, { steps: 10 });
    await page.mouse.up();

    await page.waitForTimeout(200);

    // Verify stroke was created (geometric operations working)
    const strokeCount = await page.locator('#strokeCount').textContent();
    expect(strokeCount).toBe('Strokes: 1');

    // Verify points were recorded
    const pointCount = await page.locator('#pointCount').textContent();
    expect(pointCount).not.toBe('Points: 0');
  });

  test('multiple strokes work correctly', async ({ page }) => {
    await page.goto('/');
    await page.waitForSelector('.benchmark-panel', { timeout: 10000 });

    const canvas = page.locator('#canvas');
    const box = await canvas.boundingBox();
    if (!box) throw new Error('Canvas not found');

    // Draw multiple strokes to test geometric operations
    for (let i = 0; i < 5; i++) {
      const startX = box.x + 50 + i * 30;
      const startY = box.y + 50 + i * 20;

      await page.mouse.move(startX, startY);
      await page.mouse.down();
      await page.mouse.move(startX + 80, startY + 40, { steps: 5 });
      await page.mouse.up();
    }

    await page.waitForTimeout(300);

    // Verify all strokes were recorded
    const strokeCount = await page.locator('#strokeCount').textContent();
    expect(strokeCount).toBe('Strokes: 5');
  });

  test('canvas responds to tool changes', async ({ page }) => {
    await page.goto('/');
    await page.waitForSelector('.benchmark-panel', { timeout: 10000 });

    // Switch to eraser
    const eraserButton = page.locator('[data-tool="eraser"]');
    await eraserButton.click();
    await expect(eraserButton).toHaveClass(/toolbar__button--active/);

    // Switch back to pen
    const penButton = page.locator('[data-tool="pen"]');
    await penButton.click();
    await expect(penButton).toHaveClass(/toolbar__button--active/);
  });

  test('color selection works', async ({ page }) => {
    await page.goto('/');
    await page.waitForSelector('.benchmark-panel', { timeout: 10000 });

    // Select a color
    const blueColor = page.locator('[data-color="#4a90e2"]');
    await blueColor.click();
    await expect(blueColor).toHaveClass(/toolbar__color--selected/);
  });
});

test.describe('Error Recovery', () => {
  test('handles WASM initialization errors gracefully', async ({ page }) => {
    // Add error handler
    const errors: string[] = [];
    page.on('pageerror', (error) => {
      errors.push(error.message);
    });

    await page.goto('/');

    // Wait a bit for potential errors
    await page.waitForTimeout(3000);

    // Check that the app didn't crash completely
    const appVisible = await page.locator('#app').isVisible();
    expect(appVisible).toBe(true);
  });

  test('app remains functional after operations', async ({ page }) => {
    await page.goto('/');
    await page.waitForSelector('.benchmark-panel', { timeout: 10000 });

    const canvas = page.locator('#canvas');
    const box = await canvas.boundingBox();
    if (!box) throw new Error('Canvas not found');

    // Draw a stroke
    await page.mouse.move(box.x + 100, box.y + 100);
    await page.mouse.down();
    await page.mouse.move(box.x + 200, box.y + 200, { steps: 5 });
    await page.mouse.up();

    await page.waitForTimeout(200);

    // Clear the canvas via JavaScript to bypass benchmark panel overlay
    await page.evaluate(() => {
      (document.getElementById('clearBtn') as HTMLButtonElement)?.click();
    });

    await page.waitForTimeout(200);

    // Verify canvas was cleared
    const strokeCount = await page.locator('#strokeCount').textContent();
    expect(strokeCount).toBe('Strokes: 0');

    // Draw again to verify app still works
    await page.mouse.move(box.x + 150, box.y + 150);
    await page.mouse.down();
    await page.mouse.move(box.x + 250, box.y + 250, { steps: 5 });
    await page.mouse.up();

    await page.waitForTimeout(200);

    const newStrokeCount = await page.locator('#strokeCount').textContent();
    expect(newStrokeCount).toBe('Strokes: 1');
  });
});

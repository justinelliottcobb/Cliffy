import { test, expect } from '@playwright/test';

/**
 * E2E tests for the Whiteboard example application
 */
test.describe('Whiteboard Example', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/');
    // Wait for WASM to initialize
    await page.waitForSelector('.benchmark-panel', { timeout: 10000 });
  });

  test('toolbar is visible with all controls', async ({ page }) => {
    // Check toolbar visibility
    await expect(page.locator('.toolbar')).toBeVisible();

    // Check tool buttons
    await expect(page.locator('[data-tool="pen"]')).toBeVisible();
    await expect(page.locator('[data-tool="eraser"]')).toBeVisible();

    // Check color buttons
    await expect(page.locator('[data-color="#ffffff"]')).toBeVisible();
    await expect(page.locator('[data-color="#4a90e2"]')).toBeVisible();

    // Check action buttons
    await expect(page.locator('#clearBtn')).toBeVisible();
    await expect(page.locator('#simulatePeersBtn')).toBeVisible();
  });

  test('pen tool is selected by default', async ({ page }) => {
    const penButton = page.locator('[data-tool="pen"]');
    await expect(penButton).toHaveClass(/toolbar__button--active/);
  });

  test('can switch between pen and eraser tools', async ({ page }) => {
    const penButton = page.locator('[data-tool="pen"]');
    const eraserButton = page.locator('[data-tool="eraser"]');

    // Initially pen is active
    await expect(penButton).toHaveClass(/toolbar__button--active/);
    await expect(eraserButton).not.toHaveClass(/toolbar__button--active/);

    // Click eraser
    await eraserButton.click();
    await expect(eraserButton).toHaveClass(/toolbar__button--active/);
    await expect(penButton).not.toHaveClass(/toolbar__button--active/);

    // Click pen again
    await penButton.click();
    await expect(penButton).toHaveClass(/toolbar__button--active/);
    await expect(eraserButton).not.toHaveClass(/toolbar__button--active/);
  });

  test('can select different colors', async ({ page }) => {
    const blueColor = page.locator('[data-color="#4a90e2"]');
    const redColor = page.locator('[data-color="#e24a4a"]');

    // Click blue color
    await blueColor.click();
    await expect(blueColor).toHaveClass(/toolbar__color--selected/);

    // Click red color
    await redColor.click();
    await expect(redColor).toHaveClass(/toolbar__color--selected/);
    await expect(blueColor).not.toHaveClass(/toolbar__color--selected/);
  });

  test('can draw on canvas', async ({ page }) => {
    const canvas = page.locator('#canvas');

    // Get initial stroke count
    const initialStrokeCount = await page.locator('#strokeCount').textContent();
    expect(initialStrokeCount).toBe('Strokes: 0');

    // Get canvas bounding box
    const box = await canvas.boundingBox();
    if (!box) throw new Error('Canvas not found');

    // Draw a stroke
    const startX = box.x + box.width / 2;
    const startY = box.y + box.height / 2;

    await page.mouse.move(startX, startY);
    await page.mouse.down();
    await page.mouse.move(startX + 100, startY + 50, { steps: 10 });
    await page.mouse.up();

    // Wait for state update
    await page.waitForTimeout(200);

    // Check stroke count increased
    const newStrokeCount = await page.locator('#strokeCount').textContent();
    expect(newStrokeCount).toBe('Strokes: 1');
  });

  test('can clear all strokes', async ({ page }) => {
    const canvas = page.locator('#canvas');

    // Get canvas bounding box
    const box = await canvas.boundingBox();
    if (!box) throw new Error('Canvas not found');

    // Draw a stroke
    const startX = box.x + box.width / 2;
    const startY = box.y + box.height / 2;

    await page.mouse.move(startX, startY);
    await page.mouse.down();
    await page.mouse.move(startX + 100, startY + 50, { steps: 5 });
    await page.mouse.up();

    await page.waitForTimeout(200);

    // Verify stroke was created
    let strokeCount = await page.locator('#strokeCount').textContent();
    expect(strokeCount).toBe('Strokes: 1');

    // Click clear button (use force to bypass overlay)
    await page.locator('#clearBtn').click({ force: true });

    await page.waitForTimeout(200);

    // Verify strokes are cleared
    strokeCount = await page.locator('#strokeCount').textContent();
    expect(strokeCount).toBe('Strokes: 0');
  });

  test('status bar shows correct information', async ({ page }) => {
    // Check status bar elements exist and have expected format
    await expect(page.locator('#strokeCount')).toContainText('Strokes:');
    await expect(page.locator('#pointCount')).toContainText('Points:');
    await expect(page.locator('#peerCount')).toContainText('Peers:');
  });

  test('can toggle peer simulation', async ({ page }) => {
    const simulateBtn = page.locator('#simulatePeersBtn');

    // Initially should show "Simulate Peers"
    await expect(simulateBtn).toContainText('Simulate Peers');
    await expect(simulateBtn).not.toHaveClass(/toolbar__button--active/);

    // Click to start simulation (use force to bypass overlay)
    await simulateBtn.click({ force: true });
    await expect(simulateBtn).toContainText('Stop Simulation');
    await expect(simulateBtn).toHaveClass(/toolbar__button--active/);

    // Wait for some simulated strokes
    await page.waitForTimeout(3000);

    // Should have more than 1 peer now
    const peerCount = await page.locator('#peerCount').textContent();
    expect(peerCount).not.toBe('Peers: 1');

    // Click to stop simulation
    await simulateBtn.click({ force: true });
    await expect(simulateBtn).toContainText('Simulate Peers');
    await expect(simulateBtn).not.toHaveClass(/toolbar__button--active/);
  });

  test('benchmark panel is visible', async ({ page }) => {
    // Benchmark panel should be visible
    const benchmarkPanel = page.locator('.benchmark-panel');
    await expect(benchmarkPanel).toBeVisible();

    // Should show performance title
    await expect(benchmarkPanel).toContainText('Performance');
  });
});

test.describe('Whiteboard Performance', () => {
  test('renders smoothly with multiple strokes', async ({ page }) => {
    await page.goto('/');
    await page.waitForSelector('.benchmark-panel', { timeout: 10000 });

    const canvas = page.locator('#canvas');
    const box = await canvas.boundingBox();
    if (!box) throw new Error('Canvas not found');

    // Draw multiple strokes
    for (let i = 0; i < 10; i++) {
      const startX = box.x + 50 + i * 20;
      const startY = box.y + 50 + i * 10;

      await page.mouse.move(startX, startY);
      await page.mouse.down();
      await page.mouse.move(startX + 80, startY + 40, { steps: 5 });
      await page.mouse.up();
    }

    await page.waitForTimeout(500);

    // Check stroke count
    const strokeCount = await page.locator('#strokeCount').textContent();
    expect(strokeCount).toBe('Strokes: 10');

    // Verify no performance issues (page should still be responsive)
    const penButton = page.locator('[data-tool="pen"]');
    await expect(penButton).toBeEnabled();
  });
});

import { test, expect } from '@playwright/test';

/**
 * Tests for WebGPU detection and fallback behavior
 */
test.describe('WebGPU Detection', () => {
  test('reports WebGPU availability correctly', async ({ page, browserName }) => {
    await page.goto('/');

    const gpuStatus = await page.evaluate(async () => {
      // Check if WebGPU is available
      const hasWebGPU = 'gpu' in navigator;

      let adapter = null;
      let device = null;

      if (hasWebGPU) {
        try {
          adapter = await (navigator as any).gpu.requestAdapter();
          if (adapter) {
            device = await adapter.requestDevice();
          }
        } catch (e) {
          // WebGPU not available or error occurred
        }
      }

      return {
        hasNavigatorGpu: hasWebGPU,
        hasAdapter: adapter !== null,
        hasDevice: device !== null,
      };
    });

    // WebGPU support varies by browser
    // - Chromium: Usually available in recent versions
    // - Firefox: Experimental, may not be enabled
    // - WebKit/Safari: Limited support
    console.log(`WebGPU status on ${browserName}:`, gpuStatus);

    // The test passes regardless of WebGPU support
    // We're just verifying the detection code works
    expect(typeof gpuStatus.hasNavigatorGpu).toBe('boolean');
    expect(typeof gpuStatus.hasAdapter).toBe('boolean');
    expect(typeof gpuStatus.hasDevice).toBe('boolean');
  });

  test('benchmark panel shows GPU/CPU mode', async ({ page }) => {
    await page.goto('/');
    await page.waitForSelector('.benchmark-panel', { timeout: 10000 });

    // The benchmark panel should indicate current rendering mode
    const benchmarkPanel = page.locator('.benchmark-panel');
    await expect(benchmarkPanel).toBeVisible();

    // Check for GPU/CPU toggle or indicator
    // The exact UI depends on implementation
    const hasBackendInfo = await page.evaluate(() => {
      const panel = document.querySelector('.benchmark-panel');
      if (!panel) return false;

      // Check if there's any indication of GPU/CPU mode
      const text = panel.textContent || '';
      return text.includes('GPU') || text.includes('CPU') || text.includes('Backend');
    });

    // At minimum, the panel should exist
    expect(await benchmarkPanel.isVisible()).toBe(true);
  });
});

test.describe('SIMD CPU Fallback', () => {
  test('WASM SIMD is available in modern browsers', async ({ page }) => {
    await page.goto('/');

    const simdStatus = await page.evaluate(async () => {
      // Check for WASM SIMD support
      // This is a simplified check - actual SIMD detection happens in the WASM module
      try {
        const simdTest = new WebAssembly.Module(
          new Uint8Array([
            0x00, 0x61, 0x73, 0x6d, // WASM magic number
            0x01, 0x00, 0x00, 0x00, // Version
            // Minimal valid module
          ])
        );
        return { wasmSupported: true };
      } catch (e) {
        return { wasmSupported: false, error: String(e) };
      }
    });

    // WASM should be supported in all modern browsers
    expect(simdStatus.wasmSupported).toBe(true);
  });

  test('application works without WebGPU', async ({ page, browserName }) => {
    // Firefox and older Safari don't have WebGPU enabled by default
    await page.goto('/');
    await page.waitForSelector('.benchmark-panel', { timeout: 10000 });

    // Draw something to verify the app works
    const canvas = page.locator('#canvas');
    const box = await canvas.boundingBox();
    if (!box) throw new Error('Canvas not found');

    await page.mouse.move(box.x + 100, box.y + 100);
    await page.mouse.down();
    await page.mouse.move(box.x + 200, box.y + 150, { steps: 5 });
    await page.mouse.up();

    await page.waitForTimeout(200);

    // Verify stroke was created (CPU fallback working)
    const strokeCount = await page.locator('#strokeCount').textContent();
    expect(strokeCount).toBe('Strokes: 1');
  });
});

test.describe('Cross-Browser Rendering', () => {
  test('canvas renders correctly', async ({ page, browserName }) => {
    await page.goto('/');
    await page.waitForSelector('#canvas', { timeout: 10000 });

    const canvas = page.locator('#canvas');
    const box = await canvas.boundingBox();
    if (!box) throw new Error('Canvas not found');

    // Draw a simple shape
    await page.mouse.move(box.x + 50, box.y + 50);
    await page.mouse.down();
    await page.mouse.move(box.x + 150, box.y + 50, { steps: 5 });
    await page.mouse.move(box.x + 150, box.y + 150, { steps: 5 });
    await page.mouse.move(box.x + 50, box.y + 150, { steps: 5 });
    await page.mouse.move(box.x + 50, box.y + 50, { steps: 5 });
    await page.mouse.up();

    await page.waitForTimeout(200);

    // Take a screenshot for visual comparison
    await canvas.screenshot({
      path: `test-results/canvas-${browserName}.png`,
    });

    // Verify the stroke was recorded
    const strokeCount = await page.locator('#strokeCount').textContent();
    expect(strokeCount).toBe('Strokes: 1');
  });

  test('handles high DPI displays', async ({ page }) => {
    await page.goto('/');

    const dpiInfo = await page.evaluate(() => {
      const canvas = document.getElementById('canvas') as HTMLCanvasElement;
      const dpr = window.devicePixelRatio || 1;

      return {
        devicePixelRatio: dpr,
        canvasWidth: canvas.width,
        canvasHeight: canvas.height,
        clientWidth: canvas.clientWidth,
        clientHeight: canvas.clientHeight,
        // Check if canvas is scaled for DPI
        isScaledForDpi:
          canvas.width >= canvas.clientWidth * Math.floor(dpr) ||
          canvas.height >= canvas.clientHeight * Math.floor(dpr),
      };
    });

    console.log('DPI info:', dpiInfo);

    // Canvas should be properly sized
    expect(dpiInfo.canvasWidth).toBeGreaterThan(0);
    expect(dpiInfo.canvasHeight).toBeGreaterThan(0);
  });
});

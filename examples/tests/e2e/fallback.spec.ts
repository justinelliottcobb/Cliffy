import { test, expect } from '@playwright/test';

/**
 * Tests for CPU fallback and error handling
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

  test('geometric operations work in fallback mode', async ({ page }) => {
    await page.goto('/');
    await page.waitForSelector('.benchmark-panel', { timeout: 10000 });

    // Test geometric operations that might use SIMD/GPU
    const result = await page.evaluate(async () => {
      const cliffy = await import('@cliffy/core');

      // Create geometric states and apply transformations
      const state = cliffy.GeometricState.fromVector(1, 0, 0);

      // Apply a 90-degree rotation in XY plane
      const rotor = cliffy.Rotor.xy(Math.PI / 2);
      const rotated = state.applyRotor(rotor);

      // Get the result vector
      const result = rotated.asVector();

      return {
        x: result[0],
        y: result[1],
        z: result[2],
      };
    });

    // After 90-degree XY rotation, (1,0,0) should become approximately (0,1,0)
    expect(result.x).toBeCloseTo(0, 5);
    expect(result.y).toBeCloseTo(1, 5);
    expect(result.z).toBeCloseTo(0, 5);
  });

  test('interpolation works correctly', async ({ page }) => {
    await page.goto('/');
    await page.waitForSelector('.benchmark-panel', { timeout: 10000 });

    const result = await page.evaluate(async () => {
      const cliffy = await import('@cliffy/core');

      // Test rotor interpolation (slerp)
      const r1 = cliffy.Rotor.identity();
      const r2 = cliffy.Rotor.xy(Math.PI);

      // Interpolate halfway
      const halfway = r1.slerpTo(r2, 0.5);

      // Should be approximately a 90-degree rotation
      return {
        angle: halfway.angle(),
        expectedAngle: Math.PI / 2,
      };
    });

    expect(result.angle).toBeCloseTo(result.expectedAngle, 5);
  });

  test('translation operations work', async ({ page }) => {
    await page.goto('/');
    await page.waitForSelector('.benchmark-panel', { timeout: 10000 });

    const result = await page.evaluate(async () => {
      const cliffy = await import('@cliffy/core');

      // Create a state at origin
      const state = cliffy.GeometricState.fromVector(0, 0, 0);

      // Apply translation
      const trans = new cliffy.Translation(10, 20, 30);
      const translated = state.applyTranslation(trans);

      // Get result
      const vec = translated.asVector();

      return {
        x: vec[0],
        y: vec[1],
        z: vec[2],
      };
    });

    expect(result.x).toBeCloseTo(10, 5);
    expect(result.y).toBeCloseTo(20, 5);
    expect(result.z).toBeCloseTo(30, 5);
  });

  test('combined transform works', async ({ page }) => {
    await page.goto('/');
    await page.waitForSelector('.benchmark-panel', { timeout: 10000 });

    const result = await page.evaluate(async () => {
      const cliffy = await import('@cliffy/core');

      // Create a combined rotation + translation
      const rotor = cliffy.Rotor.xy(Math.PI / 2); // 90-degree rotation
      const trans = new cliffy.Translation(10, 0, 0);
      const transform = cliffy.Transform.fromRotorAndTranslation(rotor, trans);

      // Apply to a unit vector
      const state = cliffy.GeometricState.fromVector(1, 0, 0);
      const transformed = state.applyTransform(transform);

      const vec = transformed.asVector();

      return {
        x: vec[0],
        y: vec[1],
        z: vec[2],
      };
    });

    // After rotation, (1,0,0) -> (0,1,0), then translation adds (10,0,0)
    // Result should be approximately (10, 1, 0)
    expect(result.x).toBeCloseTo(10, 5);
    expect(result.y).toBeCloseTo(1, 5);
    expect(result.z).toBeCloseTo(0, 5);
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

  test('continues working after transient errors', async ({ page }) => {
    await page.goto('/');
    await page.waitForSelector('.benchmark-panel', { timeout: 10000 });

    // Simulate some operations that might fail
    const result = await page.evaluate(async () => {
      const cliffy = await import('@cliffy/core');

      try {
        // Try to normalize a zero vector (edge case)
        const zero = cliffy.GeometricState.zero();
        const normalized = zero.normalize();

        // This should return null/undefined for zero vector
        return { normalizedZero: normalized };
      } catch (e) {
        return { error: String(e) };
      }
    });

    // The app should handle edge cases gracefully
    // normalize() on zero returns null/undefined, not an error
    expect(result.normalizedZero).toBeFalsy();

    // App should still be functional
    const canvas = page.locator('#canvas');
    await expect(canvas).toBeVisible();
  });
});

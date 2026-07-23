/**
 * AC-18: NHS Performance Analytics — Landing Page
 * Tests the GDS-style service start page: NHS header, skip link,
 * heading, "what's inside" section, CTA routing, back navigation,
 * and design system isolation (light mode, not host dark theme).
 */
import { test, expect } from '@playwright/test';
import { loadApp } from './helpers';

async function openAnalyticsLanding(page: Parameters<typeof loadApp>[0]) {
  await loadApp(page);
  await page.getByRole('tab', { name: 'Performance analytics' }).click();
  await page.locator('[data-testid="analytics-start-now-btn"]').waitFor({ timeout: 10_000 });
}

test.describe('AC-18 · NHS Analytics Landing Page', () => {
  test('NHS header is visible on landing page', async ({ page }) => {
    await openAnalyticsLanding(page);
    await expect(page.locator('text=NHS')).toBeVisible();
    await expect(page.locator('text=Patient Feedback Intelligence')).toBeVisible();
  });

  test('correct H1 is shown on landing page', async ({ page }) => {
    await openAnalyticsLanding(page);
    await expect(page.getByRole('heading', { level: 1, name: /Performance analytics for patient feedback/i })).toBeVisible();
  });

  test('skip link is the first focusable element and becomes visible on focus', async ({ page }) => {
    await openAnalyticsLanding(page);
    // Tab once from the body — skip link should receive focus first
    await page.keyboard.press('Tab');
    const skipLink = page.locator('[data-testid="analytics-skip-link"]');
    await expect(skipLink).toBeFocused({ timeout: 3_000 });
    // Must be visually present when focused (not visually-hidden)
    const box = await skipLink.boundingBox();
    expect(box).not.toBeNull();
    expect(box!.width).toBeGreaterThan(0);
    expect(box!.height).toBeGreaterThan(0);
  });

  test("what's inside section lists analytics features", async ({ page }) => {
    await openAnalyticsLanding(page);
    await expect(page.locator('text=North star metric')).toBeVisible();
    await expect(page.locator('text=Four product drivers')).toBeVisible();
    await expect(page.locator('text=Technical health')).toBeVisible();
    await expect(page.locator('text=AI layer')).toBeVisible();
    await expect(page.locator('text=Signals archive')).toBeVisible();
  });

  test('"View analytics" primary button navigates to analytics dashboard', async ({ page }) => {
    await openAnalyticsLanding(page);
    await page.locator('[data-testid="analytics-start-now-btn"]').click();
    await expect(page.locator('[data-testid="analytics-dashboard-frame"]')).toBeVisible({ timeout: 10_000 });
  });

  test('back link on landing page returns to host (tab panel resets)', async ({ page }) => {
    await openAnalyticsLanding(page);
    await page.locator('[data-testid="analytics-start-back-link"]').click();
    // Landing page overlay gone
    await expect(page.locator('[data-testid="analytics-start-now-btn"]')).not.toBeVisible({ timeout: 5_000 });
    // Host main content visible
    await expect(page.locator('text=Patient Feedback Intelligence Platform').first()).toBeVisible({ timeout: 5_000 });
  });

  test('landing page uses NHS light theme not host dark theme', async ({ page }) => {
    await openAnalyticsLanding(page);
    // The landing page root must have white / light background
    const root = page.locator('.nhs-analytics-start').first();
    await expect(root).toBeVisible();
    const bg = await root.evaluate(el => getComputedStyle(el).backgroundColor);
    // White: rgb(255, 255, 255)
    expect(bg).toBe('rgb(255, 255, 255)');
  });

  test('DEMO DATA ONLY is visible in footer', async ({ page }) => {
    await openAnalyticsLanding(page);
    await expect(page.locator('text=DEMO DATA ONLY').first()).toBeVisible();
  });
});

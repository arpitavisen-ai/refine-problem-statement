/**
 * AC-13: NHS Service Start Page
 * Verifies the start page renders as the microsite entry point, contains the
 * required content and accessibility features, and routes correctly to the
 * dashboard and back to the host.
 */
import { test, expect } from '@playwright/test';
import { loadApp } from './helpers';

async function openStartPage(page: Parameters<typeof loadApp>[0]) {
  await loadApp(page);
  await page.getByRole('tab', { name: 'NHS platform' }).click();
  await expect(page.locator('[data-testid="nhs-start-now-btn"]')).toBeVisible({ timeout: 10_000 });
}

test.describe('AC-13 · NHS Service Start Page', () => {

  // ─── Entry routing ─────────────────────────────────────────────────────────

  test('NHS Platform tab lands on start page, not the dashboard', async ({ page }) => {
    await openStartPage(page);
    // Start page visible
    await expect(page.locator('[data-testid="nhs-start-now-btn"]')).toBeVisible();
    // Dashboard iframe must NOT be present
    await expect(page.locator('[data-testid="nhs-dashboard-frame"]')).not.toBeVisible();
  });

  // ─── Skip link (QA Fix #1) ─────────────────────────────────────────────────

  test('skip link is the first focusable element and becomes visible on focus', async ({ page }) => {
    await openStartPage(page);
    // Tab once from the page to reach the first focusable element
    await page.keyboard.press('Tab');
    const focusedTestId = await page.evaluate(() => {
      const el = document.activeElement as HTMLElement;
      return el?.getAttribute('data-testid') ?? el?.tagName;
    });
    expect(focusedTestId).toBe('nhs-skip-link');
    // When focused, skip link must be in viewport (not clipped to 1×1)
    const skipLink = page.locator('[data-testid="nhs-skip-link"]');
    const box = await skipLink.boundingBox();
    expect(box).not.toBeNull();
    expect(box!.width).toBeGreaterThan(10);
    expect(box!.y).toBeLessThan(50);  // near the top of the viewport
  });

  // ─── Navigation ───────────────────────────────────────────────────────────

  test('"Start now" button navigates to the dashboard', async ({ page }) => {
    await openStartPage(page);
    await page.locator('[data-testid="nhs-start-now-btn"]').click();
    await expect(page.locator('[data-testid="nhs-dashboard-frame"]')).toBeVisible({ timeout: 10_000 });
    await expect(page.locator('[data-testid="nhs-start-now-btn"]')).not.toBeVisible();
  });

  test('back link from start page returns to the host showcase', async ({ page }) => {
    await openStartPage(page);
    await page.locator('[data-testid="nhs-start-back-link"]').click();
    // NHS overlay dismissed
    await expect(page.locator('[data-testid="nhs-start-now-btn"]')).not.toBeVisible({ timeout: 5_000 });
    // Host hero section visible again
    await expect(page.locator('text=Patient Feedback').first()).toBeVisible();
  });

  test('re-entering NHS tab after exit shows start page again', async ({ page }) => {
    await openStartPage(page);
    // Exit to host
    await page.locator('[data-testid="nhs-start-back-link"]').click();
    await expect(page.locator('[data-testid="nhs-start-now-btn"]')).not.toBeVisible({ timeout: 5_000 });
    // Re-enter NHS tab
    await page.getByRole('tab', { name: 'NHS platform' }).click();
    // Should land on start page again, not dashboard
    await expect(page.locator('[data-testid="nhs-start-now-btn"]')).toBeVisible({ timeout: 10_000 });
    await expect(page.locator('[data-testid="nhs-dashboard-frame"]')).not.toBeVisible();
  });

  // ─── Design system (NHS light, not host dark theme) ────────────────────────

  test('start page renders NHS light design system (not host dark theme)', async ({ page }) => {
    await openStartPage(page);
    const header = page.locator('.nhs-header').first();
    const bg = await header.evaluate(el => getComputedStyle(el).backgroundColor);
    // NHS blue #005bbb → rgb(0, 91, 187)
    expect(bg).toMatch(/0,\s*91,\s*187/);
    // Body background should be white, not dark
    const body = page.locator('.nhs-start-page').first();
    const bodyBg = await body.evaluate(el => getComputedStyle(el).backgroundColor);
    expect(bodyBg).toMatch(/255,\s*255,\s*255/);
  });

  // ─── Required content ─────────────────────────────────────────────────────

  test('DEMO DATA ONLY flag is visible', async ({ page }) => {
    await openStartPage(page);
    await expect(page.locator('.demo-flag').first()).toBeVisible();
    await expect(page.locator('text=DEMO DATA ONLY').first()).toBeVisible();
  });

  test('✦ AI provenance marker is present', async ({ page }) => {
    await openStartPage(page);
    await expect(page.locator('text=AI-assisted').first()).toBeVisible();
    // Inline AI marker in body copy
    await expect(page.locator('.ai-inline').first()).toBeVisible();
  });

  test('three persona cards are visible with correct role labels', async ({ page }) => {
    await openStartPage(page);
    const cards = page.locator('.persona-card');
    await expect(cards).toHaveCount(3);
    await expect(page.locator('text=Chief Nurse').first()).toBeVisible();
    await expect(page.locator('text=Quality Manager').first()).toBeVisible();
    await expect(page.locator('text=Ward Manager').first()).toBeVisible();
  });

  test('all five dashboard feature items are listed', async ({ page }) => {
    await openStartPage(page);
    await expect(page.locator('.inside-list li')).toHaveCount(5);
    await expect(page.locator('text=National FFT benchmark').first()).toBeVisible();
    await expect(page.locator('text=Board pack export').first()).toBeVisible();
    await expect(page.locator('text=CQC evidence bundle').first()).toBeVisible();
  });

  test('second "Start now" button at foot of content works', async ({ page }) => {
    await openStartPage(page);
    // Scroll to the bottom Start now button (inside .start-again)
    const bottomBtn = page.locator('.start-again .start-btn');
    await bottomBtn.scrollIntoViewIfNeeded();
    await bottomBtn.click();
    await expect(page.locator('[data-testid="nhs-dashboard-frame"]')).toBeVisible({ timeout: 10_000 });
  });
});

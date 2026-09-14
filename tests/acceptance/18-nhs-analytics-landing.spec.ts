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
    // Scoped to the banner landmark: a bare `text=NHS` matches 9 elements on an
    // NHS-branded page and trips strict mode. The intent here is the NHS header.
    const banner = page.getByRole('banner');
    await expect(banner.locator('.nhs-logo-mark')).toHaveText('NHS');
    await expect(banner.locator('.nhs-logo-text')).toHaveText('Patient Feedback Intelligence');
  });

  test('correct H1 is shown on landing page', async ({ page }) => {
    await openAnalyticsLanding(page);
    await expect(page.getByRole('heading', { level: 1, name: /Performance analytics for patient feedback/i })).toBeVisible();
  });

  /**
   * KNOWN ISSUE — fails against a real accessibility defect, not a test defect.
   *
   * The microsite opens as a full-screen overlay rendered AFTER the host's tab bar in
   * the DOM (skip link at document index ~109; the host's first tab button at ~60).
   * The host content is left in the tab order behind the overlay -- it is not inert and
   * focus is not moved into the overlay on open. So the skip link added for WCAG 2.4.1
   * (AD-09) is not reachable as the first tab stop: after clicking the tab, focus sits
   * on the tab button, and one Tab lands on an intermediate DIV.
   *
   * Verified reproducible on BOTH microsites, and it still reproduces after explicitly
   * blurring to reset focus -- so it is structural, not an artefact of the test's
   * starting focus.
   *
   * Left FAILING rather than skipped so the defect stays visible. The assertion is
   * correct; the fix belongs in the host overlay (move focus into the overlay on open
   * and mark the background inert).
   * Full write-up: DEPLOYMENT_REPORT.md, section 7.
   */
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
    // Each of these labels appears more than once (in-page nav item + section
    // heading), so an unqualified text locator trips strict mode. The assertion
    // here is presence in the "what's inside" list, so first match is sufficient.
    for (const feature of [
      'North star metric',
      'Four product drivers',
      'Technical health',
      'AI layer',
      'Signals archive',
    ]) {
      await expect(page.locator(`text=${feature}`).first()).toBeVisible();
    }
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

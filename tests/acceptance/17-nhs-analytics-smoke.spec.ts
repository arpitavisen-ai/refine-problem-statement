/**
 * AC-17: NHS Performance Analytics — Smoke
 * Verifies the analytics tab exists, is positioned after the NHS platform tab,
 * and that clicking it shows the landing page (not the dashboard directly).
 */
import { test, expect } from '@playwright/test';
import { loadApp, goToTab } from './helpers';

test.describe('AC-17 · NHS Analytics smoke', () => {
  test('all tabs render including Performance analytics', async ({ page }) => {
    await loadApp(page);
    const expectedTabs = [
      'AI in PDLC',
      'Use Case - NHS Platform',
      'Tasks',
      'Draft Script',
      'NHS platform',
      'Performance analytics',
    ];
    for (const label of expectedTabs) {
      await expect(page.getByRole('tab', { name: label })).toBeVisible();
    }
  });

  test('Performance analytics tab appears after NHS platform tab', async ({ page }) => {
    await loadApp(page);
    const tabs = page.getByRole('tab');
    const allTabLabels = await tabs.allTextContents();
    const nhsIdx = allTabLabels.findIndex(t => t.includes('NHS platform'));
    const analyticsIdx = allTabLabels.findIndex(t => t.includes('Performance analytics'));
    expect(nhsIdx).toBeGreaterThan(-1);
    expect(analyticsIdx).toBeGreaterThan(nhsIdx);
  });

  test('clicking analytics tab shows landing page not dashboard', async ({ page }) => {
    await loadApp(page);
    await page.getByRole('tab', { name: 'Performance analytics' }).click();
    // Landing page start button must be visible
    await expect(page.locator('[data-testid="analytics-start-now-btn"]')).toBeVisible({ timeout: 10_000 });
    // Dashboard iframe must NOT be visible yet
    await expect(page.locator('[data-testid="analytics-dashboard-frame"]')).not.toBeVisible();
  });

  test('no console errors on analytics landing page load', async ({ page }) => {
    const errors: string[] = [];
    page.on('console', msg => { if (msg.type() === 'error') errors.push(msg.text()); });
    await loadApp(page);
    await page.getByRole('tab', { name: 'Performance analytics' }).click();
    await page.locator('[data-testid="analytics-start-now-btn"]').waitFor({ timeout: 10_000 });
    // Allow console errors from unrelated sources — filter only JS runtime errors
    const jsErrors = errors.filter(e => !e.includes('favicon') && !e.includes('ERR_BLOCKED'));
    expect(jsErrors).toHaveLength(0);
  });
});

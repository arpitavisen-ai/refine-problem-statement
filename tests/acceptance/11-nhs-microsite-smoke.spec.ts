/**
 * AC-11: NHS Microsite Smoke Test
 * Verifies the app boots with all 6 nav entries, the NHS Platform tab appears
 * after Tasks, the dashboard frame mounts, and there are no console errors.
 */
import { test, expect } from '@playwright/test';
import { loadApp } from './helpers';

test.describe('AC-11 · NHS Microsite Smoke', () => {
  test('app renders all 6 navigation tabs', async ({ page }) => {
    await loadApp(page);
    for (const label of ['AI in PDLC', 'Use Case - NHS Platform', 'Tasks', 'Draft Script']) {
      await expect(page.getByRole('tab', { name: label })).toBeVisible();
    }
    // getByRole name matching is substring + case-insensitive, so { name: 'NHS platform' }
    // also matches 'Use Case - NHS Platform' and trips strict mode. The tab restructure
    // (99d5e81) introduced that collision. Use the test ids the app exposes.
    await expect(page.getByTestId('tab-nhs')).toBeVisible();
    await expect(page.getByTestId('tab-analytics')).toBeVisible();
  });

  test('NHS Platform tab appears after Tasks in the tab list', async ({ page }) => {
    await loadApp(page);
    // The tab restructure (99d5e81) added a second NHS-matching tab, 'Use Case - NHS
    // Platform', which sits *before* Tasks. Matching on /nhs/i therefore found the wrong
    // one. Identify the microsite tab by its test id and compare DOM order.
    const order = await page.evaluate(() => {
      const tabs = [...document.querySelectorAll('[role="tab"]')];
      return {
        nhs: tabs.findIndex(t => t.getAttribute('data-testid') === 'tab-nhs'),
        tasks: tabs.findIndex(t => (t.textContent ?? '').trim() === 'Tasks'),
      };
    });
    expect(order.nhs).toBeGreaterThan(-1);
    expect(order.tasks).toBeGreaterThan(-1);
    expect(order.nhs).toBeGreaterThan(order.tasks);
  });

  test('clicking NHS tab shows the start page (not the dashboard directly)', async ({ page }) => {
    await loadApp(page);
    await page.getByTestId('tab-nhs').click();
    // Start page entry — "Start now" button must be visible
    await expect(page.locator('[data-testid="nhs-start-now-btn"]')).toBeVisible({ timeout: 10_000 });
    // Dashboard frame must NOT be visible yet (requires clicking Start now)
    await expect(page.locator('[data-testid="nhs-dashboard-frame"]')).not.toBeVisible();
  });

  test('no console errors when navigating to NHS tab', async ({ page }) => {
    const errors: string[] = [];
    page.on('pageerror', e => errors.push(e.message));
    await loadApp(page);
    await page.getByTestId('tab-nhs').click();
    await page.waitForTimeout(2_000);
    expect(errors.filter(e => !e.includes('ResizeObserver'))).toHaveLength(0);
  });
});

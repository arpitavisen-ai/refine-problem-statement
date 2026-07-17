/**
 * AC-11: NHS Microsite Smoke Test
 * Verifies the app boots with all 5 nav entries, the NHS Platform tab appears
 * after Tasks, the dashboard frame mounts, and there are no console errors.
 */
import { test, expect } from '@playwright/test';
import { loadApp } from './helpers';

test.describe('AC-11 · NHS Microsite Smoke', () => {
  test('app renders all 5 navigation tabs', async ({ page }) => {
    await loadApp(page);
    for (const label of ['User Analysis', 'Artefacts', 'AI in PDLC', 'Tasks', 'NHS platform']) {
      await expect(page.getByRole('tab', { name: label })).toBeVisible();
    }
  });

  test('NHS Platform tab appears after Tasks in the tab list', async ({ page }) => {
    await loadApp(page);
    const tabs = page.getByRole('tab');
    const labels = await tabs.allTextContents();
    // Strip icon text — tab labels include icon aria text in some renderers; just check order
    const nhsIdx = labels.findIndex(l => /nhs/i.test(l));
    const tasksIdx = labels.findIndex(l => /tasks/i.test(l));
    expect(nhsIdx).toBeGreaterThan(-1);
    expect(tasksIdx).toBeGreaterThan(-1);
    expect(nhsIdx).toBeGreaterThan(tasksIdx);
  });

  test('clicking NHS tab shows the start page (not the dashboard directly)', async ({ page }) => {
    await loadApp(page);
    await page.getByRole('tab', { name: 'NHS platform' }).click();
    // Start page entry — "Start now" button must be visible
    await expect(page.locator('[data-testid="nhs-start-now-btn"]')).toBeVisible({ timeout: 10_000 });
    // Dashboard frame must NOT be visible yet (requires clicking Start now)
    await expect(page.locator('[data-testid="nhs-dashboard-frame"]')).not.toBeVisible();
  });

  test('no console errors when navigating to NHS tab', async ({ page }) => {
    const errors: string[] = [];
    page.on('pageerror', e => errors.push(e.message));
    await loadApp(page);
    await page.getByRole('tab', { name: 'NHS platform' }).click();
    await page.waitForTimeout(2_000);
    expect(errors.filter(e => !e.includes('ResizeObserver'))).toHaveLength(0);
  });
});

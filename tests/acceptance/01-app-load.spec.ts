/**
 * AC-01: App Load & Initial Render
 * Verifies the app boots, Firebase hydrates, and all structural elements are present.
 */
import { test, expect } from '@playwright/test';
import { loadApp, goToTab } from './helpers';

test.describe('AC-01 · App Load & Initial Render', () => {
  test('page title is present', async ({ page }) => {
    await loadApp(page);
    await expect(page).toHaveTitle(/.+/);
  });

  // The hero used to carry the problem statement; the hero simplification (50c13e7) reduced
  // it to an eyebrow plus the page H1, and moved the problem statement into the Use Case tab
  // — where 02-problem-statement asserts it. This test covers what the hero renders now.
  test('hero section renders the page heading', async ({ page }) => {
    await loadApp(page);
    await expect(
      page.getByRole('heading', { level: 1, name: 'AI in Product Management' }),
    ).toBeVisible();
  });

  // The tab restructure (99d5e81, DD-13) replaced User Analysis / Artefacts / PDLC with the
  // six tabs below: four content tabs, plus the two built microsites.
  test('all 6 navigation tabs are visible', async ({ page }) => {
    await loadApp(page);
    for (const tab of ['AI in PDLC', 'Use Case - NHS Platform', 'Tasks', 'Draft Script']) {
      await expect(page.getByRole('tab', { name: tab })).toBeVisible();
    }
    // getByRole name matching is substring + case-insensitive, so { name: 'NHS platform' }
    // also matches the 'Use Case - NHS Platform' tab and trips strict mode. The tab
    // restructure (99d5e81) introduced that collision. Use the test ids the app exposes.
    await expect(page.getByTestId('tab-nhs')).toBeVisible();
    await expect(page.getByTestId('tab-analytics')).toBeVisible();
  });

  // The stats grid moved into the Use Case tab with the problem statement; the app now opens
  // on the AI in PDLC tab, so it is no longer on the landing view.
  test('stat cards display personas, research, and tasks counts', async ({ page }) => {
    await loadApp(page);
    await goToTab(page, 'Use Case - NHS Platform');
    await expect(page.locator('text=User Personas').first()).toBeVisible();
    await expect(page.locator('text=Research Activities').first()).toBeVisible();
    await expect(page.locator('text=Tasks').first()).toBeVisible();
  });

  test('no JS console errors on load', async ({ page }) => {
    const errors: string[] = [];
    page.on('pageerror', e => errors.push(e.message));
    await loadApp(page);
    await page.waitForTimeout(2000);
    expect(errors.filter(e => !e.includes('ResizeObserver'))).toHaveLength(0);
  });
});

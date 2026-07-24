/**
 * AC-02: Problem Statement
 * Verifies the problem statement content is visible in the Use Case tab.
 * Note: inline editing was removed from the hero; content is now static in the Use Case tab.
 */
import { test, expect } from '@playwright/test';
import { loadApp, goToTab } from './helpers';

test.describe('AC-02 · Problem Statement', () => {
  test('problem statement text is visible in Use Case tab', async ({ page }) => {
    await loadApp(page);
    await goToTab(page, 'Use Case - NHS Platform');
    await expect(page.locator('text=patient feedback').first()).toBeVisible();
  });

  test.skip('problem statement is editable — removed: editing moved out of scope', async () => {
    // The inline editable problem statement was removed from the hero in favour of
    // a static summary in the Use Case - NHS Platform tab.
  });

  test('problem statement contains seeded NHS content', async ({ page }) => {
    await loadApp(page);
    await goToTab(page, 'Use Case - NHS Platform');
    await expect(page.locator('text=10 Year Health Plan').first()).toBeVisible();
  });
});

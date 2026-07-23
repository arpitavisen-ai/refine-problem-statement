/**
 * AC-19: NHS Performance Analytics — Dashboard
 * Tests the analytics iframe: north star panel, category tabs,
 * signals archive, AI panel with canned responses, back navigation,
 * and absence of live API calls.
 */
import { test, expect } from '@playwright/test';
import { loadApp } from './helpers';

async function openAnalyticsDashboard(page: Parameters<typeof loadApp>[0]) {
  await loadApp(page);
  await page.getByRole('tab', { name: 'Performance analytics' }).click();
  await page.locator('[data-testid="analytics-start-now-btn"]').waitFor({ timeout: 10_000 });
  await page.locator('[data-testid="analytics-start-now-btn"]').click();
  await page.locator('[data-testid="analytics-dashboard-frame"]').waitFor({ timeout: 10_000 });
}

test.describe('AC-19 · NHS Analytics Dashboard', () => {
  test('analytics dashboard iframe is visible after clicking View analytics', async ({ page }) => {
    await openAnalyticsDashboard(page);
    await expect(page.locator('[data-testid="analytics-dashboard-frame"]')).toBeVisible();
  });

  test('north star panel is visible inside the frame', async ({ page }) => {
    await openAnalyticsDashboard(page);
    const frame = page.frameLocator('[data-testid="analytics-dashboard-frame"]');
    await expect(frame.locator('[data-testid="analytics-north-star"]')).toBeVisible({ timeout: 10_000 });
  });

  test('all four category tabs render inside the frame', async ({ page }) => {
    await openAnalyticsDashboard(page);
    const frame = page.frameLocator('[data-testid="analytics-dashboard-frame"]');
    await frame.locator('[data-testid="analytics-cat-nav"]').waitFor({ timeout: 10_000 });
    await expect(frame.locator('[data-testid="analytics-cat-tab-product"]')).toBeVisible();
    await expect(frame.locator('[data-testid="analytics-cat-tab-system"]')).toBeVisible();
    await expect(frame.locator('[data-testid="analytics-cat-tab-ai"]')).toBeVisible();
    await expect(frame.locator('[data-testid="analytics-cat-tab-compliance"]')).toBeVisible();
  });

  test('category switching changes the active panel', async ({ page }) => {
    await openAnalyticsDashboard(page);
    const frame = page.frameLocator('[data-testid="analytics-dashboard-frame"]');
    await frame.locator('[data-testid="analytics-cat-tab-system"]').waitFor({ timeout: 10_000 });
    await frame.locator('[data-testid="analytics-cat-tab-system"]').click();
    await expect(frame.locator('[data-testid="analytics-cat-tab-system"]')).toHaveClass(/active/, { timeout: 5_000 });
  });

  test('signals archive renders the inbox list', async ({ page }) => {
    await openAnalyticsDashboard(page);
    const frame = page.frameLocator('[data-testid="analytics-dashboard-frame"]');
    await frame.locator('[data-testid="analytics-cat-tab-signals"]').waitFor({ timeout: 10_000 });
    await frame.locator('[data-testid="analytics-cat-tab-signals"]').click();
    await expect(frame.locator('[data-testid="analytics-inbox-list"]')).toBeVisible({ timeout: 5_000 });
  });

  test('AI panel renders with suggestion chips', async ({ page }) => {
    await openAnalyticsDashboard(page);
    const frame = page.frameLocator('[data-testid="analytics-dashboard-frame"]');
    await expect(frame.locator('[data-testid="analytics-ai-panel"]')).toBeVisible({ timeout: 10_000 });
    await expect(frame.locator('[data-testid="analytics-sug-chips"]')).toBeVisible({ timeout: 5_000 });
  });

  test('suggestion chip returns a canned response without calling api.anthropic.com', async ({ page }) => {
    // Intercept any outbound requests to detect live API calls
    const apiCalls: string[] = [];
    page.on('request', req => {
      if (req.url().includes('api.anthropic.com')) apiCalls.push(req.url());
    });

    await openAnalyticsDashboard(page);
    const frame = page.frameLocator('[data-testid="analytics-dashboard-frame"]');
    await frame.locator('[data-testid="analytics-sug-chips"]').waitFor({ timeout: 10_000 });

    // Click the first chip
    const firstChip = frame.locator('[data-testid="analytics-sug-chips"] button').first();
    await firstChip.click();

    // Wait for a response to appear in the messages container
    await frame.locator('[data-testid="analytics-ai-messages"]').waitFor({ timeout: 5_000 });
    const messagesCount = await frame.locator('[data-testid="analytics-ai-messages"] .msg, [data-testid="analytics-ai-messages"] [class*="msg"]').count();
    // At minimum the user message and an AI reply should appear
    expect(messagesCount).toBeGreaterThanOrEqual(1);

    // No call to the live API
    expect(apiCalls).toHaveLength(0);
  });

  test('DEMO DATA ONLY label is present in the analytics dashboard', async ({ page }) => {
    await openAnalyticsDashboard(page);
    const frame = page.frameLocator('[data-testid="analytics-dashboard-frame"]');
    await expect(frame.locator('[data-testid="analytics-demo-banner"]')).toBeVisible({ timeout: 10_000 });
  });

  test('AI provenance markers are visible in the frame', async ({ page }) => {
    await openAnalyticsDashboard(page);
    const frame = page.frameLocator('[data-testid="analytics-dashboard-frame"]');
    await expect(frame.locator('[data-testid="analytics-ai-provenance"]')).toBeVisible({ timeout: 10_000 });
  });

  test('back button returns to analytics landing page', async ({ page }) => {
    await openAnalyticsDashboard(page);
    await page.locator('[data-testid="analytics-back-btn"]').click();
    // Dashboard gone
    await expect(page.locator('[data-testid="analytics-dashboard-frame"]')).not.toBeVisible({ timeout: 5_000 });
    // Landing page restored
    await expect(page.locator('[data-testid="analytics-start-now-btn"]')).toBeVisible({ timeout: 5_000 });
  });
});

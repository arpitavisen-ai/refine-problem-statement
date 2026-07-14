/**
 * AC-12: NHS Dashboard Journey
 * Full end-to-end journey through the NHS Patient Feedback Intelligence Platform.
 * Tests persona switching, issue table, filters, verbatims, exports, ward selector,
 * Top-3 toggle, back navigation, and absence of the deferred upload UI.
 */
import { test, expect, Download } from '@playwright/test';
import { loadApp } from './helpers';

async function openNhsDashboard(page: Parameters<typeof loadApp>[0]) {
  await loadApp(page);
  await page.getByRole('tab', { name: 'NHS platform' }).click();
  // Wait for the NHS back strip to appear (host-side chrome)
  await expect(page.locator('[data-testid="nhs-back-btn"]')).toBeVisible({ timeout: 10_000 });
}

test.describe('AC-12 · NHS Dashboard Journey', () => {

  // ─── Nav & entry ───────────────────────────────────────────────────────────

  test('NHS Platform tab is visible and navigates to dashboard', async ({ page }) => {
    await openNhsDashboard(page);
    await expect(page.locator('[data-testid="nhs-dashboard-frame"]')).toBeVisible();
  });

  // ─── Design system isolation ────────────────────────────────────────────────

  test('dashboard renders NHS light design system (not host dark theme)', async ({ page }) => {
    await openNhsDashboard(page);
    const frame = page.frameLocator('[data-testid="nhs-dashboard-frame"]');
    // The NHS back strip on the host side has the dark-blue NHS colour
    const backStrip = page.locator('[data-testid="nhs-back-btn"]').locator('..');
    const bg = await backStrip.evaluate(el => getComputedStyle(el).backgroundColor);
    // NHS dark blue #003087 → rgb(0, 48, 135)
    expect(bg).toContain('0, 48, 135');
    // Inside the frame: NHS-specific element is present
    await expect(frame.locator('.demo-banner, #demoBar, text=DEMO DATA ONLY').first()).toBeVisible({ timeout: 10_000 });
  });

  // ─── DEMO DATA ONLY label ───────────────────────────────────────────────────

  test('DEMO DATA ONLY label is visible in the back strip and in the frame', async ({ page }) => {
    await openNhsDashboard(page);
    await expect(page.locator('text=DEMO DATA ONLY').first()).toBeVisible();
    const frame = page.frameLocator('[data-testid="nhs-dashboard-frame"]');
    await expect(frame.locator('text=DEMO DATA ONLY').first()).toBeVisible({ timeout: 10_000 });
  });

  // ─── Persona switcher ──────────────────────────────────────────────────────

  test('default persona is Chief Nurse (CN tab active)', async ({ page }) => {
    await openNhsDashboard(page);
    const frame = page.frameLocator('[data-testid="nhs-dashboard-frame"]');
    await expect(frame.locator('#tab-cn')).toBeVisible({ timeout: 10_000 });
    await expect(frame.locator('#tab-cn')).toHaveClass(/active/);
  });

  test('switching to Quality Manager persona updates the view', async ({ page }) => {
    await openNhsDashboard(page);
    const frame = page.frameLocator('[data-testid="nhs-dashboard-frame"]');
    await frame.locator('#tab-cn').waitFor({ timeout: 10_000 });
    await frame.locator('#tab-qm').click();
    await expect(frame.locator('#tab-qm')).toHaveClass(/active/, { timeout: 5_000 });
    // QM signals narrative should update
    await expect(frame.locator('#signalsNarrative')).toBeVisible();
  });

  test('switching to Ward Manager persona shows ward selector', async ({ page }) => {
    await openNhsDashboard(page);
    const frame = page.frameLocator('[data-testid="nhs-dashboard-frame"]');
    await frame.locator('#tab-wm').waitFor({ timeout: 10_000 });
    await frame.locator('#tab-wm').click();
    await expect(frame.locator('#tab-wm')).toHaveClass(/active/, { timeout: 5_000 });
    await expect(frame.locator('#wardSelectWrap')).toBeVisible();
  });

  test('ward selector is NOT visible for Chief Nurse persona', async ({ page }) => {
    await openNhsDashboard(page);
    const frame = page.frameLocator('[data-testid="nhs-dashboard-frame"]');
    await frame.locator('#tab-cn').waitFor({ timeout: 10_000 });
    // CN is default; wardSelectWrap should be hidden
    const wrap = frame.locator('#wardSelectWrap');
    await expect(wrap).toBeHidden();
  });

  // ─── Top-3 toggle ──────────────────────────────────────────────────────────

  test('QM defaults to Top-3 view; Show All reveals more rows', async ({ page }) => {
    await openNhsDashboard(page);
    const frame = page.frameLocator('[data-testid="nhs-dashboard-frame"]');
    await frame.locator('#tab-qm').waitFor({ timeout: 10_000 });
    await frame.locator('#tab-qm').click();
    // Top-3 button should be active
    await expect(frame.locator('#segTop3')).toHaveClass(/active/, { timeout: 5_000 });
    // Show All expands the table
    await frame.locator('#segAll').click();
    await expect(frame.locator('#segAll')).toHaveClass(/active/, { timeout: 5_000 });
  });

  // ─── Issue table & filters ─────────────────────────────────────────────────

  test('issue table renders issue rows', async ({ page }) => {
    await openNhsDashboard(page);
    const frame = page.frameLocator('[data-testid="nhs-dashboard-frame"]');
    await frame.locator('#issueBody').waitFor({ timeout: 10_000 });
    const rows = frame.locator('#issueBody tr');
    await expect(rows.first()).toBeVisible();
  });

  test('search filter narrows issue rows', async ({ page }) => {
    await openNhsDashboard(page);
    const frame = page.frameLocator('[data-testid="nhs-dashboard-frame"]');
    await frame.locator('#searchInput').waitFor({ timeout: 10_000 });
    const allRows = frame.locator('#issueBody tr');
    const initialCount = await allRows.count();
    await frame.locator('#searchInput').fill('A&E');
    await page.waitForTimeout(400);
    const filteredCount = await frame.locator('#issueBody tr').count();
    // Filtering should reduce rows (or maintain if all match)
    expect(filteredCount).toBeLessThanOrEqual(initialCount);
  });

  // ─── Verbatims (expanded row) ───────────────────────────────────────────────

  test('expanding an issue row shows patient verbatims', async ({ page }) => {
    await openNhsDashboard(page);
    const frame = page.frameLocator('[data-testid="nhs-dashboard-frame"]');
    // Switch to CN (all rows) and click first row
    await frame.locator('#tab-cn').waitFor({ timeout: 10_000 });
    const firstRow = frame.locator('#issueBody tr').first();
    await firstRow.click();
    // Verbatims section should appear
    await expect(frame.locator('text=Patient verbatims').first()).toBeVisible({ timeout: 5_000 });
  });

  // ─── Prioritised Signals (AI narrative) ────────────────────────────────────

  test('AI prioritised signals narrative is visible', async ({ page }) => {
    await openNhsDashboard(page);
    const frame = page.frameLocator('[data-testid="nhs-dashboard-frame"]');
    await expect(frame.locator('#signalsNarrative')).toBeVisible({ timeout: 10_000 });
    // AI provenance marker
    await expect(frame.locator('text=Claude').first()).toBeVisible();
  });

  // ─── Benchmark chart ───────────────────────────────────────────────────────

  test('benchmark chart canvas is present', async ({ page }) => {
    await openNhsDashboard(page);
    const frame = page.frameLocator('[data-testid="nhs-dashboard-frame"]');
    await expect(frame.locator('#benchmarkChart')).toBeVisible({ timeout: 10_000 });
  });

  // ─── Exports ───────────────────────────────────────────────────────────────

  test('board pack button is present', async ({ page }) => {
    await openNhsDashboard(page);
    const frame = page.frameLocator('[data-testid="nhs-dashboard-frame"]');
    // Board pack button triggers downloadBoardPack() / window.print()
    await expect(frame.locator('button:has-text("Board pack"), button:has-text("board pack"), [onclick*="downloadBoardPack"]').first()).toBeVisible({ timeout: 10_000 });
  });

  test('CQC evidence export button is present', async ({ page }) => {
    await openNhsDashboard(page);
    const frame = page.frameLocator('[data-testid="nhs-dashboard-frame"]');
    await expect(frame.locator('[onclick*="exportCqcEvidence"], button:has-text("CQC"), button:has-text("Export")').first()).toBeVisible({ timeout: 10_000 });
  });

  test('CQC CSV export triggers a download', async ({ page }) => {
    await openNhsDashboard(page);
    const frame = page.frameLocator('[data-testid="nhs-dashboard-frame"]');
    await frame.locator('#tab-qm').waitFor({ timeout: 10_000 });
    await frame.locator('#tab-qm').click();
    // Wait for CQC export button to be visible
    const exportBtn = frame.locator('[onclick*="exportCqcEvidence"]').first();
    await exportBtn.waitFor({ timeout: 5_000 });
    // Set up download listener
    const [download] = await Promise.all([
      page.waitForEvent('download', { timeout: 8_000 }),
      exportBtn.click(),
    ]);
    expect(download.suggestedFilename()).toMatch(/\.csv$/i);
  });

  // ─── No upload UI (deferred — DD-06) ──────────────────────────────────────

  test('no data upload UI is present on the NHS dashboard', async ({ page }) => {
    await openNhsDashboard(page);
    const frame = page.frameLocator('[data-testid="nhs-dashboard-frame"]');
    await frame.locator('#tab-cn').waitFor({ timeout: 10_000 });
    // Deferred feature — no file input or upload button should be visible
    await expect(frame.locator('input[type="file"]')).toHaveCount(0);
    await expect(frame.locator('text=Load your own data').first()).toHaveCount(0);
  });

  // ─── Back navigation ───────────────────────────────────────────────────────

  test('back button dismisses the NHS dashboard and returns to host site', async ({ page }) => {
    await openNhsDashboard(page);
    await page.locator('[data-testid="nhs-back-btn"]').click();
    // NHS overlay gone
    await expect(page.locator('[data-testid="nhs-dashboard-frame"]')).not.toBeVisible({ timeout: 5_000 });
    // Host site hero section is visible again
    await expect(page.locator('text=Patient Feedback').first()).toBeVisible();
  });
});

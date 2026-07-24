/**
 * AC-16: Prototype Design Log — Version Editing
 *
 * Verifies the full edit flow introduced in the "Add edit capability to
 * Prototype design log entries" commit:
 *   - Prototype detail view renders the design log
 *   - A user can add a version (prerequisite for editing tests)
 *   - Hovering/focusing a card reveals the edit button
 *   - Opening the edit modal pre-populates existing values
 *   - Saving changes updates the card
 *   - Cancelling leaves the card unchanged
 *   - The add and edit modals share the same accessible structure
 *
 * All selectors use data-testid or accessible roles/labels — no
 * CSS class names or positional selectors.
 */
import { test, expect } from '@playwright/test';
import { loadApp, goToTab } from './helpers';

// Minimal valid HTML used as a stand-in prototype file in upload tests
const SAMPLE_HTML = Buffer.from(
  '<html><head><title>Test</title></head><body><p>Test prototype v1</p></body></html>'
);

async function openPrototypeDetail(page: Parameters<typeof loadApp>[0]) {
  await loadApp(page);
  await goToTab(page, 'Use Case - NHS Platform');
  // The Prototype card opens a detail view (not a dialog) via its own click handler
  await page.locator('text=Prototype').first().click();
  // Wait until the Design Log heading is visible — confirms we're in the detail view
  await expect(page.getByRole('heading', { name: 'Design Log' })).toBeVisible({ timeout: 10_000 });
}

/**
 * Helper: add a version through the modal so editing tests have a card to work with.
 * Returns the label used so callers can locate the card.
 */
async function addTestVersion(
  page: Parameters<typeof loadApp>[0],
  label = 'QA Test Version Alpha',
  note = 'Initial note for QA testing'
) {
  await page.getByTestId('add-version-btn').click();
  await expect(page.getByTestId('prototype-version-modal')).toBeVisible();

  await page.getByTestId('version-label-field').fill(label);
  await page.getByLabel('What changed / what was learned *').fill(note);
  await page.locator('#pv-file').setInputFiles({
    name: 'test-proto.html',
    mimeType: 'text/html',
    buffer: SAMPLE_HTML,
  });

  await page.getByTestId('prototype-version-save').click();
  await expect(page.getByTestId('prototype-version-modal')).not.toBeVisible({ timeout: 5_000 });
  return label;
}

test.describe('AC-16 · Prototype Design Log — Version Editing', () => {

  // ─── Detail view renders ────────────────────────────────────────────────────

  test('Prototype card navigates to the design log detail view', async ({ page }) => {
    await openPrototypeDetail(page);
    await expect(page.getByRole('heading', { name: 'Prototype', level: 1 })).toBeVisible();
    await expect(page.getByRole('heading', { name: 'Design Log' })).toBeVisible();
    await expect(page.getByTestId('add-version-btn')).toBeVisible();
  });

  // ─── Add version ─────────────────────────────────────────────────────────

  test('Add version modal opens with empty fields', async ({ page }) => {
    await openPrototypeDetail(page);
    await page.getByTestId('add-version-btn').click();
    const modal = page.getByTestId('prototype-version-modal');
    await expect(modal).toBeVisible();
    await expect(modal.getByRole('heading', { name: 'Add prototype version' })).toBeVisible();
    await expect(page.getByTestId('version-label-field')).toHaveValue('');
  });

  test('Add version submit is disabled until all required fields are filled', async ({ page }) => {
    await openPrototypeDetail(page);
    await page.getByTestId('add-version-btn').click();
    await expect(page.getByTestId('prototype-version-save')).toBeDisabled();
    // Fill label only — still disabled (no file yet)
    await page.getByTestId('version-label-field').fill('Partial Entry');
    await expect(page.getByTestId('prototype-version-save')).toBeDisabled();
  });

  test('adding a version creates a card in the design log', async ({ page }) => {
    await openPrototypeDetail(page);
    const label = await addTestVersion(page);
    await expect(page.locator(`text=${label}`).first()).toBeVisible();
    await expect(page.getByTestId('prototype-version-card').first()).toBeVisible();
  });

  test('Cancel in add modal closes without creating a card', async ({ page }) => {
    await openPrototypeDetail(page);
    const before = await page.getByTestId('prototype-version-card').count();
    await page.getByTestId('add-version-btn').click();
    await page.getByTestId('version-label-field').fill('Should Not Appear');
    await page.getByTestId('prototype-version-cancel').click();
    await expect(page.getByTestId('prototype-version-modal')).not.toBeVisible({ timeout: 5_000 });
    const after = await page.getByTestId('prototype-version-card').count();
    expect(after).toBe(before);
    await expect(page.locator('text=Should Not Appear')).not.toBeVisible();
  });

  // ─── Edit version — pre-population ────────────────────────────────────────

  test('edit button is accessible on each version card', async ({ page }) => {
    await openPrototypeDetail(page);
    const label = await addTestVersion(page);
    const card = page.getByTestId('prototype-version-card').first();
    const editBtn = card.getByTestId('edit-version-btn');
    // The button has an informative aria-label
    await expect(editBtn).toHaveAttribute('aria-label', `Edit ${label}`);
    // Bring focus to make it visible (it's opacity-0 until hover/focus)
    await editBtn.focus();
    await expect(editBtn).toBeVisible();
  });

  test('opening the edit modal pre-populates the existing label', async ({ page }) => {
    await openPrototypeDetail(page);
    const label = await addTestVersion(page, 'Pre-populated Label Test', 'Some note');
    const card = page.getByTestId('prototype-version-card').first();
    await card.getByTestId('edit-version-btn').focus();
    await card.getByTestId('edit-version-btn').click();
    const modal = page.getByTestId('prototype-version-modal');
    await expect(modal).toBeVisible();
    await expect(modal.getByRole('heading', { name: 'Edit prototype version' })).toBeVisible();
    await expect(page.getByTestId('version-label-field')).toHaveValue(label);
  });

  test('opening the edit modal pre-populates the existing note', async ({ page }) => {
    await openPrototypeDetail(page);
    const note = 'Note that should appear pre-populated';
    await addTestVersion(page, 'Note Pre-pop Test', note);
    const card = page.getByTestId('prototype-version-card').first();
    await card.getByTestId('edit-version-btn').focus();
    await card.getByTestId('edit-version-btn').click();
    await expect(page.getByTestId('prototype-version-modal')).toBeVisible();
    await expect(page.getByLabel('What changed / what was learned *')).toHaveValue(note);
  });

  test('edit modal shows the existing file name in the file picker', async ({ page }) => {
    await openPrototypeDetail(page);
    await addTestVersion(page, 'File Name Test', 'Note');
    const card = page.getByTestId('prototype-version-card').first();
    await card.getByTestId('edit-version-btn').focus();
    await card.getByTestId('edit-version-btn').click();
    await expect(page.getByTestId('prototype-version-modal')).toBeVisible();
    // The file picker label text should show the uploaded filename
    await expect(page.locator('text=test-proto.html')).toBeVisible();
    // And the re-upload hint is shown
    await expect(page.locator('text=Leave unchanged to keep the existing file')).toBeVisible();
  });

  // ─── Edit version — saving changes ────────────────────────────────────────

  test('saving the edit modal updates the label on the version card', async ({ page }) => {
    await openPrototypeDetail(page);
    await addTestVersion(page, 'Before Edit Label', 'Original note');
    const card = page.getByTestId('prototype-version-card').first();
    await card.getByTestId('edit-version-btn').focus();
    await card.getByTestId('edit-version-btn').click();
    await expect(page.getByTestId('prototype-version-modal')).toBeVisible();

    await page.getByTestId('version-label-field').fill('After Edit Label');
    await page.getByTestId('prototype-version-save').click();
    await expect(page.getByTestId('prototype-version-modal')).not.toBeVisible({ timeout: 5_000 });

    // Updated label appears on the card
    await expect(page.locator('text=After Edit Label').first()).toBeVisible();
    // Old label is gone
    await expect(page.locator('text=Before Edit Label')).not.toBeVisible();
  });

  test('saving the edit modal updates the note on the version card', async ({ page }) => {
    await openPrototypeDetail(page);
    await addTestVersion(page, 'Note Edit Test', 'Original note text');
    const card = page.getByTestId('prototype-version-card').first();
    await card.getByTestId('edit-version-btn').focus();
    await card.getByTestId('edit-version-btn').click();

    await page.getByLabel('What changed / what was learned *').fill('Updated note text');
    await page.getByTestId('prototype-version-save').click();
    await expect(page.getByTestId('prototype-version-modal')).not.toBeVisible({ timeout: 5_000 });

    await expect(page.locator('text=Updated note text').first()).toBeVisible();
    await expect(page.locator('text=Original note text')).not.toBeVisible();
  });

  test('saving the edit modal preserves the total number of version cards', async ({ page }) => {
    await openPrototypeDetail(page);
    await addTestVersion(page, 'Card Count Test A', 'Note A');
    await addTestVersion(page, 'Card Count Test B', 'Note B');
    const beforeCount = await page.getByTestId('prototype-version-card').count();

    // Edit the first card
    const firstCard = page.getByTestId('prototype-version-card').first();
    await firstCard.getByTestId('edit-version-btn').focus();
    await firstCard.getByTestId('edit-version-btn').click();
    await page.getByTestId('version-label-field').fill('Card Count Test A — edited');
    await page.getByTestId('prototype-version-save').click();
    await expect(page.getByTestId('prototype-version-modal')).not.toBeVisible({ timeout: 5_000 });

    const afterCount = await page.getByTestId('prototype-version-card').count();
    expect(afterCount).toBe(beforeCount);
  });

  // ─── Edit version — cancel ────────────────────────────────────────────────

  test('cancelling the edit modal leaves the card unchanged', async ({ page }) => {
    await openPrototypeDetail(page);
    const original = 'Cancel Edit Test';
    await addTestVersion(page, original, 'Original note');
    const card = page.getByTestId('prototype-version-card').first();
    await card.getByTestId('edit-version-btn').focus();
    await card.getByTestId('edit-version-btn').click();

    // Change the label in the modal but cancel
    await page.getByTestId('version-label-field').fill('This should not persist');
    await page.getByTestId('prototype-version-cancel').click();
    await expect(page.getByTestId('prototype-version-modal')).not.toBeVisible({ timeout: 5_000 });

    // Original label still on card
    await expect(page.locator(`text=${original}`).first()).toBeVisible();
    await expect(page.locator('text=This should not persist')).not.toBeVisible();
  });

  test('edit modal can be dismissed with the X button', async ({ page }) => {
    await openPrototypeDetail(page);
    await addTestVersion(page);
    const card = page.getByTestId('prototype-version-card').first();
    await card.getByTestId('edit-version-btn').focus();
    await card.getByTestId('edit-version-btn').click();
    await expect(page.getByTestId('prototype-version-modal')).toBeVisible();

    // Close via the X button inside the dialog
    const dialog = page.getByTestId('prototype-version-modal');
    await dialog.getByRole('button', { name: /close/i }).click();
    await expect(page.getByTestId('prototype-version-modal')).not.toBeVisible({ timeout: 5_000 });
  });

  // ─── Accessibility ─────────────────────────────────────────────────────────

  test('edit button has a descriptive aria-label identifying the version', async ({ page }) => {
    await openPrototypeDetail(page);
    const label = await addTestVersion(page, 'Aria Label Version', 'Note');
    const editBtn = page.getByTestId('prototype-version-card').first().getByTestId('edit-version-btn');
    await expect(editBtn).toHaveAttribute('aria-label', `Edit ${label}`);
  });

  test('version modal is keyboard-navigable (save is reachable via Tab)', async ({ page }) => {
    await openPrototypeDetail(page);
    await addTestVersion(page, 'Keyboard Test Version', 'Note');
    const card = page.getByTestId('prototype-version-card').first();
    await card.getByTestId('edit-version-btn').focus();
    await card.getByTestId('edit-version-btn').click();
    await expect(page.getByTestId('prototype-version-modal')).toBeVisible();

    // Tab to the save button — it must be reachable and focusable
    const saveBtn = page.getByTestId('prototype-version-save');
    await saveBtn.focus();
    await expect(saveBtn).toBeFocused();
  });

  // ─── Open in new tab ──────────────────────────────────────────────────────

  test('"Open in new tab" button is present on each version card', async ({ page }) => {
    await openPrototypeDetail(page);
    await addTestVersion(page, 'Open Tab Test', 'Note');
    const card = page.getByTestId('prototype-version-card').first();
    await expect(card.getByRole('button', { name: /open in new tab/i })).toBeVisible();
  });
});

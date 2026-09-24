import { test, expect, type Page } from '@playwright/test';

/**
 * AC-21 — Two-column framework hero with the clickable six-phase diagram (DD-14).
 *
 * Guards the restructure in public/new-ui/spe-framework.html: the copy column and
 * the diagram column must not collide at either breakpoint, the diagram must link
 * out to the Thought Leadership page, and the existing stepper contract
 * ([data-goto] controls + .step buttons) must keep working untouched.
 */

const FRAMEWORK = '/new-ui/spe-framework.html';

async function gotoFramework(page: Page) {
  const errors: string[] = [];
  page.on('console', (m) => { if (m.type() === 'error') errors.push(m.text()); });
  page.on('pageerror', (e) => errors.push(String(e)));
  const res = await page.goto(FRAMEWORK, { waitUntil: 'load' });
  expect(res?.status()).toBe(200);
  return errors;
}

test.describe('AC-21 · framework hero, two-column with diagram', () => {
  for (const width of [1440, 390]) {
    test(`diagram does not overlap the hero actions at ${width}px`, async ({ page }) => {
      await page.setViewportSize({ width, height: 900 });
      await gotoFramework(page);

      const link = page.locator('.hero .hero-orbit__link');
      const actions = page.locator('.hero .actions');
      await expect(link).toBeVisible();
      await expect(actions).toBeVisible();

      const a = (await link.boundingBox())!;
      const b = (await actions.boundingBox())!;
      expect(a, 'diagram link has no box').toBeTruthy();
      expect(b, 'actions has no box').toBeTruthy();

      // Axis-aligned rectangle intersection must be empty.
      const overlapX = Math.max(0, Math.min(a.x + a.width, b.x + b.width) - Math.max(a.x, b.x));
      const overlapY = Math.max(0, Math.min(a.y + a.height, b.y + b.height) - Math.max(a.y, b.y));
      expect(overlapX * overlapY, `diagram intersects .actions at ${width}px`).toBe(0);
    });
  }

  test('diagram is a single link pointing at the framework stepper', async ({ page }) => {
    await gotoFramework(page);
    const link = page.locator('.hero .hero-orbit__link');
    await expect(link).toHaveCount(1);
    // Placeholder target pending spe-thought-leadership-pdlc.html (DD-14).
    await expect(link).toHaveAttribute('href', '#framework');
    await expect(link).toHaveAttribute('aria-label', /Read the framework in depth/);
    // exactly one SVG inside, no per-satellite links
    await expect(link.locator('svg.hero-orbit')).toHaveCount(1);
    await expect(link.locator('a')).toHaveCount(0);
  });

  // While the target is the #framework placeholder (DD-14) the click is a same-page
  // jump, so it can be asserted for real. When the article lands, this becomes a
  // navigation assertion against spe-thought-leadership-pdlc.html.
  test('clicking the diagram lands on the framework stepper, not a 404', async ({ page }) => {
    await gotoFramework(page);
    const section = page.locator('#framework');
    await expect(section).toHaveCount(1);
    await page.locator('.hero .hero-orbit__link').click();
    await expect(page).toHaveURL(/#framework$/);
    await expect(section).toBeInViewport();
  });

  test('the six phase labels are present in the diagram', async ({ page }) => {
    await gotoFramework(page);
    const svg = page.locator('.hero .hero-orbit');
    for (const name of ['Strategy', 'Discovery', 'Design', 'Delivery', 'Validation', 'monitoring']) {
      await expect(svg.getByText(name, { exact: false }).first()).toBeAttached();
    }
    await expect(svg.getByText('The Crucible')).toBeAttached();
  });

  test('hero copy is unchanged and the primary CTA is still the stepper entry point', async ({ page }) => {
    await gotoFramework(page);
    await expect(page.locator('.hero h1')).toHaveText(/AI across the whole product development lifecycle\./);
    const primary = page.locator('.hero .actions a[data-goto="0"]');
    await expect(primary).toHaveText(/Walk the six phases/);
    await expect(page.locator('.hero .caption').first())
      .toHaveText(/6 phases · 5 stage gates · 18 AI touchpoints · 1 case live/);
  });

  test('all 11 [data-goto] controls and 6 steps survive the restructure', async ({ page }) => {
    await gotoFramework(page);
    // 1 hero CTA + 10 phase-nav buttons (5 next + 5 back)
    await expect(page.locator('[data-goto]')).toHaveCount(11);
    await expect(page.locator('.step')).toHaveCount(6);
    await expect(page.locator('.hero .actions a[data-goto="0"]')).toHaveCount(1);
  });

  test('hero CTA and every phase-nav "next" still activate the right panel', async ({ page }) => {
    await gotoFramework(page);

    // hero [data-goto="0"] -> phase 1
    await page.locator('.hero .actions a[data-goto="0"]').click();
    await expect(page.locator('.step[data-index="0"]')).toHaveAttribute('aria-current', 'step');
    await expect(page.locator('#phase-01')).toBeVisible();

    // walk forward through the visible panel's own next button
    for (const i of [1, 2, 3, 4, 5]) {
      const panel = `#phase-0${i}`;                    // currently visible panel
      await page.locator(`${panel} [data-goto="${i}"]`).click();
      await expect(page.locator(`.step[data-index="${i}"]`)).toHaveAttribute('aria-current', 'step');
      await expect(page.locator(`#phase-0${i + 1}`)).toBeVisible();
    }
  });

  test('phase-nav "back" controls still activate the right panel', async ({ page }) => {
    await gotoFramework(page);
    await page.locator('.step[data-index="5"]').click();
    await expect(page.locator('#phase-06')).toBeVisible();

    for (const i of [5, 4, 3, 2, 1]) {
      await page.locator(`#phase-0${i + 1} [data-goto="${i - 1}"]`).click();
      await expect(page.locator(`.step[data-index="${i - 1}"]`)).toHaveAttribute('aria-current', 'step');
      await expect(page.locator(`#phase-0${i}`)).toBeVisible();
    }
  });

  test('framework page loads with no console errors', async ({ page }) => {
    const errors = await gotoFramework(page);
    expect(errors, errors.join('\n')).toEqual([]);
  });
});

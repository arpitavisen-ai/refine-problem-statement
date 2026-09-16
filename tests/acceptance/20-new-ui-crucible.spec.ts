import { test, expect } from '@playwright/test';
import { loadApp } from './helpers';

/**
 * AC-20 — "New UI" entry point and the S&PE Product AI Crucible static section (AD-13).
 *
 * The four Crucible pages are static HTML served from /new-ui/. Their own detailed
 * behavioural suite lives at qa/qa_final.mjs (run with QA_BASE_URL=<origin>/new-ui).
 * This spec covers what CI must guard: the badge exists on the host home page, the
 * navigation works, the four pages load clean, and the cross-page links resolve.
 */

const PAGES = [
  '/new-ui/spe-framework.html',
  '/new-ui/spe-case-foundry.html',
  '/new-ui/spe-case-01-nhs.html',
  '/new-ui/spe-resources.html',
];

test.describe('AC-20 · New UI entry point', () => {
  test('badge is visible on the home page without scrolling', async ({ page }) => {
    await loadApp(page);
    const badge = page.getByTestId('new-ui-badge');
    await expect(badge).toBeVisible();
    await expect(badge).toHaveText(/New UI/);
    await expect(badge).toHaveAttribute('href', '/new-ui/spe-framework.html');
  });

  test('badge is visible at a 390px mobile viewport and has a 44px tap target', async ({ page }) => {
    await page.setViewportSize({ width: 390, height: 844 });
    await loadApp(page);
    const badge = page.getByTestId('new-ui-badge');
    await expect(badge).toBeInViewport();
    const box = await badge.boundingBox();
    expect(box!.height).toBeGreaterThanOrEqual(44);
  });

  test('clicking the badge navigates to the framework page in the same tab', async ({ page }) => {
    await loadApp(page);
    await page.getByTestId('new-ui-badge').click();
    await page.waitForURL('**/new-ui/spe-framework.html');
    await expect(page.locator('h1')).toHaveCount(1);
  });
});

test.describe('AC-20 · Crucible pages load and link correctly', () => {
  for (const path of PAGES) {
    test(`${path} loads with no page errors and correct landmarks`, async ({ page }) => {
      const errors: string[] = [];
      page.on('pageerror', e => errors.push(String(e)));

      const response = await page.goto(path);
      expect(response?.status()).toBe(200);

      await expect(page.locator('h1')).toHaveCount(1);
      for (const landmark of ['header', 'nav', 'main', 'footer']) {
        expect(await page.locator(landmark).count()).toBeGreaterThanOrEqual(1);
      }
      expect(errors).toEqual([]);
    });

    test(`${path} has a working link back to the host home page`, async ({ page }) => {
      await page.goto(path);
      const home = page.locator('#primary-nav a[href="/"]');
      await expect(home).toHaveCount(1);
      await expect(home).toHaveText('Showcase home');
    });

    test(`${path} keeps its demo/synthetic-data provenance labelling`, async ({ page }) => {
      await page.goto(path);
      const body = (await page.locator('body').innerText()).toLowerCase();
      expect(body).toMatch(/demo|synthetic/);
    });
  }

  test('framework nav links resolve to the deployed pages', async ({ page }) => {
    await page.goto('/new-ui/spe-framework.html');
    for (const [label, expected] of [
      ['Thought Leadership', 'spe-resources.html'],
      ['Method', 'spe-framework.html#method'],
    ] as const) {
      await expect(page.locator(`#primary-nav a:has-text("${label}")`)).toHaveAttribute(
        'href',
        expected,
      );
    }
    await page.locator('#primary-nav a[href="spe-case-foundry.html"]').click();
    await page.waitForURL('**/spe-case-foundry.html');
  });

  test('foundry exposes exactly one live case, linking to the NHS case', async ({ page }) => {
    await page.goto('/new-ui/spe-case-foundry.html');
    await expect(page.locator('.foundry__row')).toHaveCount(5);

    // Exactly one row is clickable. That row carries two anchors (the title and the
    // trailing call-to-action), both pointing at the same case — so assert on the
    // number of *linked rows*, not the number of anchors.
    const linked = await page.evaluate(() =>
      [...document.querySelectorAll('.foundry__row')]
        .map(r => [...r.querySelectorAll('a')].map(a => a.getAttribute('href')))
        .filter(hrefs => hrefs.length > 0),
    );
    expect(linked).toHaveLength(1);
    expect(new Set(linked[0])).toEqual(new Set(['spe-case-01-nhs.html']));
  });

  test('NHS case page links back to the framework and the foundry', async ({ page }) => {
    await page.goto('/new-ui/spe-case-01-nhs.html');
    await expect(
      page.locator('a.btn--back[href="spe-framework.html#framework"]'),
    ).toHaveCount(1);
    await expect(page.locator('a[href="spe-case-foundry.html"]').first()).toBeVisible();
  });

  test('no in-page anchor link points at a missing target', async ({ page }) => {
    for (const path of PAGES) {
      await page.goto(path);
      const broken = await page.evaluate(() => {
        const ids = [...document.querySelectorAll('a[href^="#"]')]
          .map(a => a.getAttribute('href')!)
          .filter(h => h !== '#');
        return [...new Set(ids)].filter(h => !document.querySelector(h));
      });
      expect(broken, `broken anchors on ${path}`).toEqual([]);
    }
  });

  /**
   * The 6px overflow previously allowed for spe-case-01-nhs.html is gone. Its cause was
   * the `.visually-hidden.evidence-input` file input inside `.evidence__rows`, which kept
   * its ~176px intrinsic width and was not fully clipped. AD-15 replaced the upload
   * affordance with static links, so the input no longer exists and the page now measures
   * 0px at 390px. The budget is retired rather than left as a standing allowance.
   */
  const OVERFLOW_BUDGET_PX: Record<string, number> = {};

  test('no horizontal overflow at 390px beyond the known upstream budget', async ({ page }) => {
    await page.setViewportSize({ width: 390, height: 844 });
    for (const path of PAGES) {
      await page.goto(path);
      const overflow = await page.evaluate(
        () => document.documentElement.scrollWidth - window.innerWidth,
      );
      expect(overflow, `horizontal overflow on ${path}`).toBeLessThanOrEqual(
        OVERFLOW_BUDGET_PX[path] ?? 1,
      );
    }
  });
});

test.describe('AC-20 · Framework walkthrough behaviour survives the move', () => {
  test('clicking a step opens exactly one phase panel', async ({ page }) => {
    await page.goto('/new-ui/spe-framework.html');
    await page.locator('#framework').scrollIntoViewIfNeeded();
    await page.locator('.step[data-index="2"]').click();
    await expect(page.locator('.phase:not([hidden])')).toHaveCount(1);
    await expect(page.locator('.phase:not([hidden])')).toHaveAttribute('id', 'phase-03');
  });

  test('show-all reveals six panels and toggles back', async ({ page }) => {
    await page.goto('/new-ui/spe-framework.html');
    await page.locator('#show-all').click();
    await expect(page.locator('.phase:not([hidden])')).toHaveCount(6);
    await page.locator('#show-all').click();
    await expect(page.locator('.phase:not([hidden])')).toHaveCount(1);
  });

  test('timeline builds up as phases are visited', async ({ page }) => {
    await page.goto('/new-ui/spe-framework.html');
    await page.locator('#framework').scrollIntoViewIfNeeded();
    const activeRows = page.locator('.tl__row[data-row][data-on="true"]');
    await expect(activeRows).toHaveCount(3);
    for (let i = 1; i <= 5; i++) {
      await page.locator(`#phase-0${i} [data-goto="${i}"]`).click();
    }
    await expect(activeRows).toHaveCount(15);
  });

  test('live region and timeline text alternative are present', async ({ page }) => {
    await page.goto('/new-ui/spe-framework.html');
    await expect(page.locator('[role="status"][aria-live="polite"]')).toHaveCount(1);
    const described = await page.evaluate(() => {
      const tl = document.getElementById('timeline')!;
      const target = document.getElementById(tl.getAttribute('aria-describedby')!);
      return { role: tl.getAttribute('role'), len: target?.textContent?.length ?? 0 };
    });
    expect(described.role).toBe('group');
    expect(described.len).toBeGreaterThan(200);
  });

  test('mobile navigation menu opens on every page', async ({ page }) => {
    await page.setViewportSize({ width: 390, height: 844 });
    for (const path of PAGES) {
      await page.goto(path);
      await page.locator('.site-header__menu-button').click();
      await expect(page.locator('#primary-nav a').first()).toBeVisible();
      await page.locator('.site-header__menu-button').click();
    }
  });
});

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

/**
 * AC-20b — the NHS case page's Evidence & attachments section is driven by a single
 * inline manifest (`CASE_01_ARTEFACTS`), exposed for tests as `window.__CASE_01_ARTEFACTS__`.
 *
 * Every expectation here is read from that manifest at run time. No test in this file
 * hard-codes a row count: adding an entry to the manifest is the only step needed to
 * add a row, and these assertions follow it.
 */

const CASE = '/new-ui/spe-case-01-nhs.html';

type Artefact = {
  id: string;
  phase: string;
  title: string;
  kind: 'document' | 'content' | 'pending';
  description: string;
  href?: string;
  body?: string;
};

async function manifest(page: import('@playwright/test').Page): Promise<Artefact[]> {
  return page.evaluate(() => (window as unknown as { __CASE_01_ARTEFACTS__: Artefact[] }).__CASE_01_ARTEFACTS__);
}

/** Reveals all six phase panels so every evidence block is in the DOM at once. */
async function openAllPhases(page: import('@playwright/test').Page) {
  await page.locator('#show-all').click();
  await expect(page.locator('.phase:not([hidden])')).toHaveCount(6);
}

test.describe('AC-20b · Case 01 artefact section is manifest-driven', () => {
  test('the manifest is well formed: every entry carries the fields its kind needs', async ({ page }) => {
    await page.goto(CASE);
    const items = await manifest(page);

    expect(items.length).toBeGreaterThan(0);
    expect(new Set(items.map(i => i.id)).size).toBe(items.length);

    for (const item of items) {
      expect(item.id, `id on ${item.title}`).toBeTruthy();
      expect(item.id.startsWith(`${item.phase}-`), `${item.id} sits under its phase`).toBe(true);
      expect(item.title, `title on ${item.id}`).toBeTruthy();
      expect(item.description, `description on ${item.id}`).toBeTruthy();
      expect(['document', 'content', 'pending'], `kind on ${item.id}`).toContain(item.kind);

      if (item.kind === 'document') expect(item.href, `href on ${item.id}`).toBeTruthy();
      if (item.kind === 'content') expect(item.body, `body on ${item.id}`).toBeTruthy();
      if (item.kind === 'pending') {
        expect(item.body, `${item.id} is pending, so carries no body`).toBeUndefined();
        expect(item.href, `${item.id} is pending, so carries no link`).toBeUndefined();
      }
    }
  });

  test('one row renders per manifest entry, and no row exists without one', async ({ page }) => {
    await page.goto(CASE);
    await openAllPhases(page);
    const items = await manifest(page);

    await expect(page.getByTestId('evidence-row')).toHaveCount(items.length);

    const rendered = await page.evaluate(() =>
      [...document.querySelectorAll('[data-testid="evidence-row"]')].map(r => (r as HTMLElement).dataset.slot),
    );
    expect(rendered.slice().sort()).toEqual(items.map(i => i.id).sort());
  });

  test('per-phase counts and count labels derive from the manifest', async ({ page }) => {
    await page.goto(CASE);
    await openAllPhases(page);
    const items = await manifest(page);

    const phases = [...new Set(items.map(i => i.phase))];
    for (const phase of phases) {
      const expected = items.filter(i => i.phase === phase);
      const block = page.locator(`.evidence[data-phase="${phase}"]`);
      await expect(block.getByTestId('evidence-row')).toHaveCount(expected.length);

      // The label leads with the manifest count for that phase, then breaks it down by kind.
      const label = block.getByTestId('evidence-count');
      await expect(label).toHaveText(
        new RegExp(`^${expected.length} artefacts?\\b`),
      );
      for (const [kind, phrase] of [
        ['content', 'readable here'],
        ['document', 'attached'],
        ['pending', 'not yet produced'],
      ] as const) {
        const n = expected.filter(i => i.kind === kind).length;
        if (n > 0) await expect(label).toContainText(`${n} ${phrase}`);
      }
    }
  });

  test('content rows are keyboard-operable disclosures with the correct ARIA state', async ({ page }) => {
    await page.goto(CASE);
    await openAllPhases(page);
    const items = await manifest(page);
    const first = items.find(i => i.kind === 'content')!;

    const row = page.locator(`[data-slot="${first.id}"]`);
    const summary = row.locator('summary.evidence-row__summary');
    const body = row.locator('.evidence-row__body');

    await expect(summary).toHaveAttribute('aria-expanded', 'false');
    await expect(body).toBeHidden();

    // keyboard only: focus the summary, then toggle with Enter and with Space
    await summary.focus();
    await expect(summary).toBeFocused();

    await page.keyboard.press('Enter');
    await expect(summary).toHaveAttribute('aria-expanded', 'true');
    await expect(body).toBeVisible();

    await page.keyboard.press('Space');
    await expect(summary).toHaveAttribute('aria-expanded', 'false');
    await expect(body).toBeHidden();
  });

  test('every content row opens onto its own non-empty body', async ({ page }) => {
    await page.goto(CASE);
    await openAllPhases(page);
    const items = await manifest(page);

    const lengths = await page.evaluate(() =>
      [...document.querySelectorAll('[data-testid="evidence-row"][data-kind="content"]')].map(r => ({
        slot: (r as HTMLElement).dataset.slot,
        chars: (r.querySelector('.evidence-row__body')?.textContent ?? '').trim().length,
        disclosure: !!r.querySelector('details.evidence-row__disclosure > summary'),
      })),
    );

    expect(lengths).toHaveLength(items.filter(i => i.kind === 'content').length);
    for (const row of lengths) {
      expect(row.disclosure, `${row.slot} is a disclosure`).toBe(true);
      expect(row.chars, `${row.slot} has readable content`).toBeGreaterThan(0);
    }
  });

  test('document rows link out in a new tab and every link resolves', async ({ page, request }) => {
    await page.goto(CASE);
    await openAllPhases(page);
    const items = await manifest(page);
    const documents = items.filter(i => i.kind === 'document');

    for (const item of documents) {
      const link = page.locator(`[data-slot="${item.id}"] a.evidence-row__preview`);
      await expect(link).toHaveAttribute('href', item.href!);
      await expect(link).toHaveAttribute('target', '_blank');
      await expect(link).toHaveAttribute('rel', 'noopener');

      const response = await request.get(item.href!);
      expect(response.status(), `${item.href} resolves`).toBe(200);
    }

    // a document row states the file type and size rather than leaving it to the click
    await expect(
      page.locator(`[data-slot="${documents[0].id}"] .evidence-row__hint`),
    ).toContainText(/\d+\s?KB/);
  });

  test('pending rows show an honest empty state with no link and no body', async ({ page }) => {
    await page.goto(CASE);
    await openAllPhases(page);
    const items = await manifest(page);

    for (const item of items.filter(i => i.kind === 'pending')) {
      const row = page.locator(`[data-slot="${item.id}"]`);
      await expect(row.locator('.evidence-row__status')).toHaveText('Not yet produced');
      await expect(row.locator('a')).toHaveCount(0);
      await expect(row.locator('.evidence-row__body')).toHaveCount(0);
      // the row still explains itself rather than showing a bare empty state
      await expect(row.locator('.evidence-row__desc')).not.toBeEmpty();
    }
  });

  test('expanding every artefact breaks neither heading order nor the 390px width', async ({ page }) => {
    await page.setViewportSize({ width: 390, height: 844 });
    await page.goto(CASE);
    await openAllPhases(page);
    await page.evaluate(() =>
      document.querySelectorAll('details.evidence-row__disclosure').forEach(d => {
        (d as HTMLDetailsElement).open = true;
      }),
    );

    const skips = await page.evaluate(() => {
      const levels = [...document.querySelectorAll('h1,h2,h3,h4,h5,h6')].map(h => Number(h.tagName[1]));
      return levels.filter((level, i) => i > 0 && level > levels[i - 1] + 1).length;
    });
    expect(skips, 'no skipped heading levels with every artefact open').toBe(0);

    const overflow = await page.evaluate(
      () => document.documentElement.scrollWidth - window.innerWidth,
    );
    expect(overflow, 'no horizontal overflow at 390px').toBeLessThanOrEqual(1);
  });

  test('the section still says something useful with JavaScript disabled', async ({ browser }) => {
    const context = await browser.newContext({ javaScriptEnabled: false });
    const page = await context.newPage();
    await page.goto(CASE);

    // With scripting off the rows are not rendered, so each phase falls back to a
    // static <noscript> list. It must not be an empty section.
    const blocks = await page.locator('.evidence[data-phase]').count();
    expect(blocks).toBe(6);

    const fallbacks = await page.evaluate(() =>
      [...document.querySelectorAll('.evidence[data-phase]')].map(b => ({
        phase: (b as HTMLElement).dataset.phase,
        chars: (b.querySelector('noscript')?.textContent ?? '').trim().length,
      })),
    );
    for (const fallback of fallbacks) {
      expect(fallback.chars, `${fallback.phase} has a JS-off fallback`).toBeGreaterThan(40);
    }

    // both attached prototypes stay reachable without scripting
    const html = await page.content();
    expect(html).toContain('nhs-feedback-dashboard-v5_1.html');
    expect(html).toContain('nhs-performance-analytics.html');

    await context.close();
  });

  test('no commercially excluded figure reaches the rendered page', async ({ page }) => {
    await page.goto(CASE);
    await openAllPhases(page);
    await page.evaluate(() =>
      document.querySelectorAll('details.evidence-row__disclosure').forEach(d => {
        (d as HTMLDetailsElement).open = true;
      }),
    );

    // The commercial exclusion applies to this repository as well as to the page, so
    // this guard must not restate any excluded value in order to search for it. It
    // works two ways instead: category terms (labels, not figures), plus a monetary
    // sweep that fails on any £ figure other than the two the exclusion permits. The
    // sweep is the stronger half — it catches a figure nobody has thought of yet.
    //
    // `ARR` and `LOI` are word-bounded and case-sensitive on purpose: a lower-cased
    // substring search hits "narrative", "arrives" and "carried". `pipeline` is not
    // matched as a bare word because the page uses it for the CI and ingest pipelines,
    // which the exclusion does not cover — only its commercial senses are matched. No
    // trust name is matched, because naming one here would put it in the repository;
    // the whole commercial gate is omitted from the page instead.
    const excluded: Array<[RegExp, string]> = [
      [/\bARR\b/, 'ARR'],
      [/\bLOI\b/, 'LOI'],
      [/letter of intent/i, 'letter of intent'],
      [/\bpricing\b/i, 'pricing'],
      [/entry price/i, 'entry price'],
      [/revenue target/i, 'revenue target'],
      [/addressable market/i, 'addressable market'],
      [/per annum/i, 'per annum'],
      [/sales pipeline|pipeline projects/i, 'commercial pipeline'],
    ];

    // The only monetary figures the exclusion allows here: both are cost-avoidance
    // figures in the return case, not pricing, revenue or market sizing.
    const PERMITTED_FIGURES = ['£15k', '£200k'];

    const html = await page.content();
    const hits = excluded.filter(([re]) => re.test(html)).map(([, label]) => label);

    const money = [...html.matchAll(/£\s?\d[\d.,–-]*\s?(?:k|m|bn)?/gi)]
      .map(m => m[0].replace(/\s/g, ''))
      .filter(m => !PERMITTED_FIGURES.includes(m));

    expect(hits, 'commercially excluded terms on the case page').toEqual([]);
    expect(
      [...new Set(money)],
      'monetary figures on the case page beyond the two the exclusion permits',
    ).toEqual([]);
  });
});

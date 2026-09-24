import { test, expect } from '@playwright/test';

/**
 * AC-00 — the suite tests the target the operator asked for (DD-15).
 *
 * A bare `npm test` used to run against production, so local edits were never
 * exercised and the suite reported green on code it had not loaded. This spec
 * makes the resolved target an assertion rather than an assumption, and proves
 * the server on the other end actually answers from that origin.
 */

const PROD_HOST = 'refine-problem-statement.vercel.app';
const LOCAL_HOSTS = ['localhost', '127.0.0.1'];

test('the resolved baseURL matches the requested target', async ({ page, baseURL }) => {
  expect(baseURL, 'baseURL is not configured').toBeTruthy();
  const host = new URL(baseURL!).hostname;

  const explicit = process.env.BASE_URL?.trim() || undefined;
  if (explicit) {
    // Operator override wins over everything else.
    expect(baseURL).toBe(explicit);
  } else if (process.env.PW_TARGET === 'prod') {
    expect(host, 'test:prod must reach the deployed site').toBe(PROD_HOST);
  } else {
    // The default. If this ever asserts a production host again, the
    // regression DD-15 describes has been reintroduced.
    expect(LOCAL_HOSTS, `default run must stay local, got ${host}`).toContain(host);
    expect(host).not.toBe(PROD_HOST);
  }

  // The target must not merely be configured — it must serve the pages.
  const res = await page.goto('/new-ui/spe-framework.html');
  expect(res?.status(), `${baseURL} did not serve the framework page`).toBe(200);
  expect(new URL(page.url()).hostname, 'navigation left the target origin').toBe(host);
});

import { defineConfig, devices } from '@playwright/test';

/**
 * Test target resolution — read this before changing the default (DD-15).
 *
 * The default is LOCAL, deliberately. This config used to default to the
 * production URL, which meant a bare `npm test` silently tested the deployed
 * site: local edits could neither pass nor fail, because nothing local was
 * ever loaded. Production is now opt-in only, via `npm run test:prod` or an
 * explicit BASE_URL.
 *
 * Precedence: explicit BASE_URL  >  PW_TARGET=prod  >  local dist/.
 */
const PROD_URL = 'https://refine-problem-statement.vercel.app';
const LOCAL_URL = 'http://localhost:4173';

// Empty-string BASE_URL counts as unset. CI passes the Vercel preview URL through
// an env var, and an upstream step that yields no URL should not resolve to ''.
const explicit = process.env.BASE_URL?.trim() || undefined;

const BASE_URL = explicit ?? (process.env.PW_TARGET === 'prod' ? PROD_URL : LOCAL_URL);

const isLocal = /^https?:\/\/(localhost|127\.0\.0\.1)(:|\/|$)/.test(BASE_URL);

// Printed once per run so the target is never a guess. Workers re-import this
// config, so skip it there — otherwise it prints once per worker.
if (process.env.PW_TEST_WORKER_INDEX === undefined) {
  console.log(`[playwright] testing against ${BASE_URL}${isLocal ? ' (local dist/)' : ' (deployed)'}`);
}

export default defineConfig({
  testDir: './tests/acceptance',
  timeout: 30_000,
  retries: 1,
  reporter: [['html', { outputFolder: 'tests/report', open: 'never' }], ['list']],
  use: {
    baseURL: BASE_URL,
    headless: true,
    screenshot: 'only-on-failure',
    video: 'retain-on-failure',
    actionTimeout: 10_000,
  },
  // Local runs always rebuild dist/ first. A stale dist/ previously caused a
  // failure that looked like a code defect (see DD-15), so reuseExistingServer
  // is off: an already-running preview server is a hard error, not a shortcut.
  webServer: isLocal
    ? {
        command: 'npm run serve:dist',
        url: BASE_URL,
        reuseExistingServer: false,
        timeout: 180_000,
        stdout: 'pipe',
        stderr: 'pipe',
      }
    : undefined,
  projects: [
    {
      name: 'chromium',
      use: { ...devices['Desktop Chrome'] },
    },
  ],
});

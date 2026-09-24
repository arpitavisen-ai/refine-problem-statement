#!/usr/bin/env node
/**
 * Cross-platform launcher for the acceptance suite (DD-15).
 *
 * Exists so package.json can choose a test target without `cross-env` — which
 * the test:prod script referenced but which was never actually a dependency,
 * so that script could not run at all.
 *
 * Usage:  node scripts/run-playwright.mjs <local|prod> [...playwright args]
 *
 * The target URLs live in playwright.config.ts, not here. This only sets the
 * PW_TARGET switch the config reads. An explicit BASE_URL in the environment
 * still wins over both, so operators keep a full manual escape hatch.
 */
import { spawn } from 'node:child_process';
import { createRequire } from 'node:module';

// Resolve Playwright's own CLI so we can spawn node directly. Going through
// `npx` would need shell:true on Windows, which Node flags as unsafe.
const cli = createRequire(import.meta.url).resolve('@playwright/test/cli');

const [mode, ...passthrough] = process.argv.slice(2);

if (mode !== 'local' && mode !== 'prod') {
  console.error(`run-playwright: expected 'local' or 'prod', got ${JSON.stringify(mode)}`);
  process.exit(2);
}

const env = { ...process.env, PW_TARGET: mode };

if (mode === 'local' && env.BASE_URL) {
  console.warn(
    `[run-playwright] BASE_URL=${env.BASE_URL} is set in the environment and overrides ` +
      `the local default. Unset it to test the local dist/ build.`,
  );
}

const child = spawn(
  process.execPath,
  [cli, 'test', '--config=playwright.config.ts', ...passthrough],
  { env, stdio: 'inherit' },
);

child.on('exit', (code, signal) => process.exit(signal ? 1 : (code ?? 1)));
child.on('error', (err) => {
  console.error(`[run-playwright] failed to start playwright: ${err.message}`);
  process.exit(1);
});

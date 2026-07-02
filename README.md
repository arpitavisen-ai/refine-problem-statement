# Refine Problem Statement

A React + Vite app for documenting and collaborating on product problem statements, personas, and the full Product Development Lifecycle (PDLC). Data is persisted via Firebase and deployments are hosted on Vercel.

---

## Local Development

```bash
npm install --legacy-peer-deps
npm run dev
```

---

## Running Tests

```bash
# Headless (against production)
npm test

# Against a custom URL
BASE_URL=https://your-preview-url.vercel.app npm test

# Headed (visible browser)
npm run test:headed

# View last report
npm run test:report
```

---

## CI / CD

Every push and pull request triggers the pipeline in `.github/workflows/ci.yml`:

1. Deploys a **Vercel preview** build
2. Runs the **Playwright acceptance tests** against the preview URL
3. If tests pass **and** the branch is `main`, promotes the preview to **production**

Production is never updated if tests fail.

### Required GitHub Secrets
https://git-scm.com/book/en/v2/Getting-Started-First-Time-Git-Setup
Add these under **Settings → Secrets and variables → Actions**:

| Secret | Value |
|---|---|
| `VERCEL_TOKEN` | Create at vercel.com → Account Settings → Tokens |
| `VERCEL_ORG_ID` | `team_po7vlKOkbokM2AaiS5pxANXP` |
| `VERCEL_PROJECT_ID` | `prj_1RJWubmmBe9GIdIKgxbF3mgGM70S` |

---

## Figma MCP

To enable the Figma MCP integration, generate a personal token at **figma.com → Account Settings → Personal access tokens** and add it to your local MCP config.

> **Never commit Figma tokens to the repository.** Revoke and regenerate any token that has been pushed.

Figma Token = [set in local MCP config — never commit tokens]

---

## Production URL

[https://refine-problem-statement.vercel.app](https://refine-problem-statement.vercel.app)
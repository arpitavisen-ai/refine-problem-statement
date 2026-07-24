# Project Decision Log

Living document tracking architectural, design, and coding decisions made across this project.
Updated automatically as decisions are made, changed, or removed.

---

## Architectural Decisions

### AD-01 · Firebase Realtime Database as the persistence layer
**Status:** Active  
**Date:** Project inception  
**Decision:** Use Firebase Realtime Database (not Firestore) for all app state persistence.  
**Rationale:** Realtime sync out of the box with `onValue` listeners; no backend needed; simple flat key-value structure suits the app's data shape. Firestore would add query flexibility we don't need.  
**Trade-off:** All data lives under a single project node — no per-user isolation. Acceptable for a shared collaborative tool where all users work on the same product document.

---

### AD-02 · Store all Firebase values as JSON strings
**Status:** Active  
**Date:** Project inception  
**Decision:** Every value written to Firebase is serialised with `JSON.stringify` before write, and deserialised with `JSON.parse` on read.  
**Rationale:** Firebase's Realtime Database silently strips array holes and converts arrays with numeric keys to objects. Storing as a JSON string guarantees exact round-trips for nested arrays, typed fields, and all complex structures without Firebase conversion surprises.  
**Where:** `useFirebaseSync.ts` — all reads parse, all writes stringify.

---

### AD-03 · Versioned seed data pattern — seed-if-empty, never overwrite
**Status:** Active  
**Date:** Project inception  
**Last updated:** 2026-07-03 — fixed overwrite bug  
**Decision:** All default content is defined in `src/app/data/seedData.ts` as `SEED_*` constants alongside a `SEED_VERSION` integer. On app mount, if the stored `dataVersion` is lower than `SEED_VERSION`, each path is seeded **only if it does not already exist in Firebase**. Existing user data is never overwritten.  
**Rationale:** The original implementation used unconditional `set()` calls — every `SEED_VERSION` bump overwrote user edits in Firebase, reverting all in-app changes. The fix uses `seedIfEmpty()`: check the path first, write only if absent. `SEED_VERSION` now signals "check for new empty paths" not "reset everything."  
**When to bump SEED_VERSION:** Only when adding a brand-new Firebase path that needs a default value for first-time users. Never bump it to push content updates to existing users — edit Firebase directly or accept that existing users keep their data.  
**Merge strategy for artefact arrays:** `marketResearch` is merged by artefact `id` — new seed items are appended only if their ID is not already present in Firebase. This allows new artefacts to appear for existing users without touching their edits or the existing items.  
**Current version:** `SEED_VERSION = 7`

---

### AD-04 · Debounced write strategy in `useFirebaseSync`
**Status:** Active  
**Date:** Project inception  
**Decision:** Local state updates are immediate; Firebase writes are debounced by 800ms. A `localPendingRef` flag suppresses incoming Firebase `onValue` events while a local write is in flight.  
**Rationale:** Prevents every keystroke in an editable field from triggering a Firebase write. The pending flag prevents the remote echo from the previous write overwriting the user's in-progress input mid-edit.  
**`flush()` method:** Exposed from the hook so parent components can force an immediate write (e.g. on tab change or explicit Save button).

---

### AD-05 · No user authentication
**Status:** Active  
**Decision:** The app has no login. All users share the same Firebase database with full read/write access.  
**Rationale:** This is a single-team internal discovery tool. Auth would add friction and complexity with no benefit at current scale.  
**Risk:** Anyone with the URL can edit all content. Acceptable for current use; revisit if the tool is opened to broader audiences.

---

### AD-06 · All secrets stored in GitHub Secrets — never committed to the repository
**Status:** Active  
**Date:** 2026-07-02  
**Decision:** No API tokens, credentials, or secrets are committed to the repository. All secrets required by CI/CD are stored in GitHub Actions Secrets (`VERCEL_TOKEN`, `VERCEL_ORG_ID`, `VERCEL_PROJECT_ID`, `ATLASSIAN_TOKEN`). Tokens needed locally only (Figma MCP) go in local config files that are never tracked by git.  
**Rationale:** GitHub's secret scanning blocks pushes containing known token patterns — this was encountered in practice when a Figma token was accidentally committed to README.md and blocked the push entirely. Beyond the CI gate, committed tokens are permanent in git history even after deletion, and are visible to anyone with repo access.  
**Incident:** Figma token (`figd_...`) and Atlassian token were committed to `README.md` in early commits. Both were removed, tokens revoked, and the push was unblocked via GitHub's secret scanning allow-list. The allow-list unblock should only ever be used for already-revoked tokens.  
**Where to add secrets:** GitHub → repo → Settings → Secrets and variables → Actions. For local-only tokens, use a `.env` file covered by `.gitignore` or the tool's own local config (e.g. MCP config for Figma).

---

### AD-08 · NHS dashboard deployed as a decoupled microsite module
**Status:** Active  
**Date:** 2026-07-14  
**Decision:** The NHS Patient Feedback Intelligence dashboard is deployed as a decoupled feature module at `src/microsites/nhs-dashboard/`, deliberately outside the host's `src/app/` tree. It is registered as a fifth nav tab ("NHS platform") with a visual separator marking it as "the product the framework built" rather than another framework section. The tab is lazily loaded (`React.lazy + Suspense`) so the microsite bundle (charts, NHS fonts, data) stays out of the host's initial load. For this MVP the dashboard runs as a self-contained static HTML file (`public/nhs-dashboard/nhs-feedback-dashboard-v5_1.html`) served inside a same-origin iframe, preserving the exact signed-off v5_1 prototype behaviour. The microsite keeps its own NHS Digital light-mode design system (Frutiger W01 → Arial, `#003087`/`#005bbb`) scoped to the `.nhs-microsite` wrapper, isolated from the host's dark theme. The welcome/interstitial page is deferred — the nav entry routes straight to the dashboard; the route is structured so a welcome page can be inserted later without restructuring. Data upload is also deferred (DD-06 removed code is not resurrected). Any future persistence follows AD-02 (JSON strings); the microsite does not write to the host's Firebase paths.  
**Rationale:** The main site is a modular framework showcase; the NHS dashboard is evidence of a built product. Keeping it architecturally separate (no cross-imports beyond the single lazy route and the nav entry link) means it can be lifted to its own repo cleanly and keeps the two codebases from entangling. The iframe approach for MVP preserves the prototype exactly, avoids regression risk on dashboard internals, and — because the iframe is same-origin — allows Playwright to reach inside via `frameLocator` for full acceptance-test coverage. A React port is the natural next step if the dashboard needs deeper host integration.  
**Trade-off:** The iframe is opaque: changes to the dashboard require editing the HTML file directly, and deep-linking into dashboard state is not possible. Acceptable for MVP; a React port would resolve both trade-offs. The `fixed inset-0 z-50` overlay pattern gives the dashboard the full viewport without restructuring the host layout, at the cost of the host header being covered while the NHS tab is active (intentional — stepping into the platform should feel distinct).

---

### AD-07 · Local-first review workflow: develop → main promotion gate
**Status:** Active  
**Last updated:** 2026-07-03  
**Decision:** All development work happens on the `develop` branch. Pushes to `develop` trigger a Vercel **preview** deploy and tests — never production. Production is updated only by running `npm run promote`, which: builds locally, asks for confirmation after local review at `localhost:5173`, then merges `develop → main` and pushes — triggering the CI pipeline that deploys to Vercel production.  
**Rationale:** Prevents untested changes from going directly to production. Local review at `localhost:5173` catches visual and UX issues that Playwright tests may miss. The promote script enforces the sequence: build passes → local review confirmed → merge → deploy.  
**Workflow summary:**
```
npm run dev          ← review at localhost:5173
npm run promote      ← when happy: merges develop→main, pushes, triggers production deploy
```
**Two remotes in use:** `origin` → `github.com/arpvisen/...` (personal); `upstream` → `github.com/arpitavisen-ai/...` (work/AI account). `npm run promote` pushes to `upstream`.

---

### AD-09 · NHS service start page built; deferred welcome page resolved; QA fixes applied
**Status:** Active  
**Date:** 2026-07-14  
**Decision:** The NHS service start page (`NhsStartPage.tsx`) has been built as the microsite's entry point, resolving the deferral recorded in AD-08. The NHS Platform nav entry now routes to the start page first; "Start now" proceeds to the dashboard; back from the dashboard returns to the start page; back from the start page exits to the host showcase. The start page is a faithful React port of the validated `nhs-start-page.html` prototype, keeping all copy, layout, and NHS Digital light-mode styling verbatim. It is lazily loaded as a separate bundle from the dashboard. Two QA fixes were applied at port time: (1) **Skip link** — a "Skip to main content" `<a>` pointing to `#main-content` is the first focusable element in the DOM, addressing the missing WCAG 2.4.1 Bypass Blocks requirement; the link is visually hidden until focused. (2) **Focus token corrected** — changed from `#ffeb3b` (incorrect, from prototype) to `#FFB81C` to match `NhsDashboardPage.tsx` and the CLAUDE.md NHS design system spec exactly. The "How this was built" secondary link navigates the host to the Artefacts tab / PrototypeDetailView via an `onBuildLog` callback prop; a prop is not a cross-boundary import, so AD-08's boundary rule is preserved. Font loading: both start page and dashboard use the Arial/Frutiger local() fallback — consistent and matching across the microsite. Playwright test suite extended: `13-nhs-start-page.spec.ts` added; `11-smoke` and `12-journey` updated to reflect the new start-page entry (the `openNhsDashboard` helper now clicks Start now before asserting dashboard state).  
**Rationale:** The GDS "start using a service" pattern provides context, framing, and persona orientation before the user enters a complex dashboard — standard NHS digital service UX. The skip link and corrected focus token bring the page into WCAG 2.1 AA compliance. Landing the nav entry on a start page rather than directly on the dashboard gives stakeholders a moment to understand what they are about to see, which matters in a demo context.  
**Trade-off:** "How this was built" cannot deep-link directly to PrototypeDetailView because the host has no URL routing — it drives the host's `activeTab` and `artefactDetailId` state via a callback. If URL routing is added later, this upgrades to a real deep link at zero refactor cost. The start page CSS is scoped under `.nhs-start-page` in a standalone import; Tailwind does not process it, so class names are plain strings (no purge concerns).

---

### AD-10 · NHS Performance Analytics microsite added as a second decoupled microsite
**Status:** Active  
**Date:** 2026-07-23  
**Decision:** The NHS Performance Analytics dashboard (`nhs-performance-analytics-v3.html` prototype) is deployed as a second self-contained microsite at `src/microsites/nhs-analytics/`. It follows the same iframe-embed architecture as the NHS Patient Feedback Platform (AD-08): a GDS-style service start page (`NhsAnalyticsStartPage.tsx`) loads first, and "View analytics" opens the prototype in a full-screen iframe (`NhsAnalyticsDashboardPage.tsx`). A sixth tab — "Performance analytics" with a `BarChart2` icon and "Built" badge — appears after the NHS platform tab in the host nav. Chart.js 4.5.1 (UMD) and Lucide vanilla UMD are bundled locally into `public/nhs-analytics/lib/` rather than loaded from CDN at runtime. All HTML special characters use named entities to ensure UTF-8 fidelity. Playwright acceptance tests added in `17-nhs-analytics-smoke.spec.ts`, `18-nhs-analytics-landing.spec.ts`, and `19-nhs-analytics-dashboard.spec.ts`.  
**Rationale:** The iframe approach is consistent with AD-08 and keeps the React bundle free of chart.js initialisation complexity. Bundling libs locally satisfies the "no CDN at runtime" constraint and makes the microsite self-contained. The start-page-first pattern gives stakeholders context before entering the dense analytics view.  
**Trade-off:** The iframe limits deep-linking into specific analytics panels, but for a showcase context this is acceptable. Lucide vanilla (not lucide-react) was required for the HTML file; it is a separate package from the host's `lucide-react` dependency.

---

### AD-11 · Analytics AI assistant uses canned interactive responses (Option B)
**Status:** Active  
**Date:** 2026-07-23  
**Decision:** The AI assistant in the Performance Analytics dashboard returns pre-scripted responses for the four suggestion chips rather than making live calls to the Anthropic API. Free-text queries not matching a chip receive a polite demo notice. The `sendMessage` function uses `setTimeout` (700–1 300 ms) to simulate a typing delay. The `CANNED_RESPONSES` object, `conversationHistory`, `SYSTEM_CONTEXT`, and `fetch()` call to `api.anthropic.com` are all absent from the shipped HTML.  
**Rationale:** A public showcase with no auth layer cannot safely expose an API key. Option B eliminates key management, serverless function overhead, and any risk of abuse or unexpected cost — with zero loss of demo value, since the four chip answers cover every question a stakeholder is likely to ask. Deterministic responses also make the showcase more reliable in live demos.  
**Trade-off:** The assistant cannot answer novel free-text questions. The canned responses are curated to match the most impactful questions; the demo notice for other queries sets expectations correctly.

---

### AD-12 · Client-side password gate (session-only)
**Status:** Active  
**Date:** 2026-07-03  
**Decision:** A `PasswordGate` component wraps the entire app. On first visit the user sees a password prompt; the session token is stored in `sessionStorage` (not `localStorage`) so the gate re-appears when the browser tab is closed.  
**Password:** `spe2026` — hardcoded in `PasswordGate.tsx`.  
**Rationale:** Keeps casual visitors out of the demo without adding Firebase Auth overhead. Acknowledged limitation: the password is visible in the JS bundle — this is intentional for a low-stakes internal demo. If the data ever becomes sensitive, replace with Firebase Auth (see AD-05).  
**Where:** `src/app/components/PasswordGate.tsx`, wraps `<DndProvider>` in `App.tsx`.

---

## Design Decisions

### DD-01 · Static config / editable data split in PDLCSection
**Status:** Active  
**Date:** Early build  
**Decision:** PDLC cards are split into two layers: `PHASE_CONFIG` (icons, colours, accent gradients — never persisted) and `EditablePhase` / `EditableCard` (titles, descriptions, bullets — persisted in Firebase via `useFirebaseSync`).  
**Rationale:** Icons are React nodes and can't be serialised to Firebase. Colours and gradients are design constants that shouldn't be user-editable. Separating concerns keeps Firebase data clean and portable while allowing rich visual presentation.  
**Where:** `PDLCSection.tsx` — `PHASE_CONFIG` is the static lookup; `DEFAULT_PHASES` provides the editable defaults.

---

### DD-02 · Flip card interaction for PDLC activities
**Status:** Active  
**Decision:** Each PDLC activity card has a front face (title + tag) and a back face (description preview + bullets). Clicking the card flips it; the back face has an "Edit & view all" link that opens a full modal editor.  
**Rationale:** Keeps the grid scannable and compact while giving access to full detail on demand. The progressive disclosure (card → back → modal) avoids cluttering the default view.

---

### DD-03 · Discovery phase card order reflects MVP discovery sequence
**Status:** Active  
**Date:** After MVP discovery plan update  
**Decision:** The 5 Product Discovery cards are ordered to mirror the actual MVP discovery workflow: User Interviews → Feedback Analysis → Tech Discovery → Ideation & Hypotheses → Design Prototypes.  
**Rationale:** The PDLC section is used as a presentation artefact as well as documentation. Ordering cards in execution sequence makes it immediately readable as a plan, not just a list of activities.

---

### DD-04 · Typography system: three fonts with distinct roles
**Status:** Active  
**Decision:** Three Google Fonts are used with strictly separated roles:
- **Playfair Display** (serif) — headings, phase titles, hero text. Conveys authority and trust.
- **DM Sans** (sans-serif) — body text, UI labels, general content.
- **JetBrains Mono** (monospace) — metadata labels, version tags, tracking codes, uppercase overline text.  
**Rationale:** Each font occupies a distinct visual register. Mixing them without rules would feel chaotic; the role separation creates hierarchy without needing font-weight variation alone.

---

### DD-05 · Artefacts section as the single source of truth for discovery outputs
**Status:** Active (updated DD-13)
**Decision:** All discovery artefacts (market research, personas analysis, OKRs, roadmap, research plan, findings) are stored as `marketResearch` items in Firebase and rendered via `MarketResearchGrid`. As of DD-13, the artefacts section is displayed inline within the "Use Case - NHS Platform" tab below the personas grid — no longer a standalone tab.  
**Rationale:** A single data structure and rendering path for all artefact types. Rich content is stored as HTML strings in a `richContent` field, rendered in an expanded card modal. Thumbnails are Unsplash URLs for visual variety without asset hosting.

---

### DD-06 · Ingest tab removed — out of MVP demo scope
**Status:** Active  
**Date:** 2026-07-03  
**Decision:** The NHS FFT Data Ingest tab, `NHSFFTUpload` component, `fftParser` utility, `fftRecords` Firebase state, and the related acceptance test (`09-nhs-fft-upload.spec.ts`) were removed entirely. The default tab is now User Analysis.  
**Rationale:** The Ingest tab was a data-loading utility for internal use during discovery. It is not part of the MVP demo narrative — the demo focuses on personas, discovery artefacts, PDLC, and the delivery backlog. Including it added complexity without adding value to the demo audience.  
**Files removed:** `src/app/components/NHSFFTUpload.tsx`, `src/app/utils/fftParser.ts`, `src/imports/sample_nhs_fft_data.csv`, `tests/acceptance/09-nhs-fft-upload.spec.ts`.

---

### DD-07 · Technical Discovery Report as a seeded artefact
**Status:** Active  
**Date:** 2026-07-03  
**Decision:** The Technical Discovery Report is stored as a seed artefact (`artefact-tech-discovery`) in `SEED_MARKET_RESEARCH`. It covers: MVP technical scope, tech requirements, NHS infrastructure constraints (network proxies, HSCN, N3, device environment, identity/access, data residency/IG), technical limitations found in discovery, proposed MVP architecture, reusable frontend components, and backend patterns.  
**Rationale:** Technical discovery findings must be discoverable alongside all other artefacts in the Artefacts tab. Storing it as a seed artefact means it appears automatically for all users (new and existing, via the merge-by-ID strategy) without requiring manual Firebase edits.  
**Where:** `src/app/data/seedData.ts` — `artefact-tech-discovery` entry in `SEED_MARKET_RESEARCH`.

---

### DD-08 · Discovery Research Plan as a structured 5-stage artefact
**Status:** Active  
**Date:** After MVP discovery plan update  
**Decision:** The Discovery Research Plan artefact is structured around 5 sequential stages (User Interviews → Feedback Analysis → Tech Discovery → Ideation & Hypotheses → Design Prototypes) scoped strictly to MVP demo requirements.  
**Rationale:** Scoping discovery to MVP prevents over-investigation before the first demo. Each stage has a clear purpose, participant list, and output — making it executable, not aspirational.

---

### DD-09 · Prototype artefact opens an in-tab detail view via state switch
**Status:** Active  
**Date:** 2026-07-08  
**Decision:** Clicking the Prototype card in the Artefacts tab replaces the `MarketResearchGrid` with a `PrototypeDetailView` component, controlled by `artefactDetailId` state in `App.tsx`. A back button returns to the grid. The Prototype card does not open the standard `ItemModal`; `MarketResearchGrid` intercepts its click via an `onOpenDetail` callback and the modal is skipped by filtering `artefact-prototype` from the modals render.  
**Rationale:** The app has no router. An in-tab state switch is the established pattern (matches how the app handles all "navigation") and requires no new dependencies. The same `onOpenDetail` callback is available for future artefacts that need their own detail views.  
**Trade-off:** The back button does not update the URL, so deep-linking is not possible. Acceptable for a demo tool; if URL-based navigation is added later, this state can be promoted to a query param.

---

### DD-10 · Persona video embed in Use Case - NHS Platform tab
**Status:** Active  
**Date:** 2026-07-06 (tab renamed DD-13)
**Decision:** Each persona card in the Use Case - NHS Platform tab has an optional `videoUrl` field. When set, a video player is shown inside the persona detail modal. YouTube URLs are converted to embed URLs; direct `.mp4`/`.webm`/`.ogg` links are played via a native `<video>` element. The field is editable in-app and persisted to Firebase via `onUpdate`.  
**Rationale:** Allows user research recordings or stakeholder interview clips to be attached directly to the persona they relate to — keeping evidence alongside analysis in one place.  
**Where:** `src/app/components/PersonaCard.tsx` (`toEmbedUrl` helper + video section in modal); `videoUrl: ""` added to all three personas in `seedData.ts`.

---

## Coding Decisions / Best Practices

### CD-01 · Custom `useFirebaseSync` hook as the single data access pattern
**Status:** Active  
**Decision:** All Firebase reads and writes go through `useFirebaseSync<T>(path, initialValue)`. No component calls Firebase directly.  
**Rationale:** Centralises debouncing, pending-state management, JSON serialisation, and initial seeding logic. Components get a `[value, update, flush]` tuple that behaves like `useState` with automatic persistence.  
**Signature:** Returns `[value, update, flush] as const` — `flush` forces an immediate write, bypassing the debounce (used on save buttons and tab changes).

---

### CD-02 · `localPendingRef` pattern to prevent Firebase echo
**Status:** Active  
**Decision:** When a local edit is written to Firebase, `localPendingRef.current = true` is set immediately. The `onValue` listener skips updates while this flag is true. It clears when the Firebase write promise resolves.  
**Rationale:** Without this, Firebase echoes the write back to all listeners including the originating client. Without the guard, the echo would overwrite in-progress user edits during the debounce window.

---

### CD-03 · Seed data separated into its own module
**Status:** Active  
**Decision:** All seed content lives in `src/app/data/seedData.ts`, exported as named constants. `App.tsx` imports only what it needs; `PDLCSection.tsx` defines its own `DEFAULT_PHASES` separately (not seeded via the version mechanism — seeded by `useFirebaseSync` on first write when the path is empty).  
**Rationale:** Keeps `App.tsx` from becoming a data file. Seed constants are independently readable and testable. `SEED_VERSION` is a single number to bump — no other change needed to trigger a re-seed.

---

### CD-04 · `DEFAULT_PHASES` in PDLCSection is a fallback, not a forced seed
**Status:** Active  
**Decision:** `DEFAULT_PHASES` is passed as the `initialValue` to `useFirebaseSync('pdlcPhases', DEFAULT_PHASES)`. It is only written to Firebase if the `pdlcPhases` key does not yet exist — not on every version bump.  
**Rationale:** PDLC content is expected to be heavily edited live. Forcing a re-seed on every `SEED_VERSION` bump would destroy user edits. The version-gated mechanism in `App.tsx` only covers `problemStatement`, `userSegments`, and `marketResearch`.  
**Implication:** To push a PDLC default update to existing users, the `pdlcPhases` key in Firebase must be manually cleared, or a separate migration mechanism must be added.

---

### CD-05 · Drag-and-drop via `react-dnd` with HTML5Backend
**Status:** Active  
**Decision:** The Kanban board uses `react-dnd` with `HTML5Backend` for drag-and-drop task reordering. The `DndProvider` wraps the entire app in `App.tsx`.  
**Rationale:** `react-dnd` provides a declarative `useDrag` / `useDrop` hook API that separates drag logic from render logic. HTML5Backend uses native browser drag events — no additional dependencies.  
**Note:** `DndProvider` must be at the root level (not inside a tab) because drag state is shared across the tree.

---

### CD-06 · NHS FFT data parsed client-side via `xlsx`
**Status:** Active  
**Decision:** NHS FFT upload files (`.xlsx`, `.csv`) are parsed in the browser using the `xlsx` library. Parsed records are deduplicated by composite key (`trustCode|wardCode|responseDate|overallExperience|comments`) before being merged into Firebase.  
**Rationale:** No server required for file processing. Deduplication on the client prevents accidental double-imports from re-uploading the same file.  
**Where:** `src/app/utils/fftParser.ts` (parsing) + `App.tsx` `handleFFTImport` (dedup + merge).

---

### DD-13 · Tab restructure — "Use Case - NHS Platform" consolidates User Analysis and Artefacts
**Status:** Active  
**Date:** 2026-07-24  
**Decision:** The standalone "User Analysis" and "Artefacts" tabs were merged into a single "Use Case - NHS Platform" tab. The tab now presents, in order: (1) problem statement + discovery stats panel, (2) user personas grid, (3) artefacts section (MarketResearchGrid) inline below the personas. The standalone "Artefacts" tab route (`value="research"`) and its `Tabs.Content` block were removed. The hero section was simplified to the product title only ("AI in Product Management") — the editable problem statement and summary stats were removed from the hero. Header branding updated from "Patient Feedback Intelligence Platform" to "S&PE Product AI Pillar". Default active tab remains `pdlc`. NHS Platform and Performance Analytics tabs are unchanged.  
**Rationale:** Separating personas and artefacts into different tabs created unnecessary navigation friction — both belong to the discovery phase and tell the same story. A single "Use Case" tab lets presenters tell a coherent narrative: context → who the users are → what we built to understand them. Removing the editable problem statement from the hero avoids duplication (the content lives in the tab) and simplifies the header layout.  
**Tests updated:** `02-problem-statement.spec.ts` (navigates to tab; edit test skipped), `03-user-analysis.spec.ts` (tab label updated), `04-artefacts.spec.ts` (tab label updated).

---

### CD-11 · Test maintenance is mandatory with every code change
**Status:** Active  
**Date:** 2026-07-16  
**Decision:** Any change to user-visible behaviour, navigation, state management, persistence, modal flows, validation, or important DOM structure must include an assessment of affected automated tests. Tests must be updated in the same commit whenever intended behaviour changes. New functionality must include acceptance coverage for its primary happy path and at least one failure/cancel path.  
**Rationale:** The CI failure triggered by the Prototype design-log edit feature (July 2026) showed that adding UI behaviour without updating tests leaves CI with stale assertions and no coverage of new flows. Behaviour changes that ship without test updates accumulate silently until CI breaks on an unrelated commit, making root-cause analysis harder.  
**Implementation guidance:**  
1. Before committing a code change, grep `tests/acceptance/` for any selector or text that references the changed component or user flow.  
2. Update those selectors and assertions to match the new behaviour.  
3. Add new `test()` blocks for new user-visible actions (happy path + cancel/error path).  
4. Prefer `getByRole`, `getByLabel`, and `data-testid` attributes over CSS class names, DOM position, or `nth()` selectors.  
5. Add `data-testid` attributes to new interactive elements at the same time as writing the component — not as a retrofit.  
6. Run the specific spec file first (`npx playwright test tests/acceptance/16-*.spec.ts`), then the full suite.  
7. Never skip, delete, or weaken an assertion simply because implementation behaviour changed — update the expectation to match the intended new behaviour instead.  
8. CI failures must be fixed at their root cause. Do not add `continue-on-error`, suppress exit codes, or remove tests to make CI green.  
**Relevant files:** `tests/acceptance/`, `playwright.config.ts`, `.github/workflows/ci.yml`.

---

### CD-10 · Prototype version HTML stored as raw strings in Firebase RTDB
**Status:** Active  
**Date:** 2026-07-08  
**Decision:** Each uploaded `.html` prototype file is read client-side with `FileReader.readAsText()` and stored as a raw HTML string inside the `PrototypeVersion` object. The full array is persisted to Firebase at the `prototypeVersions` path, serialised as a JSON string per AD-02. To open a version, the HTML string is wrapped in a `Blob` and opened via `URL.createObjectURL` in a new browser tab — never injected into the host DOM.  
**Rationale:** Firebase Storage is not configured for this project (the `storageBucket` field in `firebase.ts` is auto-generated but `getStorage` is never called). Storing HTML as a string in RTDB is consistent with how the existing `report` field works for artefact PDFs — no new infra needed. Prototype files are typically 50–150 KB; five versions totals under 1 MB, well within RTDB's 10 MB node limit.  
**Trade-off:** Large or numerous prototype HTML files could bloat the DB. If storage grows beyond ~2 MB, migrate `htmlContent` to Firebase Storage URLs (the field name stays the same; only the write/read path changes).  
**Security:** The HTML is opened as an isolated standalone document via Blob URL, never via `innerHTML` or `dangerouslySetInnerHTML` into the host app. This prevents uploaded prototype code from touching the host's DOM.  
**Where:** `src/app/components/PrototypeDetailView.tsx` — `handleAdd` (write), `openHtmlInNewTab` (read).

---

### CD-07 · Rich text stored as HTML strings
**Status:** Active  
**Decision:** The `description` field on PDLC cards and the `richContent` field on artefacts store raw HTML strings. These are rendered with `dangerouslySetInnerHTML` inside controlled components.  
**Rationale:** The `RichTextEditor` component produces HTML. Storing HTML directly avoids a serialisation layer (e.g. converting to/from a custom AST). The content is user-generated within the app — not from external sources — so XSS risk is contained.

---

### CD-08 · Acceptance tests run against a deployed preview URL, not localhost
**Status:** Active  
**Decision:** Playwright tests in CI run against the Vercel preview deployment (`BASE_URL` env var), not a locally-started dev server.  
**Rationale:** Tests exercise the production build (Vite bundled, environment variables injected by Vercel) rather than the dev server. Catches build-time issues that wouldn't surface in a `vite dev` environment.

---

### CD-09 · DECISIONS.md is a release gate — checked automatically on every CI run
**Status:** Active  
**Date:** 2026-07-02  
**Decision:** Two enforcement mechanisms ensure DECISIONS.md stays current:
1. **CI step** (`ci.yml`) — runs before Playwright tests; fails the build if: the file is missing, any of the three required sections are absent, the `Last updated` date line is missing, or architectural source files changed without DECISIONS.md also changing.
2. **Playwright static test** (`10-decisions-doc.spec.ts`) — no browser required; validates structure (all sections present, min entry counts), field completeness (every entry has Status / Decision / Rationale), date freshness (≤ 90 days old), and the git-diff drift check.  
**Rationale:** Documentation that isn't enforced becomes stale within weeks. Tying it to the release gate means it either gets updated or the build breaks — the friction is intentional.  
**Architectural files watched:** `useFirebaseSync.ts`, `firebase.ts`, `seedData.ts`, `App.tsx`, `PDLCSection.tsx`, `ci.yml`.

---

*Last updated: 2026-07-23 (added AD-10 NHS Performance Analytics microsite; AD-11 canned AI responses; AD-12 client-side password gate; DD-09 prototype detail view; DD-10 persona video embed in User Analysis; CD-10 prototype HTML in Firebase; CD-11 test maintenance mandatory; Playwright specs AC-17/18/19)*  
*Update this file whenever a significant architectural, design, or coding decision is made, changed, or reversed.*

# Claude Code Build Guide — NHS Patient Feedback Intelligence Platform
## A self-contained microsite inside the main showcase repo

**For:** Claude Code
**Repo:** `arpitavisen-ai/refine-problem-statement`
**Branch:** Work on `develop`, promote to `main` via `npm run promote`
**Date:** July 2026

---

## The one thing to understand before anything else

The main site is a **modular framework showcase** — it demonstrates how AI leverages each stage of the Product Development Lifecycle. Its existing tabs (Users, Research, PDLC, Tasks) are *content of that thesis*.

The NHS dashboard is **not another feature of the main site**. It is a **self-contained microsite** — a fully built product that serves as *evidence* the framework works. It happens to live in the same repo and deployment, but it owns its entire stack: its own design system, its own scaffold, its own Firebase project, its own data layer, its own tests, and its own decisions log.

**The only thing the NHS microsite shares with the main site is a single entry link.** Nothing else. The NHS microsite must not import from the main site's components, theme, hooks, or Firebase setup — and the main site must never reach into the NHS microsite except to link to it.

This is deliberate. If the NHS microsite were later lifted out into its own repo and deployment, the main site should lose nothing but a link, and the microsite should carry its entire working stack with it untouched.

**Do not generalise this into a reusable "microsite framework."** Build the NHS microsite specifically for NHS. If more use cases arrive, we scale then — not now. No premature abstraction.

---

## What this means concretely — the hard boundary

| Concern | Main site (host) | NHS microsite | Shared? |
|---|---|---|---|
| Design system | Dark mode, Playfair/DM Sans, own tokens | NHS light mode, Frutiger, NHS tokens | ❌ No |
| Firebase | Host's existing project | **Its own separate Firebase project** | ❌ No |
| Data layer | Host's `seedData.ts` | Its own typed data layer | ❌ No |
| Firebase sync hook | Host's `useFirebaseSync` | **Its own `useNhsFirebaseSync`** | ❌ No |
| Decisions log | Host's `DECISIONS.md` | **Its own `DECISIONS.md`** in the NHS folder | ❌ No |
| Components | Host's components | Its own components | ❌ No |
| Routing | Host's router | NHS routes registered in host router | ⚠️ Registration only |
| Entry point | "See what we built →" link | — | ✅ The only shared surface |

**Import rule Claude Code must enforce:** No file under `src/microsites/nhs-dashboard/` may import anything from `src/app/` (the host). No file in `src/app/` may import anything from `src/microsites/nhs-dashboard/` except the single lazy-loaded route component. If you catch yourself writing a cross-boundary import, stop — it's a design error.

---

## Before you write a single line of code — read these first

1. `nhs-feedback-dashboard-v4.html` — the validated prototype. 1,073 lines. This is the **source of truth** for every component, data structure, and interaction in the dashboard. Read it fully before building anything.
2. The host's `DECISIONS.md` — read it to understand the host's conventions (branch workflow, CI gate, secrets discipline) — but note its Firebase decisions (AD-01 to AD-04) do **not** govern the NHS microsite. The microsite writes its own.
3. This guide — the single source of truth for how the microsite is built.

---

## The journey being built

```
Main site (existing tab bar: Users · Research · PDLC · Tasks)
  └── "See what we built" entry point [NEW — links out to the microsite]
        │
        ▼
   ┌─────────────────────────────────────────────────┐
   │  NHS MICROSITE  (self-contained from here down)  │
   │                                                   │
   │  /nhs  →  NhsWelcomePage                          │
   │    ├── CTA 1: "Continue with current data"        │
   │    │         → /nhs/dashboard                      │
   │    └── CTA 2: "Load your own data (CSV / Excel)"   │
   │              → file picker → parse → /nhs/dashboard│
   │                        │                           │
   │                        ▼                           │
   │  /nhs/dashboard  →  NhsDashboardPage               │
   │    (exact replica of prototype V5)                 │
   │    (← Back button returns to /nhs)                 │
   └─────────────────────────────────────────────────┘
```

**Not in scope:** ward digest email, 24-hour alerting, magic-link auth. Leave extension points, build none.

**Data upload behaviour (confirmed):** the uploaded file **replaces** the demo dataset for the session. The welcome page copy states this. No merge.

---

## Firebase — the microsite's own project

The NHS microsite gets its **own Firebase project**, fully separate from the host's.

**Setup (human does this in the Firebase console — Claude Code cannot):**
1. Create a new Firebase project (e.g. `nhs-feedback-microsite`).
2. Enable Realtime Database.
3. Generate web app config.
4. Store the config in the microsite's own env vars, **namespaced** so they never collide with the host's:

```
VITE_NHS_FIREBASE_API_KEY=
VITE_NHS_FIREBASE_AUTH_DOMAIN=
VITE_NHS_FIREBASE_DATABASE_URL=
VITE_NHS_FIREBASE_PROJECT_ID=
VITE_NHS_FIREBASE_APP_ID=
```

Add these to GitHub Secrets (per the host's secrets discipline — never commit them). The host's keys use `VITE_FIREBASE_*`; the microsite's use `VITE_NHS_FIREBASE_*`. Clean namespace separation.

**Claude Code builds:**
- `src/microsites/nhs-dashboard/lib/firebase.ts` — initialises the microsite's own Firebase app instance from the `VITE_NHS_FIREBASE_*` vars. Use a **named** Firebase app (`initializeApp(config, 'nhs')`) so it cannot clash with the host's default app in the same bundle.
- `src/microsites/nhs-dashboard/hooks/useNhsFirebaseSync.ts` — the microsite's own sync hook. It may follow the same *pattern* as the host's (debounced writes, JSON-string values, seed-if-empty) but it is its own independent code. It reads/writes only the microsite's Firebase project.

**What persists to the microsite's Firebase:** only user-generated content — issue status changes (Resolved/Escalated) and comments. The issue dataset itself (seed or uploaded) is session-local React state, never persisted.

```
nhs Firebase project structure:
/issues/{issueId}/status     → JSON string
/issues/{issueId}/comments   → JSON string (Comment[])
/meta/seedVersion            → integer
```

The microsite has its own `SEED_VERSION` starting at 1 — independent of the host's version 7.

---

## Session structure — work in this exact order

Five sessions. Each ends with a working, reviewable state. Do not skip ahead.

---

### SESSION 1 — Microsite scaffold, entry point, routing, welcome page

**Goal:** The microsite boundary exists. The entry point links to it. `/nhs` renders the welcome page in NHS design system. `/nhs/dashboard` is a stub.

**1.1 — Create the microsite folder and its own decisions log**

```
src/microsites/nhs-dashboard/
├── DECISIONS.md        ← the microsite's OWN decisions log — create it now
└── README.md           ← one paragraph: what this microsite is, that it's self-contained
```

Seed `src/microsites/nhs-dashboard/DECISIONS.md` with a header and the first entry:

```markdown
# NHS Patient Feedback Microsite — Decision Log

Self-contained decisions for the NHS microsite. Independent of the host site's
DECISIONS.md. This microsite owns its own design system, Firebase project, data
layer, and scaffold. The only shared surface with the host is a single entry link.

---

## AD-01 · NHS microsite is a fully self-contained module
Status: Active
Date: [today]
Decision: The NHS dashboard is built as a self-contained microsite under
src/microsites/nhs-dashboard/. It owns its design system, Firebase project, data
layer, sync hook, components, and tests. No file in this microsite imports from the
host (src/app/); no host file imports from this microsite except the single
lazy-loaded route component. The microsite is designed to be extractable to its own
repo with no rewrite.
Rationale: The main site is a modular framework showcase; this microsite is evidence
of a built product. Keeping it fully decoupled means it can be lifted out cleanly and
keeps the two codebases from entangling. Not generalised into a reusable framework —
built specifically for NHS; scale only if more use cases arrive.

## AD-02 · NHS microsite uses its own separate Firebase project
Status: Active
Date: [today]
Decision: The microsite initialises its own Firebase app (named 'nhs') from
VITE_NHS_FIREBASE_* env vars, pointing at a separate Firebase project from the host.
Only issue status and comments persist; the issue dataset is session-local state.
The microsite has its own SEED_VERSION (starts at 1).
Rationale: Full data isolation from the host. Separate credentials, security rules,
and a clean lift-out story. Near-zero setup cost for real decoupling benefit.
```

**1.2 — Add the entry point to the main site**

The NHS microsite is *evidence*, not a peer tab — so it should read as a distinct "here's what we built" affordance, not a fifth tab flush with Users/Research/PDLC/Tasks.

Two acceptable options — pick based on the existing UI:
- **Option A (preferred):** A prominent card or CTA within the PDLC or Delivery section: "See what we built → NHS Patient Feedback Platform". This frames it correctly as a product the framework produced.
- **Option B (fallback):** If a tab is genuinely the cleanest fit, a visually distinguished tab (e.g. with an external-link or "demo" affordance) is acceptable — but it should not look identical to the content tabs.

The entry point navigates to `/nhs`. This link is the **only** coupling between host and microsite.

**1.3 — Register the microsite routes in the host router (lazy-loaded)**

```tsx
// In the host router config — the ONLY host-side reference to the microsite
const NhsMicrosite = lazy(() => import('../microsites/nhs-dashboard/NhsMicrositeRoot'));

// routes:
//   /nhs           → NhsWelcomePage
//   /nhs/dashboard → NhsDashboardPage
```

Lazy-loading keeps the microsite's bundle (charts, NHS fonts, data) out of the host's initial load — reinforcing the boundary and helping performance.

**1.4 — Create `NhsMicrositeRoot`**

This is the microsite's own root — wraps its routes, provides its own context, applies its NHS design-system scope. It renders an `<Outlet />` for `/nhs` and `/nhs/dashboard`.

**1.5 — Build `NhsWelcomePage` in the NHS design system**

NHS Digital design system v0.176.0, light mode. Apply tokens via scoped CSS variables on the microsite root — self-contained, no dependency on the host's Tailwind theme:

```css
.nhs-microsite {
  --nhs-blue: #005EB8;
  --nhs-dark-blue: #003087;
  --nhs-bright-blue: #0072CE;
  --nhs-green: #009639;
  --nhs-red: #DA291C;
  --nhs-amber: #ED8B00;
  --nhs-black: #212B32;
  --nhs-dark-grey: #425563;
  --nhs-mid-grey: #768692;
  --nhs-pale-grey: #E8EDEE;
  --nhs-white: #FFFFFF;
  --nhs-focus: #FFB81C;
  --nhs-box-radius: 0.333rem;
  --nhs-pill-radius: 1.22rem;
  --nhs-font: 'Frutiger W01', Arial, sans-serif;
  font-family: var(--nhs-font);
  color: var(--nhs-black);
}
```

Frutiger W01 won't be available — Arial fallback is acceptable for the showcase. Note in the microsite's DECISIONS.md that self-hosted Frutiger W01 is the production requirement.

**Welcome page content:**

```
[DEMO DATA ONLY — not for clinical use]   ← red banner, white text, full width

[NHS logo mark] Patient Feedback Intelligence
                Accenture S&PE · NHS England FFT

[H1] Understand what patients are saying — before it becomes a complaint.

[Body]
The NHS Patient Feedback Intelligence Platform turns Friends and Family Test
responses into structured, actionable insight for clinical leaders. AI classifies
every comment across the five CQC domains, surfaces deteriorating wards, flags
critical themes, and generates board-ready evidence — automatically.

This is a working product built by the Accenture S&PE team during the Product
Delivery phase of the PDLC framework.

[3 stat tiles]
  1,875,785         |   15 issues tracked   |   5 CQC domains
  FFT responses     |   April 2026          |   classified by AI ✦
  April 2026        |                       |

[Two CTAs]
  [PRIMARY — NHS blue]
  Continue with current data →
  Explore the dashboard using the pre-loaded April 2026 NHS England FFT dataset

  [SECONDARY — white, NHS blue border]
  ↑ Load your own data (CSV or Excel)
  Upload a custom FFT export — it replaces the demo dataset for this session

[Footer]
  ✦ AI-assisted  ·  Classified by Claude (claude-sonnet-4-6)  ·  DEMO DATA ONLY — not for clinical use
```

**Accessibility (WCAG 2.1 AA — mandatory):**
- Focus ring `outline: 3px solid var(--nhs-focus); outline-offset: 0;` on every interactive element
- Both CTAs keyboard-reachable, correctly announced
- Sentence case throughout (only "DEMO DATA ONLY" is caps)
- `lang="en"` on the microsite root
- Contrast checked: NHS blue on white passes; verify mid-grey usage

**1.6 — Wire CTA 1:** `navigate('/nhs/dashboard')`.

**1.7 — Wire CTA 2 (picker only, no parsing yet):**

```tsx
<input type="file" accept=".csv,.xlsx,.xls" data-testid="load-data-input" onChange={handleFile} />
```

For now `handleFile` logs the name and navigates to `/nhs/dashboard`. Parsing lands in Session 2.

**Session 1 done when:** entry point on the main site links to `/nhs`; `/nhs` renders the NHS-styled welcome page with both CTAs; `/nhs/dashboard` renders a stub; the microsite's own DECISIONS.md exists with AD-01 and AD-02; no cross-boundary imports; no console errors.

---

### SESSION 2 — Data layer, types, file upload parsing

**Goal:** The microsite's typed data layer exists. Uploading a CSV/Excel file parses it and makes it available to the dashboard, replacing the demo data for the session.

**2.1 — `src/microsites/nhs-dashboard/types/index.ts`**

```typescript
export type Severity = 'Critical' | 'High' | 'Medium' | 'Low';
export type Status = 'Open' | 'In progress' | 'Resolved' | 'Escalated';
export type Sentiment = 'Critical' | 'Negative' | 'Mixed' | 'Positive';
export type Trend = 'Declining' | 'Stable' | 'Improving';
export type PersonaKey = 'cn' | 'qm' | 'wm';
export type CqcDomain =
  | 'Safe service' | 'Effective service' | 'Caring service'
  | 'Responsive service' | 'Well-led service';

export interface Verbatim {
  sentiment: 'positive' | 'negative';
  text: string;
}
export interface Comment {
  type: 'system' | 'user' | 'ai';
  author: string;
  time: string;
  text: string;
}
export interface Issue {
  id: string;
  setting: string;
  ward: string;
  category: CqcDomain;
  severity: Severity;
  desc: string;
  sentiment: Sentiment;
  trend: Trend;
  trendDelta: string;        // "+22% vs March"
  status: Status;
  raised: string;            // ISO date
  raisedDisplay: string;     // "03 April 2026"
  owner: string;
  aiAction: string;
  aiConfidence: number;      // 0–1
  verbatims: Verbatim[];     // ≥3 negative + ≥1 positive
  comments: Comment[];
}
export interface BenchmarkPoint {
  label: string; apr: number; mar: number; flag: 'rose' | 'amber' | null;
}
export interface Persona {
  name: string;
  desc: string;
  filterFn: (i: Issue) => boolean;
  signals: string;
  wardSignals?: (ward: string) => string;
}
export interface DashboardData {
  issues: Issue[];
  benchmark: BenchmarkPoint[];
  source: 'seed' | 'uploaded';
  uploadedFileName?: string;
}
```

**2.2 — `data/issues.ts`** — port ALL 15 issues from the prototype verbatim. Add per issue:
- `trendDelta` — from prototype context (e.g. FFT-2026-0004 = "+22% vs March")
- `aiConfidence` — Critical 0.94–0.97, High 0.88–0.93, Medium 0.82–0.88, Low 0.78–0.84
- `verbatims` — 3 negative + 1 positive per issue, realistic NHS FFT patient voice, anonymous, specific to the ward's issue, under 40 words each. Register examples:
  - Negative: "Waited over two hours and nobody told us what was happening. Staff seemed overwhelmed and we felt forgotten."
  - Positive: "The nurse who looked after me was incredibly kind and explained everything clearly. Made a hard day much easier."

**2.3 — `data/benchmark.ts`** — real FFT April 2026 figures (from `fttsummaryapr26.xlsx`):

```typescript
export const BENCHMARK_DATA: BenchmarkPoint[] = [
  { label: 'A&E',            apr: 80.2, mar: 79.5, flag: 'rose' },
  { label: 'Mental Health',  apr: 87.8, mar: 89.6, flag: 'rose' },
  { label: 'Ambulance',      apr: 86.5, mar: 86.3, flag: 'amber' },
  { label: 'Maternity Post', apr: 91.9, mar: 91.3, flag: null },
  { label: 'Maternity Ante', apr: 91.4, mar: 91.9, flag: null },
  { label: 'Maternity Birth',apr: 92.8, mar: 93.1, flag: null },
  { label: 'GP',             apr: 92.2, mar: 92.2, flag: null },
  { label: 'Community',      apr: 94.0, mar: 94.1, flag: null },
  { label: 'Inpatient',      apr: 95.0, mar: 94.9, flag: null },
  { label: 'Outpatient',     apr: 94.3, mar: 94.0, flag: null },
  { label: 'Dental',         apr: 96.4, mar: 96.4, flag: null },
];
// Source: NHS England FFT April 2026 (fttsummaryapr26.xlsx). Total: 1,875,785 responses.
```

**2.4 — `data/personas.ts`** — port all 3 personas verbatim. The `signals` strings contain HTML (`<strong>`, highlight spans) — preserve exactly. Add `wardSignals(ward)` for the WM persona.

**2.5 — `context/NhsDashboardContext.tsx`** — holds `DashboardData`, provided at `NhsMicrositeRoot` level so both `/nhs` and `/nhs/dashboard` can read it. Uploaded data lives here (session state), never in Firebase.

**2.6 — `hooks/useDashboardData.ts`**

```typescript
export function useDashboardData(): {
  data: DashboardData;
  loadFile: (file: File) => Promise<void>;
  isLoading: boolean;
  error: string | null;
};
```

**2.7 — Implement `loadFile` with the `xlsx` library**

Check the host `package.json` — `xlsx` is likely already present. If it is, the microsite may use it (a shared *library dependency* is fine — that's npm, not a code-boundary violation). If absent, `pnpm add xlsx`.

```typescript
import * as XLSX from 'xlsx';

async function loadFile(file: File): Promise<void> {
  const buffer = await file.arrayBuffer();
  const wb = XLSX.read(buffer, { type: 'array' });     // handles .csv, .xlsx, .xls
  const sheet = wb.Sheets[wb.SheetNames[0]];
  const rows = XLSX.utils.sheet_to_json(sheet);
  // Map rows → Issue[]. Missing columns get sensible defaults.
  // On schema mismatch: keep seed data, set error, surface a friendly message.
  // On success: set context data with source: 'uploaded', then navigate('/nhs/dashboard').
}
```

The uploaded dataset **replaces** the demo dataset in context. Expected columns: id, setting, ward, category, severity, desc, status, raised, owner. Missing fields default gracefully.

**2.8 — Microsite DECISIONS.md entry:**

```markdown
## AD-03 · Uploaded data replaces demo data for the session; only status + comments persist
Status: Active
Date: [today]
Decision: Uploaded CSV/Excel is parsed client-side with xlsx and replaces the demo
dataset in NhsDashboardContext (session state only). It is never written to Firebase.
Only issue status and comments persist, to the microsite's own Firebase project.
Rationale: The dataset is either synthetic demo data or a user file — neither warrants
persistence. Replace (not merge) avoids ID collisions and keeps the demo narrative clean.
```

**Session 2 done when:** `useDashboardData` returns typed demo data; uploading a CSV parses it, replaces the dataset in context, and navigates to the dashboard stub.

---

### SESSION 3 — Dashboard shell: layout, stat tiles, signals, charts

**Goal:** `/nhs/dashboard` renders the full NHS-themed shell — stat tiles, persona switcher, signals panel, benchmark chart, sidebar charts. Issue tracker stubbed.

**This is the most design-critical session. The prototype is the exact spec — deviate from nothing.**

**3.1 — `pages/NhsDashboardPage.tsx`** — render order matches the prototype exactly:

```
<DemoBanner />           "DEMO DATA ONLY — not for clinical use"
<NhsHeader />            back button · NHS logo · date · board pack button · AI pill
<PersonaSwitcher />      Chief Nurse | Quality Manager | Ward Manager
<ViewingAs />            "Viewing as [name]" + description · aria-live="polite"
<main>
  <StatGrid />           5 stat tiles
  <PrioritisedSignals /> AI narrative · ward selector (WM only)
  <BenchmarkChart />     horizontal bar · Chart.js · 90% reference line
  <div class="content-row">
    <IssueTrackerSection />   stub: "Issue tracker — Session 4"
    <Sidebar />               donut · sentiment · channel charts
  </div>
</main>
<ProvenanceFooter />
```

**3.2 — Back button** — top of `NhsHeader`, before the logo:

```tsx
<button onClick={() => navigate('/nhs')} data-testid="back-btn" className="nhs-back-btn">
  ← Back to overview
</button>
```

White bg, NHS blue text, no border, 14px, visible focus ring.

**3.3 — NHS design scope** — the whole dashboard renders inside `.nhs-microsite` (same scoped tokens from Session 1). Page background `#F0F4F5`.

**3.4 — `StatGrid`** — 5 tiles, ported exactly:
1. Total responses (1,875,785) → scrolls to benchmark
2. Critical issues (2) → scrolls to tracker · red tint
3. Lowest positive (A&E 80.2%) → orange tint
4. MH trend (−1.8pp) → orange tint
5. Prioritised signals (5) → purple tint · ✦ AI badge

Each tile is a focusable anchor that smooth-scrolls to its section.

**3.5 — `PersonaSwitcher`** — three tabs. On switch: update persona state, re-render signals, re-apply issue filter, announce via `aria-live`. `aria-current` on the active tab.

**3.6 — `PrioritisedSignals`** — renders `PERSONAS[current].signals` via `dangerouslySetInnerHTML` (narratives contain intentional markup). WM persona only: render `<WardSelector />` above the narrative; on ward change call `wardSignals(ward)` and update. Header badge `✦ AI executive summary`; footer `Generated by Claude · April 2026`.

**3.7 — `BenchmarkChart`** — Chart.js horizontal bar. Direct port of `initBenchmarkChart()` including the 90%-threshold dashed reference-line plugin (key clinical data point). Confirm `chart.js` is in `package.json`; install if absent.

**3.8 — `Sidebar`** — port `initDonutChart()`, `initSentimentChart()`, `initChannelChart()`. Static; do not react to persona switching.

**3.9 — `styles/nhs-print.css`** — imported only inside `NhsDashboardPage`. Port the prototype's `@media print` rules exactly.

**Session 3 done when:** dashboard renders with correct NHS styling, all 5 tiles, persona switcher, AI signals, benchmark chart, sidebar charts; tracker area shows stub.

---

### SESSION 4 — Issue tracker: filters, table, expanded rows, comments, exports

**Goal:** The full tracker is functional. All 8 UR fixes verified. Both exports work. Comments persist to the microsite's Firebase.

**4.1 — `FilterBar`** — search + 4 selects + live count (`aria-live`). Search matches ward, description, ID. Selects: severity, status, CQC domain, care setting (derived from data). Count: "X of 15 issues".

**4.2 — `Top3Toggle` (P0-2)** — default Top-3 deteriorating (Declining → highest severity → most recent), "Show all 15" toggle. Filters disabled while Top-3 active (with explanatory tooltip). Defaults to Top-3 for QM; CN and WM see all.

**4.3 — `IssueTable` + `IssueRow`** — sortable columns (ID, setting, severity, raised); direction toggles on repeat click. Row shows severity tag (colour-coded), status tag, trend pill **with delta** (P1-7), ✦ AI badge on description, expand chevron. `Enter`/`Space` expands; `aria-expanded` on the row. Every row carries `data-testid="issue-row"`.

**4.4 — `ExpandedRow`** — on expand, full-width below the row:

```
Full description ✦ AI                    AI-suggested action ✦ AI
AI sentiment [tag] ✦ AI                  [aiAction]
Trend [pill + delta]                     AI confidence: 91% ✦ AI     ← P1-6
Owner                                    [bar: aiConfidence vs 0.91]
                                         [ℹ tooltip: methodology + 91% target]
Patient verbatims ✦ AI                   [Mark resolved] [Escalate]
  "…" negative
  "…" negative
  "…" negative
  "…" positive  ← green left border, "✦ Patient positive"
Activity & comments
  [thread]  [composer: textarea + ✦ AI draft + Post]
```

- **P0-4:** verbatims from `issue.verbatims`; positive always green-bordered + labelled. Non-negotiable. Each carries `data-verbatim-sentiment="positive|negative"`.
- **P1-6:** per-issue confidence bar (`width: aiConfidence*100%`), red below 0.91, green at/above, tooltip on the ℹ icon.

**4.5 — Comments + status via the microsite's own sync hook**

```typescript
const [comments, setComments] = useNhsFirebaseSync<Comment[]>(
  `issues/${issue.id}/comments`, issue.comments
);
const [status, setStatus] = useNhsFirebaseSync<Status>(
  `issues/${issue.id}/status`, issue.status
);
```

This writes to the **microsite's own Firebase project** (`nhs` app), never the host's. Seed the microsite's paths with `seedIfEmpty` at `SEED_VERSION = 1`. AI draft button ports `draftAiComment()` (three template drafts).

**4.6 — `WardSelector` scoping (P0-3, P1-8)** — WM only. Selecting a ward filters the table to that ward (or all) **and** recomputes the signals narrative.

**4.7 — Board pack export (P0-1)** — `pnpm add react-to-print`.

`<BoardPackPrintView ref={printRef} />` — hidden component rendering per-persona title block, 6 tiles, benchmark chart as static image (`canvas.toDataURL()`), Critical/High table, signals prose, DEMO DATA ONLY footer with print date + page numbers.

```tsx
const handleBoardPack = useReactToPrint({
  content: () => printRef.current,
  documentTitle: `NHS-Board-Pack-${format(new Date(),'MMM-yyyy')}`,
});
```

Microsite DECISIONS.md: **CD-01 · Board pack uses react-to-print (MIT) — no serverless function needed for the showcase.**

**4.8 — CQC export (P1-5)** — pure function, no library:

```typescript
function exportCqcCsv(issues: Issue[], range: {from:string; to:string}): void {
  // Section 1 processed issues · Section 2 themes by CQC domain · Section 3 actions logged
  // proper CSV escaping: `"${String(cell).replace(/"/g,'""')}"`
  // Blob + URL.createObjectURL download; filename CQC-Evidence-{from}-to-{to}.csv
}
```

Date-range picker (two `<input type="date">`, current month pre-filled) in a small panel for QM persona.

**Session 4 done when:** all 15 issues render; filters work; rows expand with verbatims + confidence; comments/status persist to the microsite's Firebase; board pack prints; CQC export downloads a valid 3-section CSV.

---

### SESSION 5 — Playwright tests + decisions finalisation

**Goal:** The 8 UR fixes have acceptance tests. Both decisions logs are current. CI passes.

**5.1 — Test files** in `tests/acceptance/`:
- `11-nhs-entry-and-welcome.spec.ts`
- `12-nhs-dashboard-persona.spec.ts`
- `13-nhs-fixes-p0.spec.ts` (fixes 1–4)
- `14-nhs-fixes-p1.spec.ts` (fixes 5–8)
- `15-nhs-data-upload.spec.ts`

**5.2 — Tests (mapped to UR fixes)** — same coverage as the prototype's verified fix set:

```typescript
// P0-1 board pack triggers print (all 3 personas)
// P0-2 QM defaults to top-3; "show all" → 15
test('top-3 default for QM, show-all reveals 15', async ({ page }) => {
  await page.click('[data-persona="qm"]');
  await expect(page.locator('[data-testid="issue-row"]')).toHaveCount(3);
  await page.click('[data-testid="show-all-toggle"]');
  await expect(page.locator('[data-testid="issue-row"]')).toHaveCount(15);
});
// P0-3 ward selector only for WM
// P0-4 expanded row: 3 negative + 1 positive verbatim
test('verbatims: 3 negative + 1 positive', async ({ page }) => {
  await page.click('[data-testid="issue-row"]');
  await expect(page.locator('[data-verbatim-sentiment="negative"]')).toHaveCount(3);
  await expect(page.locator('[data-verbatim-sentiment="positive"]')).toHaveCount(1);
});
// P1-5 CQC export downloads a .csv
// P1-6 confidence bar visible in expanded row
// P1-7 trend pill contains "vs"
// P1-8 WM signals change on ward select
// upload: CSV → navigates to /nhs/dashboard with data
```

**5.3 — Add `data-testid` attributes** — go back through Sessions 3–4 and ensure: `issue-row`, `show-all-toggle`, `ward-selector`, `signals-narrative`, `ai-confidence`, `ai-confidence-bar`, `trend-pill`, `board-pack-btn`, `cqc-export-btn`, `load-data-input`, `back-btn`, `verbatim-item` (+ `data-verbatim-sentiment`).

**5.4 — Fixture** — `tests/fixtures/sample-fft.csv`, a minimal 3-row file mapping to `Issue`, for the upload test.

**5.5 — Finalise both decisions logs:**
- The **microsite's** `DECISIONS.md` — verify AD-01/02/03, CD-01 present, update the date line.
- The **host's** `DECISIONS.md` — add ONE entry noting the microsite exists and is decoupled (so the host's CI drift-check sees the new top-level area accounted for). Keep it short; the detail lives in the microsite's log.

Run the host's `10-decisions-doc.spec.ts` locally before pushing.

**Session 5 done when:** all tests pass (or `.skip` with documented reason); `npm run promote` runs without CI errors.

---

## NHS design system reference — do not deviate

| Token | Value | Use |
|---|---|---|
| NHS blue | `#005EB8` | Primary buttons, headers, links |
| NHS dark blue | `#003087` | Header background |
| NHS bright blue | `#0072CE` | Hover |
| NHS green | `#009639` | Resolved status, positive verbatim border |
| NHS amber | `#ED8B00` | High severity, warnings |
| NHS red | `#DA291C` | Critical severity, demo banner |
| NHS black | `#212B32` | Body text |
| NHS dark grey | `#425563` | Secondary text |
| NHS mid grey | `#768692` | Metadata |
| NHS pale grey | `#E8EDEE` | Backgrounds |
| NHS white | `#FFFFFF` | Cards |
| NHS focus | `#FFB81C` | Focus rings (3px min) |
| Box radius | `0.333rem` | Cards, inputs |
| Pill radius | `1.22rem` | Buttons, tags |
| Font | Frutiger W01 → Arial | All text |

**GDS conventions:** sentence case everywhere (only "DEMO DATA ONLY" caps); dates `DD Month YYYY`; 3px visible focus rings; `aria-current` on active tab; `aria-live` on filter count + ViewingAs; `aria-expanded` on rows; `role="log"` on comment threads.

---

## Libraries

| Library | Status | Action |
|---|---|---|
| react · vite · TypeScript · react-router-dom | ✅ Host has them | Use |
| firebase | ✅ Host has it | Microsite inits its OWN named app ('nhs') + OWN project |
| xlsx | ✅ Likely present | Shared npm dep is fine; install if absent |
| chart.js | ✅ Likely present | Verify; install if absent |
| lucide-react | ✅ Likely present | Icons |
| tailwindcss | ✅ Host has it | Layout only; NHS look via scoped CSS vars |
| react-to-print | ❌ Not present | `pnpm add react-to-print` (Session 4) |

Sharing an npm *dependency* (xlsx, chart.js, firebase-the-package) is fine — that's the package registry, not a code boundary. What must never happen is importing the host's *code* (its components, its hooks, its config).

---

## Full file structure

```
src/microsites/nhs-dashboard/
├── DECISIONS.md                    ← microsite's own decisions log
├── README.md
├── NhsMicrositeRoot.tsx            ← microsite root: routes, context, NHS scope
├── types/
│   └── index.ts
├── data/
│   ├── issues.ts                   ← 15 issues + verbatims + confidence
│   ├── benchmark.ts                ← real FFT figures
│   └── personas.ts                 ← 3 personas + wardSignals
├── context/
│   └── NhsDashboardContext.tsx
├── hooks/
│   ├── useDashboardData.ts
│   ├── useIssueFilters.ts
│   ├── useWardSelector.ts
│   └── useNhsFirebaseSync.ts       ← microsite's OWN sync hook
├── lib/
│   ├── firebase.ts                 ← microsite's OWN Firebase app ('nhs')
│   └── cqcExport.ts
├── pages/
│   ├── NhsWelcomePage.tsx
│   └── NhsDashboardPage.tsx
├── components/
│   ├── layout/     DemoBanner · NhsHeader · PersonaSwitcher · ViewingAs · ProvenanceFooter
│   ├── dashboard/  StatGrid · PrioritisedSignals · WardSelector · BenchmarkChart
│   ├── tracker/    FilterBar · Top3Toggle · IssueTable · IssueRow · ExpandedRow
│   ├── comments/   CommentThread · CommentComposer
│   ├── sidebar/    CqcDonutChart · SentimentChart · ChannelChart
│   ├── exports/    BoardPackExport · BoardPackPrintView · CqcExport
│   └── shared/     AiBadge · TrendPill · SeverityTag
└── styles/
    └── nhs-print.css

tests/acceptance/    11-…entry-and-welcome · 12-…persona · 13-…p0 · 14-…p1 · 15-…upload
tests/fixtures/      sample-fft.csv
```

---

## Test maintenance is part of every change

Before completing any code change:

1. Identify which existing tests cover the changed behaviour — `grep -r "text=" tests/acceptance/` or search for the component name.
2. Update those tests in the same change. A commit that changes behaviour without updating tests is incomplete.
3. Add tests for new user-visible behaviour: at minimum one happy-path test and one cancel/error-path test.
4. Run the relevant spec file first: `npx playwright test tests/acceptance/<file>.spec.ts`
5. Run the full acceptance suite before finishing: `npx playwright test --config=playwright.config.ts`
6. Never weaken, skip, or delete a test simply because implementation behaviour changed — update the expectation instead.
7. When intended behaviour changes, update both the implementation and its test expectations.
8. Prefer `getByRole`, `getByLabel`, and `data-testid` attributes over CSS class names, DOM position, or `nth()` selectors.
9. Add `data-testid` attributes to new interactive elements at the same time as writing the component.
10. For CI failures: inspect the first failing step and correct the root cause. Do not add `continue-on-error`, suppress exit codes, or remove tests to make CI green.
11. Update `DECISIONS.md` when the change introduces or alters an architectural, design, or coding decision.

**Definition of done for any code change:**
- [ ] Existing tests for the changed behaviour updated
- [ ] New tests written for new behaviour
- [ ] `npx playwright test` passes locally
- [ ] `npm run build` passes
- [ ] `DECISIONS.md` updated if the change affects architecture, design patterns, or coding standards
- [ ] No test assertions weakened without a documented reason

---

## Non-negotiables

1. **Hard module boundary.** No microsite→host imports; no host→microsite imports except the one lazy route. A cross-boundary import is a design error — stop and restructure.
2. **The microsite owns its Firebase.** Separate project, named `nhs` app, `VITE_NHS_FIREBASE_*` vars, own `SEED_VERSION` (1), own `seedIfEmpty`. Never touch the host's DB.
3. **The microsite owns its DECISIONS.md.** Update it every session. The host's log gets one short entry acknowledging the microsite exists (for the drift-check).
4. **✦ AI badge on every AI-generated field** — descriptions, actions, verbatims, signals, confidence, AI drafts. No exceptions.
5. **DEMO DATA ONLY** visible on welcome page, dashboard, and in the board-pack print output.
6. **The prototype is the spec.** Any ambiguity → `nhs-feedback-dashboard-v4.html` is the answer.
7. **Do not modify the host's routing, theme, or Firebase** beyond registering the one lazy route and adding the entry link. Existing tabs must keep working.
8. **Never `window.print()`** — use `react-to-print`. The prototype used it as a placeholder only.
9. **Don't generalise into a microsite framework.** Build for NHS specifically. Scale later if more use cases arrive.
10. **Test maintenance is mandatory.** See "Test maintenance is part of every change" above — it is a non-negotiable condition of done.

---

*Single source of truth for Claude Code. Read at the start of each session. The prototype HTML and this microsite's own DECISIONS.md are the two authoritative artefacts the build defers to.*

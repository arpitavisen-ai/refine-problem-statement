# Vue Component Optimizer

Analyze Vue 3 component(s) for performance issues and code-reuse opportunities, then produce a prioritized, actionable report with concrete before/after examples.

## Input

`$ARGUMENTS` may be:
- A path to a single `.vue` file → analyze that file in isolation
- A path to a directory → analyze every `.vue` file inside it
- Empty → analyze every `.vue` file reachable from the current working directory

## Step 1 — Collect files

Resolve the target from `$ARGUMENTS`. Use Glob to enumerate `.vue` files. Read each file in full. If there are more than 20 files, read them in parallel batches of 5.

Also read these supporting files if they exist (they inform cross-component patterns):
- `src/api.js` or `src/api.ts`
- Any `src/composables/*.js` or `src/composables/*.ts`
- `src/main.js` or `src/main.ts`

## Step 2 — Analyze each component

For every component file, check the categories below. Record every finding with:
- **Severity**: 🔴 High / 🟡 Medium / 🟢 Low
- **Category**: Performance | Reuse | Maintainability
- **Location**: file path + line number range
- **Evidence**: the actual code that triggered the finding
- **Fix**: a concrete before/after diff or code snippet

### 2a — Performance checks

**P1 — v-for without stable key**
Flag any `v-for` that uses array index as the key (`:key="index"`) or has no key at all.
Good keys are unique, stable IDs — SKU, order ID, etc.

**P2 — Expensive logic in template expressions**
Flag method calls, `.filter()`, `.map()`, `.sort()`, `.reduce()`, or `Object.keys()` called directly inside `{{ }}` or `:prop` bindings. These re-run on every render. They should be `computed` properties.

**P3 — Inline object/array literals in `:prop` or `v-bind`**
Flag patterns like `:style="{ color: x }"` or `:options="[a, b, c]"` directly in the template. A new object is created every render, breaking referential equality checks. Move to `computed`.

**P4 — Missing `computed` for derived state**
Flag `ref` values inside `setup()` that are always recalculated from other refs using a `watch`, or values that could obviously be `computed` instead of maintained manually.

**P5 — Unguarded watchers**
Flag `watch` / `watchEffect` calls that lack `{ immediate: false }` where `immediate: true` would cause a redundant first run, or deeply nested watches that could be replaced with a single `computed`.

**P6 — Missing `defineAsyncComponent`**
Flag heavy view-level components (`views/*.vue` files over ~150 lines) that are imported synchronously in a router file or parent. Suggest `defineAsyncComponent` / dynamic `import()`.

**P7 — Missing `v-memo` or `v-once`**
Flag `v-for` lists that render static sub-trees on every iteration. Suggest `v-memo` with a dependency array, or `v-once` for truly static content.

### 2b — Code-reuse checks

**R1 — Duplicated template blocks**
Compare templates across files. Flag blocks of 8+ lines that appear in 2 or more components with only minor variation (different labels, different field names). Suggest extracting a shared component with props.

**R2 — Duplicated setup() logic**
Compare `setup()` functions. Flag 5+ lines of logic (data fetching, filter wiring, modal management, date formatting) that appear in multiple components. Suggest extracting a composable.

**R3 — Inline formatting functions**
Flag number/date/currency formatting done inline (e.g., `toLocaleString`, `toFixed`, `new Date(...).toLocaleDateString()`) in multiple components. Suggest a shared `useFormatters` composable.

**R4 — Modal boilerplate**
Flag components that each define their own `isOpen` ref, `open()` / `close()` methods, and `<Teleport>` + `<Transition>` wrapper. Suggest a `useModal` composable and/or a `BaseModal` wrapper component.

**R5 — Repeated filter/sort wiring**
Flag components that each wire up the same filter composable and sort logic from scratch. Suggest a `useFilteredList(items, filters)` composable that encapsulates the pattern.

**R6 — Prop drilling chains**
Flag props passed through 2+ component levels without use at intermediate levels. Suggest `provide` / `inject` or a lightweight store.

### 2c — Maintainability checks

**M1 — Missing prop validation**
Flag `defineProps` calls with no types or no runtime validators for required business values (IDs, status enums, monetary amounts).

**M2 — Options API remnants**
Flag any `data()`, `methods:`, `computed:`, or `mounted()` in components that are otherwise using Composition API. Suggest full migration.

**M3 — Large single-file components**
Flag `.vue` files over 300 lines. Break down the lines: template / script / style. Suggest extraction strategy (sub-components, composables, or scoped slots).

**M4 — Magic numbers and strings**
Flag hardcoded threshold values (e.g., stock levels, status strings like `"pending"`, `"active"`) scattered across multiple components. Suggest a shared `constants.js`.

## Step 3 — Cross-component summary

After analyzing all files individually:

1. **Composable extraction candidates** — list groups of components that share logic, name the composable, and show its proposed signature.
2. **Shared component candidates** — list repeated UI patterns, name the component, and show its proposed props interface.
3. **Quick wins** — findings that can be fixed in under 5 minutes each.

## Step 4 — Output format

Print the report in this structure:

```
## Vue Component Analysis: <target>
Analyzed <N> components · <date>

### Summary
| Severity | Count |
|----------|-------|
| 🔴 High  | X     |
| 🟡 Medium| X     |
| 🟢 Low   | X     |

---

### Findings

#### [P2] Expensive filter in template — 🔴 High · Performance
**File**: `src/views/Dashboard.vue:47`
**Problem**: `.filter()` called directly in `:items` binding — runs on every render.
**Before**:
```vue
<DataTable :items="orders.filter(o => o.status === 'pending')" />
```
**After**:
```vue
// in setup()
const pendingOrders = computed(() =>
  orders.value.filter(o => o.status === 'pending')
)
// in template
<DataTable :items="pendingOrders" />
```

... (one block per finding) ...

---

### Cross-Component Opportunities

#### Proposed composable: `useModal()`
Eliminates modal boilerplate in: ProfileDetailsModal, TasksModal, InventoryDetailModal, ...
```ts
export function useModal() {
  const isOpen = ref(false)
  const open = () => (isOpen.value = true)
  const close = () => (isOpen.value = false)
  return { isOpen, open, close }
}
```

#### Proposed composable: `useFormatters()`
Centralizes number/currency/date formatting used in: Dashboard, Spending, Orders, ...

---

### Quick Wins (< 5 min each)
1. ...
2. ...
```

Keep findings focused and actionable. Do not pad the report with generic Vue advice that doesn't apply to the actual code. Every finding must cite a real line in a real file.

# CLAUDE.md

Guidance for Claude Code working in this repository.

## What this is

Model Luxe Media revenue dashboard. React 18 + TypeScript + Vite, deployed on Vercel.
Single-page, client-only. No backend, no API, no auth. All state lives in `localStorage`.

## Commands

```
npm install
npm run dev       # vite dev server
npm run build     # vite build → dist/
npm run preview   # serve the built dist/
```

There is no test runner, no linter, and no typecheck script. `tsc` runs only via the
IDE — `vite build` does not typecheck. `strict` is **off** in `tsconfig.app.json`, and
most of the app is untyped (implicit `any` params everywhere). Match that; do not
introduce a strict-mode-only pattern into existing code.

## Structure

```
index.html        → mounts #root
src/main.tsx      → ReactDOM root, StrictMode
src/App.tsx       → the entire app (~4600 lines)
src/styles.ts     → APP_CSS, one exported template-literal string
```

`src/App.tsx` is deliberately one file, organised top-to-bottom in banner-comment
sections. Keep that layout when adding code — put a new helper next to related
helpers, a new component next to related components. Do not split the file into
modules unless asked.

Section order in `App.tsx`:
1. Constants — `DIVISIONS`, `DEPARTMENTS`, `ROLES`, `COMP_TYPES`, `CATALOG`, `STARTER`
2. Org lookups — `divisionById`, `teamsInDivision`, `membersInDivision`, …
3. Formatting + date utils — `n`, `$$`, `safePct`, `isoD`, `startOfWeek`, `periodRange`
4. Blank-record factories — `blankStream`, `blankPerson`, `blankSale`, `blankCommissionPlan`, …
5. Defaults — `defaultOps`, `defaultOrg`, `defaultData`
6. Calculation engine — `rollup`, `allocation`, `commissionOn`, `overrideForMember`, `memberSummary`
7. Snapshots + reporting — `buildSnapshot`, `aggregate`, `periodReport`, `attentionItems`
8. Persistence — `loadSaved`, `persist`, `migrate`
9. Components — small shared ones first, then per-tab
10. `App()` — tab state, autosave, week close

## Data model

One `data` object held in `App`'s `useState`, threaded down as `data` / `setData`.
No context, no reducer, no store. Every update is `setData((d) => ({ ...d, … }))`.

```
data = {
  companyName, companyGoal, activeWeekStart,
  streams[],                 // revenue streams + prices + house quantities
  people[],                  // members: funnel counts, per-stream `lines`, comp settings
  history: { weeks: [] },    // immutable closed-week snapshots
  org:  { divisions[], teams[], goals: { [monthKey]: {...} } },
  ops:  { commission, commissionPlans[], overridePlans[], companyBonus,
          bridge, sales[], payouts[], bonusPools[] },
}
```

Revenue flows one direction — respect this when changing calculations:

```
Streams (price) ──┐
Team tab (units) ─┴─► derived team sales ─┐
Sales ledger (manual sales) ──────────────┴─► commission engine ─► tiers/overrides/bonus
```

Team-tab units become synthetic sales via `makeTeamSale` / `activeWeekTeamSales`, keyed
`tm:<weekStart>:<personId>:<streamId>`. `allSales(data)` is the single source that every
commission and rollup calculation reads — use it rather than touching `ops.sales` directly.
`promoteTeamSale` converts a derived sale into a real ledger sale.

## Persistence and migration

- Key: `KEY = "mlm-calc-v7"` in `localStorage`. Autosave is debounced 700ms in `App`.
- Every load goes through `migrate(saved)`, which merges over `defaultData()` and
  backfills new fields on old records.
- **When you add or rename a field on any persisted record, add the backfill to
  `migrate()`.** Users have live data in their browser; a missing backfill breaks it.
- Bumping `KEY` discards everyone's data. Don't, unless explicitly asked.

## Styling

All CSS is in `src/styles.ts` as one string injected by `<AppStyles />`. No CSS files,
no CSS-in-JS library, no Tailwind. Design tokens are CSS vars on `.root`
(`--ink`, `--paper`, `--gold`, `--burg`, `--grn`, …) — use the vars, not raw hex, except
for division colours which come from the data. Layout is mobile-first, capped at 760px.

Inline `style={{}}` is used only for computed values (bar widths, division colours).

## Dependencies

`recharts` and `lucide-react` are in `package.json` but **not used** — charts are
hand-rolled SVG/divs (`BarList`, `TrendChart`) and there are no icon imports. Prefer
extending the existing hand-rolled chart components over pulling recharts in.

## Conventions

- Money in, strings out: form fields store strings; `n()` coerces, `$$()` formats.
- IDs come from `uid()`. Dates are ISO `YYYY-MM-DD` strings via `isoD()`; parse with
  `parseD()` — never `new Date(isoString)` (timezone drift).
- Percent math goes through `safePct` (guards divide-by-zero) and `pctText`.
- Destructive actions confirm with `window.confirm` (see `closeWeek`, settings reset).
- Archived divisions/teams are soft-deleted; list helpers take `includeArchived = false`.

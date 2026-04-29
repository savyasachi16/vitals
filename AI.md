# vitals — Apple Health Dashboard

Owner: Savyasachi Jagadeeshan (jsavyasachi@gmail.com)
Live: https://vitals.savyasachi.dev (planned)
Repo: github.com/savyasachi16/vitals

## Stack

- Astro 6 — `output: 'static'` + `@astrojs/vercel` adapter
- Tailwind CSS v4 — via `@tailwindcss/vite` (NOT `@astrojs/tailwind`)
- React + Recharts — interactive health charts via `@astrojs/react`
- TypeScript strict — types in `src/types/`
- SQLite — local-first ingestion, never committed

## Design system

- **Fonts**: -apple-system, BlinkMacSystemFont, 'SF Pro Display', 'SF Pro Text', 'Helvetica Neue', sans-serif
- **Palette**: Apple Health dark mode — bg `#000`, surface `#1C1C1E`, borders `#38383A`
- **Accent colors**: Green `#30D158`, Red `#FF375F`, Orange `#FF9F0A`, Blue `#0A84FF`, Purple `#BF5AF2`
- **Dark mode only**: no light mode toggle, matches native iOS Health app
- **Max width**: `max-w-6xl` on main content
- **No `@apply`** — utility classes directly in templates

## Project structure

```
src/
  components/
    HealthChart.tsx          — Recharts area chart with 7d/30d/365d/all toggles
    TimeRangeSelector.tsx    — Time range selector buttons
  layouts/
    Layout.astro             — Base HTML wrapper with global CSS import
  pages/
    index.astro              — Main dashboard page (client:load for React)
  styles/
    global.css               — Apple Health dark mode theme via @theme
  types/
    health.ts                — TypeScript interfaces for HealthKit data
scripts/
  parse-health-xml.js        — Stream 1.36GB export.xml → SQLite (366MB health.db)
  generate-json.js           — SQLite → per-metric JSON files in public/data-*.json
public/
  data-*.json                — Generated chart data (gitignored, privacy)
  workouts.json              — Workout list from SQLite
  health-stats.json          — Summary stats
  favicon.svg                — Apple Health-style icon
```

## How to Import Data

### One-time setup
```bash
# 1. Export from iPhone: Health app → Profile → Export All Health Data → Save to Files
# 2. Transfer export.xml to your Mac (AirDrop/iCloud)
# 3. Place export.xml in project root
```

### Ingest pipeline (two steps)
```bash
# Step 1: Parse XML → SQLite (handles 1.36GB, 3.68M records)
node scripts/parse-health-xml.js export.xml

# Step 2: Generate static JSON for dashboard
node scripts/generate-json.js
```

### What happens
1. `parse-health-xml.js` streams `export.xml` line-by-line → `health.db` (SQLite)
   - Records table: type, value, unit, startDate, endDate, sourceName, device, UUID
   - Workouts table: type, duration, startDate, endDate, sourceName, stats
   - Sleep: calculated as duration hours from start/end dates
2. `generate-json.js` reads SQLite → per-metric JSON files in `public/`
   - Aggregation: SUM for steps/calories, AVG for HR/weight, duration for sleep
   - Output: `data-stepcount.json`, `data-heartrate.json`, etc.
3. Dashboard reads JSON files at build time (static site, Vercel-compatible)

### Refresh data
Repeat the two steps with a new `export.xml`. No git commits needed — data stays local.

## Dev commands

```bash
npm run dev      # localhost:4321 — HMR enabled
npm run build    # production build → dist/ + .vercel/output/
```

## Data Privacy Rules

- **Never commit health data**: `export.xml`, `health.db`, `public/data-*.json` all gitignored
- **Never hardcode personal values**: Real data stays local, repo has no sample data
- **Parse scripts are local-only**: No network calls, runs entirely on user's machine
- **SQLite DB is 366MB**: Too large for GitHub (100MB limit) — this is why it's gitignored

## Common tasks

### Add a new metric to dashboard
1. Add config to `METRICS` array in `src/types/health.ts`
2. Add `<HealthChart client:load />` component to `src/pages/index.astro`
3. Run `node scripts/generate-json.js` to generate the new metric's JSON

### Update chart colors or styling
Edit the Apple Health palette CSS variables in `src/styles/global.css` via `@theme` block

### Change time range defaults
Update `useState<TimeRange>('30d')` in `src/components/HealthChart.tsx` (valid: `7d`, `30d`, `365d`, `all`)

### Deploy to Vercel
```bash
npm run build  # outputs to dist/ and .vercel/output/
vercel --prod
```

## Apple Health XML Format

The `export.xml` contains:
- `<Record type="HKQuantityTypeIdentifier..." value="..." startDate="..." endDate="..." sourceName="..." />`
- `<Workout workoutActivityType="..." duration="..." startDate="..." endDate="..." />`
- `<SleepAnalysis ... />` — sleep data parsed as duration between start/end dates

Parse script handles all record types and outputs clean SQLite tables.

## Critical rules

- **Never commit real health data** — check git status before committing
- **Never use purple/indigo** — use Apple Health accent colors only
- **No emojis in UI** unless explicitly asked (icons in code OK)
- **Sample data only in repo** — real data stays local on user's machine
- **Match Apple Health styling** — cards, spacing, typography must feel native
- **health.db is 366MB** — never try to push to GitHub, it's in .gitignore for a reason
- **Sleep values**: stored as decimal hours in DB (6.57 = 6h 34m), displayed as `Xh Ym`

## Key files for context

- `scripts/parse-health-xml.js:1` — streaming XML parser (line-by-line, handles 1.36GB)
- `scripts/generate-json.js:1` — SQLite to JSON generator with proper aggregation
- `src/components/HealthChart.tsx:1` — Recharts area chart with time range toggles
- `src/styles/global.css:1` — Apple Health dark mode theme with Tailwind v4 `@theme`
- `src/types/health.ts:1` — TypeScript interfaces and METRICS config array

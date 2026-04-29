# vitals — Apple Health Dashboard

Owner: Savyasachi Jagadeeshan (jsavyasachi@gmail.com)
Live: https://vitals.savyasachi.dev (planned)
Repo: github.com/savyasachi16/vitals

## Stack

- Astro 6 — `output: 'static'` + `@astrojs/vercel` adapter
- Tailwind CSS v4 — via `@tailwindcss/vite` (NOT `@astrojs/tailwind`)
- React + Recharts — interactive health charts via `@astrojs/react`
- TypeScript strict — types in `src/types/`

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
    HealthChart.tsx      — Recharts wrapper for time-series data
    MetricCard.astro    — Apple-style metric summary cards
    TimeRangeSelector.tsx — Day/Week/Month/Year toggle
  layouts/
    Layout.astro        — Base HTML wrapper with global CSS import
  pages/
    index.astro         — Main dashboard page
  styles/
    global.css          — Apple Health dark mode theme + card styles
  types/
    health.ts           — TypeScript interfaces for HealthKit data
scripts/
  parse-health-xml.js   — Node script to convert Apple Health export.xml → health-data.json
docs/
  export.md            — iPhone export instructions
public/
  health-data.json      — Parsed health data (gitignored, privacy)
  favicon.svg          — Apple Health-style icon
```

## How to Ingest New Health Data

1. **Export from iPhone**: Health app → Profile icon → Export All Health Data → Save to Files
2. **Transfer to Mac**: AirDrop or iCloud Drive
3. **Extract**: Unzip `health-records.zip` to get `export.xml`
4. **Parse**: `node scripts/parse-health-xml.js path/to/export.xml`
5. **Result**: Updates `public/health-data.json` — dashboard auto-refreshes

## Common tasks

### Add a new metric to dashboard
1. Add config to `METRICS` array in `src/types/health.ts`
2. Add `<HealthChart />` component to `src/pages/index.astro`
3. For summary cards, add `<MetricCard />` in appropriate section

### Update chart colors or styling
Edit the Apple Health palette CSS variables in `src/styles/global.css`

### Change time range defaults
Update `useState<TimeRange>('month')` in `src/components/HealthChart.tsx` and `TimeRangeSelector.tsx`

### Deploy to Vercel
```bash
npm run build  # outputs to dist/ and .vercel/output/
vercel --prod
```

## Data Privacy Rules

- **Never commit health data**: `export.xml`, `public/health-data.json` are in `.gitignore`
- **Never hardcode personal values**: Use sample data in `public/health-data.json` for development
- **Parse script is local-only**: No network calls, runs entirely on user's machine

## Apple Health XML Format

The export.xml contains:
- `<Record type="HKQuantityTypeIdentifier..." value="..." startDate="..." endDate="..." sourceName="..." />`
- `<Workout workoutActivityType="..." duration="..." startDate="..." endDate="..." />`

Parse script handles both record types and outputs clean JSON.

## Dev commands

```bash
npm run dev      # localhost:4321 — HMR enabled
npm run build    # production build → dist/ + .vercel/output/
npm run preview  # NOT recommended with Vercel adapter
```

### Local preview
Use `npm run dev` for all local work. The Vercel adapter changes output structure.

## Critical rules

- **Never commit real health data** — check git status before committing
- **Never use purple/indigo** — use Apple Health accent colors only
- **No emojis in UI** unless explicitly asked (icons in code OK)
- **Sample data only in repo** — real data stays local on user's machine
- **Match Apple Health styling** — cards, spacing, typography must feel native

## Parse Script Usage

```bash
# Basic usage
node scripts/parse-health-xml.js export.xml

# With custom output path
node scripts/parse-health-xml.js ~/Downloads/export.xml
```

Output: `public/health-data.json` with structure:
```json
{
  "records": [{ "type": "...", "value": 123, "unit": "...", "startDate": "...", "endDate": "...", "source": "..." }],
  "lastUpdated": "2026-04-28T10:00:00-07:00",
  "stats": { "totalRecords": 12345, "dateRange": {...}, "types": [...] }
}
```

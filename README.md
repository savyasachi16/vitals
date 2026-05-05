# vitals

My Apple Health data, as a dashboard. Astro + React + Recharts, SQLite for ingestion, dark mode only because I don't use Health in light mode.

## Stack

<a href="https://astro.build"><img src="https://img.shields.io/badge/Astro-FF5D01?style=flat&logo=astro&logoColor=white" alt="Astro" /></a>
<a href="https://react.dev"><img src="https://img.shields.io/badge/React-61DAFB?style=flat&logo=react&logoColor=000" alt="React" /></a>
<a href="https://recharts.org"><img src="https://img.shields.io/badge/Recharts-22B5BF?style=flat&logo=chartdotjs&logoColor=white" alt="Recharts" /></a>
<a href="https://tailwindcss.com"><img src="https://img.shields.io/badge/Tailwind_CSS_v4-06B6D4?style=flat&logo=tailwindcss&logoColor=white" alt="Tailwind CSS" /></a>
<a href="https://www.typescriptlang.org"><img src="https://img.shields.io/badge/TypeScript-3178C6?style=flat&logo=typescript&logoColor=white" alt="TypeScript" /></a>
<a href="https://www.sqlite.org"><img src="https://img.shields.io/badge/SQLite-003B57?style=flat&logo=sqlite&logoColor=white" alt="SQLite" /></a>
<a href="https://vitest.dev"><img src="https://img.shields.io/badge/Vitest-6E9F18?style=flat&logo=vitest&logoColor=white" alt="Vitest" /></a>
<a href="https://vercel.com"><img src="https://img.shields.io/badge/Vercel-000000?style=flat&logo=vercel&logoColor=white" alt="Vercel" /></a>

## Use it on your own data

```bash
npm install
# Health app → Profile → Export All Health Data → drop export.xml in repo root
npm run ingest export.xml
npm run dev
```

Re-runs are incremental. `npm run ingest:fresh` rebuilds from scratch.

## Layout

- `src/lib/timeRange.ts`: shared time-range store, URL-synced via `?range=`
- `src/components/HealthChart.tsx`: one Recharts area chart per metric
- `scripts/parse-health-xml.js`: streams `export.xml` into SQLite
- `scripts/generate-json.js`: emits one daily series per metric to `public/data-*.json`
- `scripts/lib/aggregate.js`: `SUM_TYPES`, `DEFAULT_METRICS`, the SUM/AVG logic

## Add a metric

Append the `HK*` identifier to `DEFAULT_METRICS` in `scripts/lib/aggregate.js`. If it's cumulative (steps, calories, distance), add it to `SUM_TYPES` too. Drop a `<HealthChart />` in `src/pages/index.astro`. Re-run ingest.

## Privacy

`export.xml`, `health.db`, and the generated JSON are gitignored. A husky pre-commit hook fails the commit if any of them get staged. The parse scripts make no network calls.

## Scripts

`dev` · `build` · `test` · `ingest <file>` · `ingest:fresh`

MIT.

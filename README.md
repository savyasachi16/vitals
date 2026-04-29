# vitals

My Apple Health data, as a dashboard. Astro + React + Recharts, SQLite for ingestion, dark mode only because I don't use Health in light mode.

**Live:** https://vitals.savyasachi.dev (planned)

## Use it on your own data

```bash
npm install
# Health app → Profile → Export All Health Data → drop export.xml in repo root
npm run ingest export.xml
npm run dev
```

Re-runs are incremental. `npm run ingest:fresh` rebuilds from scratch.

## Layout

- `src/lib/timeRange.ts` — shared time-range store, URL-synced via `?range=`
- `src/components/HealthChart.tsx` — one Recharts area chart per metric
- `scripts/parse-health-xml.js` — streams `export.xml` into SQLite
- `scripts/generate-json.js` — emits one daily series per metric to `public/data-*.json`
- `scripts/lib/aggregate.js` — `SUM_TYPES`, `DEFAULT_METRICS`, the SUM/AVG logic

## Add a metric

Append the `HK*` identifier to `DEFAULT_METRICS` in `scripts/lib/aggregate.js`. If it's cumulative (steps, calories, distance), add it to `SUM_TYPES` too. Drop a `<HealthChart />` in `src/pages/index.astro`. Re-run ingest.

## Privacy

`export.xml`, `health.db`, and the generated JSON are gitignored. A husky pre-commit hook fails the commit if any of them get staged. The parse scripts make no network calls.

## Scripts

`dev` · `build` · `test` · `ingest <file>` · `ingest:fresh`

MIT.

# Ingest New Health Data

Automate the full pipeline: export.xml → SQLite → JSON → dashboard.

## When to use
User says: "ingest", "import data", "update health data", "new export", or drops an `export.xml` path.

## Steps

1. **Verify export.xml exists**
   ```bash
   ls -lh /Users/savya/Downloads/apple_health_export/export.xml 2>/dev/null || ls -lh ./export.xml 2>/dev/null
   ```

2. **Run SQLite pipeline**
   ```bash
   node scripts/parse-health-xml.js /path/to/export.xml
   ```
   Expected: Creates `health.db` (366MB), outputs record count.

3. **Generate JSON files**
   ```bash
   node scripts/generate-json.js
   ```
   Expected: Creates `public/data-*.json` files.

4. **Verify data**
   ```bash
   ls -lh public/data-*.json public/workouts.json public/health-stats.json
   ```

5. **Restart dev server** if running
   ```bash
   # Kill existing: pkill -f "astro dev" ; npm run dev
   ```

## Gotchas
- `health.db` is 366MB — never commit, it's gitignored
- export.xml can be 1.36GB — streaming parser handles it, be patient
- Sleep data: parsed as duration hours (SUM per day), displayed as `Xh Ym`
- Aggregation: SUM for steps/calories, AVG for HR/weight

## Output
Tell user: "Data ingested. Dashboard at http://localhost:4321/ — refresh browser."

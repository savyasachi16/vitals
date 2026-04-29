# Add New Health Metric

Add a new Apple Health metric to the dashboard with chart and config.

## When to use
User says: "add [metric]", "track [health type]", "show my [metric]" (e.g., "add blood oxygen", "track vo2max").

## Steps

1. **Find the HealthKit identifier**
   - Check `export.xml` or Apple docs for `HKQuantityTypeIdentifier*` 
   - Common: `HKQuantityTypeIdentifierHeartRate`, `HKQuantityTypeIdentifierStepCount`, etc.

2. **Add to METRICS config in `src/types/health.ts`**
   ```typescript
   { 
     id: 'metricname', 
     label: 'Display Name', 
     color: '#HEXCOLOR', 
     type: 'HKQuantityTypeIdentifier...',
     unit: 'unit',
     aggregation: 'SUM' | 'AVG'  // SUM for cumulative, AVG for measurements
   }
   ```

3. **Add chart to `src/pages/index.astro`**
   ```astro
   <HealthChart client:load metric="metricname" title="Display Name" color="#HEXCOLOR" />
   ```

4. **Regenerate JSON**
   ```bash
   node scripts/generate-json.js
   ```

5. **Verify**
   ```bash
   ls -lh public/data-metricname.json
   ```

## Color reference (Apple Health palette)
- Green: `#30D158` (steps, activity)
- Red: `#FF375F` (heart rate)
- Orange: `#FF9F0A` (calories, energy)
- Blue: `#0A84FF` (workouts, distance)
- Purple: `#BF5AF2` (misc)

## Gotchas
- Time range keys in HealthChart.tsx: `7d`, `30d`, `365d`, `all` (not "week"/"month")
- Sleep is special: type is `HKCategoryTypeIdentifierSleepAnalysis`, calculate duration
- If metric has no data, chart shows "No data available" message

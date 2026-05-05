# How to Export Apple Health Data

Follow these steps to export your health data from iPhone and prepare it for the vitals dashboard.

## Step 1: Export from iPhone Health App

1. Open the **Health app** on your iPhone
2. Tap your **profile picture or initials** in the top-right corner
3. Scroll down to the bottom
4. Tap **Export All Health Data**
5. Confirm by tapping **Export** in the prompt
6. Wait for the export to complete (can take several minutes for large datasets)
7. When the Share Sheet appears, choose **Save to Files**
8. Save the `health-records.zip` file to a convenient location

## Step 2: Extract the Export

1. On your Mac, locate the saved `health-records.zip`
2. Double-click to extract: this creates a folder containing `export.xml`
3. The `export.xml` file contains all your health and fitness data in XML format
4. Typical size: 1-2GB for years of data (3.68M records in our test)

## Step 3: Ingest with vitals (Two-Step Pipeline)

### Option A: Using the AI agent (recommended)
If you're using Claude Code or OpenCode, just say:
```
ingest /path/to/export.xml
```
The agent will run both steps automatically.

### Option B: Manual process
```bash
# Step 1: Parse XML → SQLite (handles 1.36GB, 3.68M records)
node scripts/parse-health-xml.js ~/Downloads/apple_health_export/export.xml

# Creates: health.db (366MB SQLite database)

# Step 2: Generate static JSON for dashboard
node scripts/generate-json.js

# Creates: public/data-*.json (per-metric files)
#          public/workouts.json
#          public/health-stats.json
```

### Step 4: View your data
```bash
npm run dev
# Opens http://localhost:4321/ with your real health data
```

## What's Included

The export contains **all** health data from your iPhone Health app:

- Steps, distance, flights climbed
- Heart rate (resting, walking, workouts)
- Active and basal energy burned
- Body measurements (weight, BMI, body fat %)
- Sleep analysis (duration calculated from start/end dates)
- Workouts with routes and metrics
- VO2 Max, cardio fitness
- Blood pressure, oxygen saturation
- And many more HealthKit data types

## Data Pipeline Architecture

```
export.xml (1.36GB)
    ↓
parse-health-xml.js (streaming line-by-line parser)
    ↓
health.db (SQLite, 366MB, 3.68M records)
    ↓
generate-json.js (aggregation: SUM/AVG by time range)
    ↓
public/data-*.json (static JSON, <300KB each)
    ↓
Dashboard (reads JSON at build time, Vercel-compatible)
```

### Aggregation rules
- **SUM**: Steps, active/basal energy (cumulative metrics)
- **AVG**: Heart rate, weight, body fat % (measurement metrics)
- **Duration**: Sleep analysis (endDate - startDate, displayed as `Xh Ym`)

## Data Privacy

- Your `export.xml` and `health.db` are **never** sent anywhere
- All data files (`health.db`, `public/data-*.json`) are in `.gitignore`: won't be committed to git
- All processing happens locally on your machine
- The dashboard runs entirely in your browser (no server-side data collection)
- SQLite database is local-only, never exposed to network

## Troubleshooting

**Export takes forever**: Large health datasets (years of data) can take 5-10 minutes to export. Be patient.

**File is huge**: The `export.xml` can be 1-2GB for years of data. The parse script uses streaming XML parsing to handle large files efficiently without memory issues.

**Missing data**: Some data types may not be exported if they were never collected by your devices or third-party apps.

**Script crashes**: Ensure you have Node.js 20+ installed. The streaming parser is designed to handle 1.36GB files without running out of memory.

## Automating Updates

To refresh your dashboard with new data:

1. Repeat the export steps on your iPhone
2. Run the two-step pipeline:
   ```bash
   node scripts/parse-health-xml.js new-export.xml
   node scripts/generate-json.js
   ```
3. Refresh your browser: the dashboard updates automatically

## Performance Notes

- Parsing 1.36GB export.xml takes ~2-3 minutes on modern Mac
- SQLite database is 366MB (too large for GitHub's 100MB limit: hence gitignored)
- Generated JSON files are <300KB each (safe for git, fast for dashboard)
- Dashboard is static (no runtime DB queries): perfect for Vercel deployment

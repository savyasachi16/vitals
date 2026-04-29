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
2. Double-click to extract — this creates a folder containing `export.xml`
3. The `export.xml` file contains all your health and fitness data in XML format

## Step 3: Parse with vitals

1. Copy `export.xml` to the `vitals` project root directory
2. Run the parse script:

```bash
node scripts/parse-health-xml.js export.xml
```

3. This creates `public/health-data.json` with all your health records in a clean JSON format
4. Start the dev server to see your data:

```bash
npm run dev
```

## What's Included

The export contains **all** health data from your iPhone Health app:

- Steps, distance, flights climbed
- Heart rate (resting, walking, workouts)
- Active and basal energy burned
- Body measurements (weight, BMI, body fat %)
- Sleep analysis
- Workouts with routes and metrics
- VO2 Max, cardio fitness
- Blood pressure, oxygen saturation
- And many more HealthKit data types

## Data Privacy

- Your `export.xml` and `health-data.json` are **never** sent anywhere
- Both files are in `.gitignore` by default — they won't be committed to git
- All processing happens locally on your machine
- The dashboard runs entirely in your browser (no server-side data collection)

## Troubleshooting

**Export takes forever**: Large health datasets (years of data) can take 5-10 minutes to export. Be patient.

**File is huge**: The `export.xml` can be 100MB+ for years of data. The parse script uses streaming XML parsing to handle large files efficiently.

**Missing data**: Some data types may not be exported if they were never collected by your devices or third-party apps.

## Automating Updates

To refresh your dashboard with new data:

1. Repeat the export steps on your iPhone
2. Run `node scripts/parse-health-xml.js new-export.xml`
3. Refresh your browser — the dashboard updates automatically

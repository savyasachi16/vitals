# vitals

Apple Health data dashboard with native iOS Health app styling. Built with Astro, Tailwind CSS, and Recharts.

## Stack

- **Astro 6** — static site generation
- **React** — interactive chart components via `@astrojs/react`
- **Tailwind CSS v4** — via `@tailwindcss/vite`
- **Recharts** — health data visualizations
- **Vercel** — deployment

## Quick Start

```bash
# Install dependencies
npm install

# Parse your Apple Health export
# First, export from iPhone: Health app → Profile → Export All Health Data
# Save the export.xml file to the project root
node scripts/parse-health-xml.js export.xml

# Start dev server
npm run dev
```

## How to Export Apple Health Data

See [docs/export.md](docs/export.md) for step-by-step instructions on exporting your health data from iPhone.

## Data Privacy

- `public/health-data.json` is gitignored by default — your health data never leaves your machine
- To use the dashboard, place your `health-data.json` in `public/` after running the parse script
- The parse script only reads the XML and outputs a clean JSON file — no data is sent anywhere

## Ingesting New Data

When you want to update with new health data:

1. Export fresh data from iPhone Health app
2. Run `node scripts/parse-health-xml.js path/to/new-export.xml`
3. The dashboard will automatically reflect the updated data on next load

## Project Structure

```
src/
  components/
    HealthChart.tsx      — Recharts wrapper for time-series data
    MetricCard.astro    — Apple-style metric summary cards
    TimeRangeSelector.tsx — Day/Week/Month/Year toggle
  layouts/
    Layout.astro        — Base HTML wrapper
  pages/
    index.astro         — Main dashboard page
  styles/
    global.css          — Apple Health dark mode theme
  types/
    health.ts           — TypeScript interfaces
scripts/
  parse-health-xml.js   — Node script to convert export.xml → health-data.json
docs/
  export.md            — iPhone export instructions
```

## Deploy

```bash
# Production build
npm run build

# Deploy to Vercel
vercel --prod
```

## License

MIT

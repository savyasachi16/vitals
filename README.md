# vitals

Apple Health dashboard with native iOS Health app styling. Built with Astro 6, Tailwind CSS v4, and Recharts.

[![Deploy with Vercel](https://vercel.com/button)](https://vercel.com/new/clone?repository-url=https://github.com/savyasachi16/vitals)

## Features

- **Dark mode only** — matches Apple Health app aesthetic (bg `#000`, surface `#1C1C1E`)
- **SQLite pipeline** — streams 1.36GB `export.xml` → SQLite → per-metric JSON
- **Interactive charts** — Recharts area charts with 7d/30d/365d/all time ranges
- **Privacy-first** — all processing local, health data never leaves your machine
- **Vercel-ready** — static build, no server-side DB queries

## Quick Start

### 1. Clone & Install
```bash
git clone https://github.com/savyasachi16/vitals.git
cd vitals
npm install
```

### 2. Export Health Data from iPhone
1. Health app → Profile → Export All Health Data → Save to Files
2. Transfer `export.xml` to your Mac (AirDrop/iCloud)
3. Place in project root

### 3. Ingest Data
```bash
# Parse XML → SQLite
node scripts/parse-health-xml.js export.xml

# Generate static JSON
node scripts/generate-json.js
```

### 4. Run Dashboard
```bash
npm run dev
# Opens http://localhost:4321/
```

## Data Pipeline

```
export.xml (1.36GB)
    ↓
parse-health-xml.js (streaming line-by-line)
    ↓
health.db (SQLite, 366MB, 3.68M records)
    ↓
generate-json.js (aggregation: SUM/AVG)
    ↓
public/data-*.json (<300KB each)
    ↓
Dashboard (static, Vercel-compatible)
```

### Aggregation Rules
- **SUM**: Steps, active/basal energy (cumulative metrics)
- **AVG**: Heart rate, weight, body fat % (measurements)
- **Duration**: Sleep analysis (displayed as `Xh Ym`)

## AI-Native Development

This repo includes native configs for:
- **Claude Code** — `CLAUDE.md` + `.claude/skills/` + `.claude/commands/`
- **OpenCode** — `OPENCODE.md` + `.opencode/skills/` + `.opencode/commands/`

### Available Skills
| Skill | Description |
|-------|-------------|
| `ingest` | Full pipeline: export.xml → SQLite → JSON |
| `add-metric` | Add new health metric to dashboard |
| `deploy` | Deploy to Vercel |

### Slash Commands
```bash
# Claude Code
/claude-ingest /path/to/export.xml
/claude-add-metric "blood oxygen"

# OpenCode
/opencode-ingest /path/to/export.xml
/opencode-add-metric "blood oxygen"
```

## Tech Stack

- **Astro 6** — static site generator
- **Tailwind CSS v4** — via `@tailwindcss/vite`
- **React + Recharts** — interactive charts
- **SQLite** — local-first data ingestion
- **TypeScript** — strict mode

## Privacy

- ✅ `export.xml`, `health.db`, `public/data-*.json` all gitignored
- ✅ No network calls in parse scripts
- ✅ All processing happens on your machine
- ✅ Dashboard reads static JSON (no runtime DB)

## Available Metrics

| Metric | Identifier | Aggregation |
|--------|-------------|-------------|
| Steps | `HKQuantityTypeIdentifierStepCount` | SUM |
| Heart Rate | `HKQuantityTypeIdentifierHeartRate` | AVG |
| Resting HR | `HKQuantityTypeIdentifierRestingHeartRate` | AVG |
| Active Energy | `HKQuantityTypeIdentifierActiveEnergyBurned` | SUM |
| Basal Energy | `HKQuantityTypeIdentifierBasalEnergyBurned` | SUM |
| Sleep | `HKCategoryTypeIdentifierSleepAnalysis` | Duration |
| Weight | `HKQuantityTypeIdentifierBodyMass` | AVG |
| Body Fat % | `HKQuantityTypeIdentifierBodyFatPercentage` | AVG |
| Lean Mass | `HKQuantityTypeIdentifierLeanBodyMass` | AVG |
| VO2 Max | `HKQuantityTypeIdentifierVO2Max` | AVG |

## Deploy to Vercel

[![Deploy with Vercel](https://vercel.com/button)](https://vercel.com/new/clone?repository-url=https://github.com/savyasachi16/vitals)

Or manually:
```bash
npm run build
vercel --prod
```

Set environment variables in Vercel dashboard:
- `VERCEL_TOKEN` — from https://vercel.com/account/tokens
- `VERCEL_ORG_ID` — from Vercel project settings
- `VERCEL_PROJECT_ID` — from Vercel project settings

## License

MIT — feel free to fork and adapt for your own health data.

---

**Note**: This dashboard requires your personal Apple Health export. No data is included in the repo.

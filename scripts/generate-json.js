import fs from 'fs';
import Database from 'better-sqlite3';
import { DEFAULT_METRICS, buildDailySeries, metricFilename } from './lib/aggregate.js';

const db = new Database('health.db', { readonly: true });

const dateRange = db.prepare('SELECT MIN(date) as start, MAX(date) as end FROM records').get();
console.log(`Date range: ${dateRange.start} to ${dateRange.end}`);

const types = db.prepare("SELECT DISTINCT type FROM records WHERE type LIKE 'HK%' ORDER BY type").all();
const availableTypes = new Set(types.map((t) => t.type));
console.log(`Found ${types.length} record types in DB`);

const stats = {};
for (const { type } of types) {
  stats[type] = db.prepare(`
    SELECT COUNT(*) as total_records, MIN(date) as first_date, MAX(date) as last_date,
           AVG(value) as avg_value, MIN(value) as min_value, MAX(value) as max_value
    FROM records WHERE type = ?
  `).get(type);
}

fs.writeFileSync('public/health-stats.json', JSON.stringify({
  dateRange,
  types: types.map((t) => t.type),
  stats,
  lastUpdated: new Date().toISOString(),
}, null, 2));
console.log('Written public/health-stats.json');

for (const type of DEFAULT_METRICS) {
  if (!availableTypes.has(type)) {
    console.log(`  skip ${type} (not in DB)`);
    continue;
  }
  const series = buildDailySeries(db, type);
  const out = {
    type,
    referenceDate: dateRange.end,
    series,
    lastUpdated: new Date().toISOString(),
  };
  const filename = `public/data-${metricFilename(type)}.json`;
  fs.writeFileSync(filename, JSON.stringify(out));
  console.log(`Written ${filename} (${series.length} daily points)`);
}

const workouts = db.prepare(`
  SELECT activity_type, duration, duration_unit, total_energy_kcal,
         total_distance, distance_unit, start_date, end_date, source_name
  FROM workouts ORDER BY start_date DESC LIMIT 200
`).all();

fs.writeFileSync('public/workouts.json', JSON.stringify({
  workouts,
  count: workouts.length,
  lastUpdated: new Date().toISOString(),
}));
console.log(`Written public/workouts.json (${workouts.length} workouts)`);

db.close();
console.log('Done.');

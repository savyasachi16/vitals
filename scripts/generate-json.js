import fs from 'fs';
import Database from 'better-sqlite3';

const db = new Database('health.db');

// Get date range
const dateRange = db.prepare('SELECT MIN(date) as start, MAX(date) as end FROM records').get();
console.log(`Date range: ${dateRange.start} to ${dateRange.end}`);

// Use the LAST data point as reference (not "now") since exports are historical
const lastDate = dateRange.end;
console.log(`Using last data point as reference: ${lastDate}`);

// Metrics that should be SUMmed (cumulative counts) vs AVG (measurements)
const SUM_TYPES = new Set([
  'HKQuantityTypeIdentifierStepCount',
  'HKQuantityTypeIdentifierActiveEnergyBurned',
  'HKQuantityTypeIdentifierBasalEnergyBurned',
  'HKCategoryTypeIdentifierSleepAnalysis', // Sleep: total hours per day
]);

// For each metric type, generate daily/weekly/monthly aggregates
const timeRanges = [
  { name: '7d', days: 7 },
  { name: '30d', days: 30 },
  { name: '365d', days: 365 },
  { name: 'all', days: 99999 },
];

// Get all record types from DB
const types = db.prepare("SELECT DISTINCT type FROM records WHERE type LIKE 'HK%' ORDER BY type").all();
console.log(`Found ${types.length} types`);

// Generate summary stats for each type
const stats = {};
for (const { type } of types) {
  const row = db.prepare(`
    SELECT
      COUNT(*) as total_records,
      MIN(date) as first_date,
      MAX(date) as last_date,
      AVG(value) as avg_value,
      MIN(value) as min_value,
      MAX(value) as max_value
    FROM records
    WHERE type = ?
  `).get(type);

  stats[type] = row;
}

// Write stats
fs.writeFileSync('public/health-stats.json', JSON.stringify({
  dateRange,
  types: types.map(t => t.type),
  stats,
  lastUpdated: new Date().toISOString(),
}, null, 2));
console.log('Written public/health-stats.json');

// For each metric type, write time-series JSON with proper aggregation
const ALL_TYPES = [
  'HKQuantityTypeIdentifierStepCount',
  'HKQuantityTypeIdentifierHeartRate',
  'HKQuantityTypeIdentifierActiveEnergyBurned',
  'HKQuantityTypeIdentifierBasalEnergyBurned',
  'HKQuantityTypeIdentifierBodyMass',
  'HKCategoryTypeIdentifierSleepAnalysis',
  'HKQuantityTypeIdentifierVO2Max',
  'HKQuantityTypeIdentifierRestingHeartRate',
  'HKQuantityTypeIdentifierBodyFatPercentage',
  'HKQuantityTypeIdentifierLeanBodyMass',
];

for (const type of ALL_TYPES) {
  const isSumType = SUM_TYPES.has(type);
  const data = {
    type,
    timeSeries: {},
    lastUpdated: new Date().toISOString(),
  };

  for (const range of timeRanges) {
    // Calculate the start date based on lastDate in data, not "now"
    const startDate = new Date(lastDate + 'T00:00:00');
    startDate.setDate(startDate.getDate() - range.days);
    const startDateStr = startDate.toISOString().split('T')[0];

    const rows = isSumType
      ? db.prepare(`
          SELECT date, SUM(value) as value, COUNT(*) as count
          FROM records
          WHERE type = ? AND date >= ?
          GROUP BY date
          ORDER BY date
        `).all(type, startDateStr)
      : db.prepare(`
          SELECT date, AVG(value) as value, COUNT(*) as count
          FROM records
          WHERE type = ? AND date >= ?
          GROUP BY date
          ORDER BY date
        `).all(type, startDateStr);

    data.timeSeries[range.name] = rows.map(r => ({
      date: r.date,
      value: parseFloat((r.value || 0).toFixed(4)),
      count: r.count,
      label: new Date(r.date).toLocaleDateString('en-US', { month: 'short', day: 'numeric' }),
    }));
  }

  const filename = `public/data-${type.replace('HKQuantityTypeIdentifier', '').replace('HKCategoryTypeIdentifier', '').toLowerCase()}.json`;
  fs.writeFileSync(filename, JSON.stringify(data, null, 2));
  console.log(`Written ${filename} (${data.timeSeries.all.length} data points)`);
}

// Generate workouts JSON
const workouts = db.prepare(`
  SELECT activity_type, duration, duration_unit, total_energy_kcal, total_distance, distance_unit, start_date, end_date, source_name
  FROM workouts
  ORDER BY start_date DESC
  LIMIT 100
`).all();

fs.writeFileSync('public/workouts.json', JSON.stringify({
  workouts,
  count: workouts.length,
  lastUpdated: new Date().toISOString(),
}, null, 2));
console.log(`Written public/workouts.json (${workouts.length} workouts)`);

db.close();
console.log('\nDone! Static JSON files generated for dashboard.');

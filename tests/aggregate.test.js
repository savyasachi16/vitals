import { describe, it, expect } from 'vitest';
import Database from 'better-sqlite3';
import { SUM_TYPES, buildDailySeries, metricFilename } from '../scripts/lib/aggregate.js';

function fixtureDb() {
  const db = new Database(':memory:');
  db.exec(`
    CREATE TABLE records (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      type TEXT NOT NULL,
      value REAL NOT NULL,
      unit TEXT,
      start_date TEXT NOT NULL,
      end_date TEXT NOT NULL,
      source_name TEXT,
      date TEXT GENERATED ALWAYS AS (substr(start_date, 1, 10)) STORED
    );
  `);
  const ins = db.prepare(
    'INSERT INTO records (type, value, unit, start_date, end_date, source_name) VALUES (?, ?, ?, ?, ?, ?)'
  );
  const rows = [
    ['HKQuantityTypeIdentifierStepCount', 1000, 'count', '2026-01-01 08:00:00 +0000'],
    ['HKQuantityTypeIdentifierStepCount', 2500, 'count', '2026-01-01 14:00:00 +0000'],
    ['HKQuantityTypeIdentifierStepCount',  500, 'count', '2026-01-02 09:00:00 +0000'],
    ['HKQuantityTypeIdentifierHeartRate',  60, 'count/min', '2026-01-01 08:00:00 +0000'],
    ['HKQuantityTypeIdentifierHeartRate',  80, 'count/min', '2026-01-01 18:00:00 +0000'],
    ['HKQuantityTypeIdentifierHeartRate',  70, 'count/min', '2026-01-02 09:00:00 +0000'],
  ];
  for (const [t, v, u, s] of rows) ins.run(t, v, u, s, s, 'test');
  return db;
}

describe('SUM_TYPES', () => {
  it('marks step count as a SUM metric', () => {
    expect(SUM_TYPES.has('HKQuantityTypeIdentifierStepCount')).toBe(true);
  });
  it('does not mark heart rate as SUM (it averages)', () => {
    expect(SUM_TYPES.has('HKQuantityTypeIdentifierHeartRate')).toBe(false);
  });
});

describe('buildDailySeries', () => {
  it('sums per-day values for cumulative metrics', () => {
    const db = fixtureDb();
    const series = buildDailySeries(db, 'HKQuantityTypeIdentifierStepCount');
    expect(series).toEqual([
      { date: '2026-01-01', value: 3500, count: 2 },
      { date: '2026-01-02', value: 500, count: 1 },
    ]);
  });

  it('averages per-day values for measurement metrics and emits min/max', () => {
    const db = fixtureDb();
    const series = buildDailySeries(db, 'HKQuantityTypeIdentifierHeartRate');
    expect(series[0]).toEqual({ date: '2026-01-01', value: 70, min: 60, max: 80, count: 2 });
    expect(series[1]).toEqual({ date: '2026-01-02', value: 70, min: 70, max: 70, count: 1 });
  });

  it('omits min/max for SUM metrics', () => {
    const db = fixtureDb();
    const series = buildDailySeries(db, 'HKQuantityTypeIdentifierStepCount');
    expect(series[0]).not.toHaveProperty('min');
    expect(series[0]).not.toHaveProperty('max');
  });

  it('returns empty array for an unknown type', () => {
    const db = fixtureDb();
    expect(buildDailySeries(db, 'HKQuantityTypeIdentifierMissing')).toEqual([]);
  });
});

describe('metricFilename', () => {
  it('strips HK prefixes and lowercases', () => {
    expect(metricFilename('HKQuantityTypeIdentifierStepCount')).toBe('stepcount');
    expect(metricFilename('HKCategoryTypeIdentifierSleepAnalysis')).toBe('sleepanalysis');
  });
});

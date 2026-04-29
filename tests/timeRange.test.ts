import { describe, it, expect } from 'vitest';
import { sliceByRange } from '../src/lib/timeRange';

const series = [
  { date: '2026-01-01', value: 1 },
  { date: '2026-01-15', value: 2 },
  { date: '2026-02-01', value: 3 },
  { date: '2026-03-01', value: 4 },
];

describe('sliceByRange', () => {
  it('returns the full series for "all"', () => {
    expect(sliceByRange(series, 'all', '2026-03-01')).toHaveLength(4);
  });

  it('keeps only points within the last 7 days from the reference', () => {
    const out = sliceByRange(series, '7d', '2026-03-01');
    expect(out.map((p) => p.date)).toEqual(['2026-03-01']);
  });

  it('keeps points within the last 30 days', () => {
    const out = sliceByRange(series, '30d', '2026-03-01');
    expect(out.map((p) => p.date)).toEqual(['2026-02-01', '2026-03-01']);
  });

  it('uses the last point as reference when none is supplied', () => {
    const out = sliceByRange(series, '30d');
    expect(out.at(-1)?.date).toBe('2026-03-01');
  });

  it('handles an empty series safely', () => {
    expect(sliceByRange([], '7d')).toEqual([]);
  });
});

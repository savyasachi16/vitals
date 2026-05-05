import { useEffect, useState } from 'react';

interface Tile {
  label: string;
  metricType: string;
  precision: number;
  formatter?: (v: number) => string;
}

const TILES: Tile[] = [
  { label: 'Steps / day', metricType: 'HKQuantityTypeIdentifierStepCount', precision: 0 },
  { label: 'Active kcal / day', metricType: 'HKQuantityTypeIdentifierActiveEnergyBurned', precision: 0 },
  { label: 'Exercise min / day', metricType: 'HKQuantityTypeIdentifierAppleExerciseTime', precision: 0 },
  {
    label: 'Sleep / night',
    metricType: 'HKCategoryTypeIdentifierSleepAnalysis',
    precision: 1,
    formatter: (v: number) => {
      const m = Math.round(v * 60);
      return `${Math.floor(m / 60)}h ${m % 60}m`;
    },
  },
];

interface Series {
  series: Array<{ value: number }>;
}

function metricSlug(type: string): string {
  return type
    .replace('HKQuantityTypeIdentifier', '')
    .replace('HKCategoryTypeIdentifier', '')
    .toLowerCase();
}

export default function SummaryStats() {
  const [averages, setAverages] = useState<Record<string, number>>({});

  useEffect(() => {
    Promise.all(
      TILES.map((t) =>
        fetch(`/data-${metricSlug(t.metricType)}.json`)
          .then((r) => (r.ok ? r.json() as Promise<Series> : null))
          .then((d) => [t.metricType, d ? avgOfLast(d.series, 30) : null] as const)
          .catch(() => [t.metricType, null] as const),
      ),
    ).then((entries) => {
      const next: Record<string, number> = {};
      for (const [k, v] of entries) if (v != null) next[k] = v;
      setAverages(next);
    });
  }, []);

  return (
    <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
      {TILES.map((t) => {
        const v = averages[t.metricType];
        const display = v == null ? '-' : t.formatter ? t.formatter(v) : v.toFixed(t.precision);
        return (
          <div key={t.metricType} className="health-card">
            <p className="m-0 text-[12px] uppercase tracking-wide text-(--color-text-tertiary)">{t.label}</p>
            <p className="m-0 mt-2 text-[24px] font-bold tracking-tight">{display}</p>
            <p className="m-0 text-[11px] text-(--color-text-tertiary)">30d avg</p>
          </div>
        );
      })}
    </div>
  );
}

function avgOfLast(series: Array<{ value: number }>, n: number): number | null {
  if (series.length === 0) return null;
  const w = series.slice(-n);
  return w.reduce((a, p) => a + p.value, 0) / w.length;
}

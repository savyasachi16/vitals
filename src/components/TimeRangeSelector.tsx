import { useEffect, useState } from 'react';
import { useTimeRange } from '../hooks/useTimeRange';
import { RANGES, type TimeRange } from '../lib/timeRange';

interface DateRange {
  start: string | null;
  end: string | null;
}

export default function TimeRangeSelector() {
  const [range, setRange] = useTimeRange();
  const [stats, setStats] = useState<DateRange | null>(null);

  useEffect(() => {
    fetch('/health-stats.json')
      .then((r) => r.json())
      .then((data) => setStats(data.dateRange))
      .catch(() => {});
  }, []);

  return (
    <div className="health-card mb-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h2 className="m-0 text-[28px] font-bold tracking-tight">Health Summary</h2>
          {stats?.start && stats?.end && (
            <p className="m-0 mt-1 text-[13px] text-(--color-text-tertiary)">
              {new Date(stats.start).toLocaleDateString()} → {new Date(stats.end).toLocaleDateString()}
            </p>
          )}
        </div>
        <div
          role="radiogroup"
          aria-label="Select time range"
          className="flex gap-1 rounded-[10px] bg-(--color-surface-secondary) p-1"
        >
          {RANGES.map((r) => {
            const active = range === r;
            return (
              <button
                key={r}
                type="button"
                role="radio"
                aria-checked={active}
                onClick={() => setRange(r as TimeRange)}
                className={[
                  'rounded-lg border-0 px-4 py-1.5 text-sm font-medium transition focus:outline-none focus-visible:ring-2 focus-visible:ring-white/40',
                  active
                    ? 'bg-(--color-bg) text-(--color-text-primary) shadow'
                    : 'bg-transparent text-(--color-text-secondary) hover:text-(--color-text-primary)',
                ].join(' ')}
              >
                {r}
              </button>
            );
          })}
        </div>
      </div>
    </div>
  );
}

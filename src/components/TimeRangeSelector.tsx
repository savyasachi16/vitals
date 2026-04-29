import { useState, useEffect } from 'react';
import type { TimeRange } from '../types/health';

interface TimeRangeSelectorProps {
  onChange?: (range: TimeRange) => void;
}

export default function TimeRangeSelector({ onChange }: TimeRangeSelectorProps) {
  const [timeRange, setTimeRange] = useState<TimeRange>('month');
  const [stats, setStats] = useState<{ start: string | null; end: string | null } | null>(null);

  useEffect(() => {
    fetch('/health-stats.json')
      .then(res => res.json())
      .then(data => {
        setStats(data.dateRange);
      })
      .catch(() => {});
  }, []);

  const handleChange = (range: TimeRange) => {
    setTimeRange(range);
    onChange?.(range);
  };

  return (
    <div className="health-card mb-6">
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '12px' }}>
        <div>
          <h2 style={{ margin: 0, fontSize: '28px', fontWeight: 700 }}>Health Summary</h2>
          {stats && (
            <p style={{ margin: '4px 0 0', fontSize: '13px', color: 'var(--color-text-tertiary)' }}>
              {new Date(stats.start).toLocaleDateString()} to {new Date(stats.end).toLocaleDateString()}
            </p>
          )}
        </div>
        <div style={{ display: 'flex', gap: '4px', background: 'var(--color-surface-secondary)', borderRadius: '10px', padding: '4px' }}>
          {(['7d', '30d', '365d', 'all'] as const).map(range => (
            <button
              key={range}
              onClick={() => handleChange(range)}
              style={{
                padding: '6px 16px',
                borderRadius: '8px',
                border: 'none',
                fontSize: '14px',
                fontWeight: 500,
                cursor: 'pointer',
                transition: 'all 0.2s',
                background: timeRange === range ? 'var(--color-bg)' : 'transparent',
                color: timeRange === range ? 'var(--color-text-primary)' : 'var(--color-text-secondary)',
                boxShadow: timeRange === range ? '0 1px 4px rgba(0,0,0,0.3)' : 'none',
              }}
            >
              {range}
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}

import { useEffect, useMemo, useState } from 'react';
import {
  AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
  type TooltipProps,
} from 'recharts';
import { useTimeRange } from '../hooks/useTimeRange';
import { sliceByRange } from '../lib/timeRange';

interface HealthChartProps {
  metricType: string;
  title: string;
  color: string;
}

interface DailyPoint {
  date: string;
  value: number;
  count: number;
}

interface MetricFile {
  type: string;
  referenceDate: string;
  series: DailyPoint[];
  lastUpdated: string;
}

function formatSleepHours(value: number): string {
  const totalMinutes = Math.round(value * 60);
  const h = Math.floor(totalMinutes / 60);
  const m = totalMinutes % 60;
  if (h === 0) return `${m}m`;
  if (m === 0) return `${h}h`;
  return `${h}h ${m}m`;
}

function formatLabel(date: string): string {
  return new Date(date + 'T00:00:00Z').toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
    timeZone: 'UTC',
  });
}

export default function HealthChart({ metricType, title, color }: HealthChartProps) {
  const [file, setFile] = useState<MetricFile | null>(null);
  const [error, setError] = useState(false);
  const [range] = useTimeRange();
  const isSleep = metricType.includes('Sleep');

  useEffect(() => {
    const slug = metricType
      .replace('HKQuantityTypeIdentifier', '')
      .replace('HKCategoryTypeIdentifier', '')
      .toLowerCase();
    fetch(`/data-${slug}.json`)
      .then((r) => (r.ok ? r.json() : Promise.reject(new Error(String(r.status)))))
      .then(setFile)
      .catch(() => setError(true));
  }, [metricType]);

  const chartData = useMemo(() => {
    if (!file) return [] as Array<DailyPoint & { label: string }>;
    return sliceByRange(file.series, range, file.referenceDate).map((p) => ({
      ...p,
      label: formatLabel(p.date),
    }));
  }, [file, range]);

  const formatValue = (v: number) => (isSleep ? formatSleepHours(v) : v.toFixed(1));

  function CustomTooltip({ active, payload, label }: TooltipProps<number, string>) {
    if (!active || !payload?.length) return null;
    const v = payload[0].value;
    return (
      <div className="rounded-xl border border-(--color-border) bg-(--color-surface-secondary) px-4 py-3 shadow-lg">
        <p className="m-0 text-[13px] text-(--color-text-secondary)">{label}</p>
        <p className="m-0 mt-1 text-xl font-bold text-(--color-text-primary)">
          {typeof v === 'number' ? formatValue(v) : String(v)}
        </p>
      </div>
    );
  }

  if (error) {
    return (
      <div className="health-card flex h-[300px] items-center justify-center">
        <p className="text-(--color-text-tertiary)">No data for {title.toLowerCase()}</p>
      </div>
    );
  }

  if (!file) {
    return (
      <div className="health-card flex h-[300px] items-center justify-center">
        <p className="text-(--color-text-tertiary)">Loading {title.toLowerCase()}…</p>
      </div>
    );
  }

  return (
    <div className="health-card">
      <div className="mb-4 flex items-center justify-between">
        <h3 className="m-0 text-[17px] font-semibold text-(--color-text-secondary)">{title}</h3>
        <span className="text-[13px] text-(--color-text-tertiary)">
          {chartData.length > 0 ? `${chartData.length} days` : '—'}
        </span>
      </div>
      <ResponsiveContainer width="100%" height={250}>
        <AreaChart data={chartData} margin={{ top: 0, right: 0, left: 0, bottom: 0 }}>
          <defs>
            <linearGradient id={`gradient-${metricType}`} x1="0" y1="0" x2="0" y2="1">
              <stop offset="5%" stopColor={color} stopOpacity={0.3} />
              <stop offset="95%" stopColor={color} stopOpacity={0} />
            </linearGradient>
          </defs>
          <CartesianGrid strokeDasharray="3 3" stroke="#38383A" />
          <XAxis dataKey="label" stroke="#EBEBF599" fontSize={11} tickLine={false} axisLine={false} interval="preserveStartEnd" />
          <YAxis
            stroke="#EBEBF599"
            fontSize={11}
            tickLine={false}
            axisLine={false}
            tickFormatter={isSleep ? (v: number) => formatSleepHours(v) : undefined}
          />
          <Tooltip content={<CustomTooltip />} />
          <Area
            type="monotone"
            dataKey="value"
            stroke={color}
            strokeWidth={2}
            fill={`url(#gradient-${metricType})`}
            dot={false}
            animationDuration={400}
          />
        </AreaChart>
      </ResponsiveContainer>
    </div>
  );
}

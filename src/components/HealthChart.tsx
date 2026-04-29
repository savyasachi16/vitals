import { useState, useEffect } from 'react';
import {
  AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, type TooltipProps
} from 'recharts';

interface HealthChartProps {
  metricType: string;
  title: string;
  color: string;
}

interface ChartDataPoint {
  date: string;
  value: number;
  label: string;
}

interface MetricData {
  type: string;
  timeSeries: {
    '7d': ChartDataPoint[];
    '30d': ChartDataPoint[];
    '365d': ChartDataPoint[];
    'all': ChartDataPoint[];
  };
  lastUpdated: string;
}

function formatSleepMinutes(value: number): string {
  const totalMinutes = Math.round(value * 60);
  const hours = Math.floor(totalMinutes / 60);
  const minutes = totalMinutes % 60;
  if (hours === 0) return `${minutes}m`;
  if (minutes === 0) return `${hours}h`;
  return `${hours}h ${minutes}m`;
}

export default function HealthChart({ metricType, title, color }: HealthChartProps) {
  const [metricData, setMetricData] = useState<MetricData | null>(null);
  const [timeRange, setTimeRange] = useState<'7d' | '30d' | '365d' | 'all'>('30d');
  const [chartData, setChartData] = useState<ChartDataPoint[]>([]);
  const isSleep = metricType.includes('Sleep');

  useEffect(() => {
    const filename = metricType.replace('HKQuantityTypeIdentifier', '').replace('HKCategoryTypeIdentifier', '').toLowerCase();
    fetch(`/data-${filename}.json`)
      .then(res => res.json())
      .then(setMetricData)
      .catch(err => console.error('Failed to load metric data:', err));
  }, [metricType]);

  useEffect(() => {
    if (!metricData) return;
    setChartData(metricData.timeSeries[timeRange] || []);
  }, [metricData, timeRange]);

  function CustomTooltip({ active, payload, label }: TooltipProps<number, string>) {
    if (!active || !payload?.length) return null;
    const data = payload[0];
    const displayValue = typeof data.value === 'number'
      ? (isSleep ? formatSleepMinutes(data.value) : data.value.toFixed(1))
      : data.value;

    return (
      <div style={{
        background: '#2C2C2E',
        border: '0.5px solid #38383A',
        borderRadius: 12,
        padding: '12px 16px',
        boxShadow: '0 4px 24px rgba(0,0,0,0.4)',
      }}>
        <p style={{ margin: 0, fontSize: 13, color: '#EBEBF599' }}>{label}</p>
        <p style={{ margin: '4px 0 0', fontSize: 20, fontWeight: 700, color: '#FFFFFF' }}>
          {displayValue}
        </p>
      </div>
    );
  }

  if (!metricData) {
    return (
      <div className="health-card" style={{ height: 300, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        <p style={{ color: 'var(--color-text-tertiary)' }}>Loading {title.toLowerCase()} data...</p>
      </div>
    );
  }

  return (
    <div className="health-card">
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
        <h3 style={{ margin: 0, fontSize: 17, fontWeight: 600, color: 'var(--color-text-secondary)' }}>{title}</h3>
        <div style={{ display: 'flex', gap: 4 }}>
          {(['7d', '30d', '365d', 'all'] as const).map(range => (
            <button
              key={range}
              onClick={() => setTimeRange(range)}
              style={{
                padding: '4px 12px',
                borderRadius: 8,
                border: 'none',
                fontSize: 13,
                fontWeight: 500,
                cursor: 'pointer',
                background: timeRange === range ? color : 'var(--color-surface-secondary)',
                color: timeRange === range ? '#000' : 'var(--color-text-secondary)',
              }}
            >
              {range}
            </button>
          ))}
        </div>
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
          <XAxis
            dataKey="label"
            stroke="#EBEBF599"
            fontSize={11}
            tickLine={false}
            axisLine={false}
            interval="preserveStartEnd"
          />
          <YAxis
            stroke="#EBEBF599"
            fontSize={11}
            tickLine={false}
            axisLine={false}
            tickFormatter={isSleep ? (v: number) => formatSleepMinutes(v) : undefined}
          />
          <Tooltip content={<CustomTooltip />} />
          <Area
            type="monotone"
            dataKey="value"
            stroke={color}
            strokeWidth={2}
            fill={`url(#gradient-${metricType})`}
            dot={false}
            animationDuration={500}
          />
        </AreaChart>
      </ResponsiveContainer>
    </div>
  );
}

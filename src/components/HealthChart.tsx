import {
  AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
  type TooltipProps,
} from 'recharts';
import { useMetric, formatLabel } from '../hooks/useMetric';
import Empty from './_chart/Empty';
import Header from './_chart/Header';
import ChartTooltip from './_chart/Tooltip';

interface Props {
  metricType: string;
  title: string;
  color: string;
  unit?: string;
  formatter?: (v: number) => string;
}

const SLEEP_DURATION = 'HKCategoryTypeIdentifierSleepAnalysis';

function formatSleepHours(value: number): string {
  const totalMinutes = Math.round(value * 60);
  const h = Math.floor(totalMinutes / 60);
  const m = totalMinutes % 60;
  if (h === 0) return `${m}m`;
  if (m === 0) return `${h}h`;
  return `${h}h ${m}m`;
}

export default function HealthChart({ metricType, title, color, unit, formatter }: Props) {
  const { series, error, loading, isEmpty, unit: jsonUnit } = useMetric(metricType);
  const isSleep = metricType === SLEEP_DURATION;
  const fmt = formatter ?? (isSleep ? formatSleepHours : (v: number) => v.toFixed(1));
  const displayUnit = unit ?? jsonUnit;

  if (error || isEmpty) return null;
  if (loading) return <Empty title={title} message="Loading…" />;

  const chartData = series.map((p) => ({ ...p, label: formatLabel(p.date) }));

  function CustomTooltip({ active, payload, label }: TooltipProps<number, string>) {
    if (!active || !payload?.length) return null;
    const v = payload[0].value;
    const value = typeof v === 'number' ? fmt(v) : String(v);
    return <ChartTooltip label={String(label)} primary={`${value}${displayUnit && !isSleep ? ` ${displayUnit}` : ''}`} />;
  }

  return (
    <div className="health-card">
      <Header title={title} unit={isSleep ? undefined : displayUnit} meta={`${chartData.length} days`} />
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

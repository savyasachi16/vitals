import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
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

function defaultFormat(v: number): string {
  if (v >= 1000) return v.toLocaleString(undefined, { maximumFractionDigits: 0 });
  return v.toFixed(1);
}

export default function HealthBarChart({ metricType, title, color, unit, formatter }: Props) {
  const { series, error, loading, isEmpty, unit: jsonUnit } = useMetric(metricType);
  const fmt = formatter ?? defaultFormat;
  const displayUnit = unit ?? jsonUnit;

  if (error || isEmpty) return null;
  if (loading) return <Empty title={title} message="Loading…" />;

  const data = series.map((p) => ({ ...p, label: formatLabel(p.date) }));

  function CustomTooltip({ active, payload, label }: TooltipProps<number, string>) {
    if (!active || !payload?.length) return null;
    const v = payload[0].value;
    const value = typeof v === 'number' ? fmt(v) : String(v);
    return <ChartTooltip label={String(label)} primary={`${value}${displayUnit ? ` ${displayUnit}` : ''}`} />;
  }

  return (
    <div className="health-card">
      <Header title={title} unit={displayUnit} meta={`${data.length} days`} />
      <ResponsiveContainer width="100%" height={250}>
        <BarChart data={data} margin={{ top: 0, right: 0, left: 0, bottom: 0 }}>
          <CartesianGrid strokeDasharray="3 3" stroke="#38383A" vertical={false} />
          <XAxis dataKey="label" stroke="#EBEBF599" fontSize={11} tickLine={false} axisLine={false} interval="preserveStartEnd" />
          <YAxis stroke="#EBEBF599" fontSize={11} tickLine={false} axisLine={false} />
          <Tooltip content={<CustomTooltip />} cursor={{ fill: 'rgba(255,255,255,0.05)' }} />
          <Bar dataKey="value" fill={color} radius={[3, 3, 0, 0]} />
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
}

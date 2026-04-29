import {
  ComposedChart, Area, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
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
}

export default function HealthRangeBand({ metricType, title, color, unit }: Props) {
  const { series, error, loading, isEmpty, unit: jsonUnit } = useMetric(metricType);
  const displayUnit = unit ?? jsonUnit;

  if (error || isEmpty) return null;
  if (loading) return <Empty title={title} message="Loading…" />;

  const data = series.map((p) => ({
    label: formatLabel(p.date),
    avg: p.value,
    min: p.min ?? p.value,
    range: (p.max ?? p.value) - (p.min ?? p.value),
    rawMax: p.max ?? p.value,
  }));

  function CustomTooltip({ active, payload, label }: TooltipProps<number, string>) {
    if (!active || !payload?.length) return null;
    const row = payload[0].payload as typeof data[number];
    return (
      <ChartTooltip
        label={String(label)}
        primary={`${row.avg.toFixed(1)}${displayUnit ? ` ${displayUnit}` : ''}`}
        secondary={`${row.min.toFixed(0)}–${row.rawMax.toFixed(0)} range`}
      />
    );
  }

  return (
    <div className="health-card">
      <Header title={title} unit={displayUnit} meta={`${data.length} days`} />
      <ResponsiveContainer width="100%" height={250}>
        <ComposedChart data={data} margin={{ top: 0, right: 0, left: 0, bottom: 0 }}>
          <CartesianGrid strokeDasharray="3 3" stroke="#38383A" />
          <XAxis dataKey="label" stroke="#EBEBF599" fontSize={11} tickLine={false} axisLine={false} interval="preserveStartEnd" />
          <YAxis stroke="#EBEBF599" fontSize={11} tickLine={false} axisLine={false} domain={['auto', 'auto']} />
          <Tooltip content={<CustomTooltip />} />
          <Area type="monotone" dataKey="min" stackId="band" stroke="none" fill="transparent" />
          <Area type="monotone" dataKey="range" stackId="band" stroke="none" fill={color} fillOpacity={0.18} />
          <Line type="monotone" dataKey="avg" stroke={color} strokeWidth={2} dot={false} />
        </ComposedChart>
      </ResponsiveContainer>
    </div>
  );
}

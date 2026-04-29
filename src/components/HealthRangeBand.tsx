import {
  ComposedChart, Area, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
  type TooltipProps,
} from 'recharts';
import { useMetric, formatLabel } from '../hooks/useMetric';

interface Props {
  metricType: string;
  title: string;
  color: string;
  unit?: string;
}

export default function HealthRangeBand({ metricType, title, color, unit }: Props) {
  const { series, error, loading } = useMetric(metricType);

  if (error) return <Empty title={title} message="No data" />;
  if (loading) return <Empty title={title} message="Loading…" />;

  // Recharts "stacked" trick: render min as transparent, then (max-min) on top to draw the band.
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
      <div className="rounded-xl border border-(--color-border) bg-(--color-surface-secondary) px-4 py-3 shadow-lg">
        <p className="m-0 text-[13px] text-(--color-text-secondary)">{label}</p>
        <p className="m-0 mt-1 text-xl font-bold text-(--color-text-primary)">
          {row.avg.toFixed(1)}{unit ? ` ${unit}` : ''}
        </p>
        <p className="m-0 text-[12px] text-(--color-text-tertiary)">
          {row.min.toFixed(0)}–{row.rawMax.toFixed(0)} range
        </p>
      </div>
    );
  }

  return (
    <div className="health-card">
      <Header title={title} count={data.length} unit={unit} />
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

function Header({ title, count, unit }: { title: string; count: number; unit?: string }) {
  return (
    <div className="mb-4 flex items-center justify-between">
      <h3 className="m-0 text-[17px] font-semibold text-(--color-text-secondary)">
        {title}{unit ? <span className="ml-2 text-[12px] font-normal text-(--color-text-tertiary)">{unit}</span> : null}
      </h3>
      <span className="text-[13px] text-(--color-text-tertiary)">{count} days</span>
    </div>
  );
}

function Empty({ title, message }: { title: string; message: string }) {
  return (
    <div className="health-card flex h-[300px] items-center justify-center">
      <p className="text-(--color-text-tertiary)">{message} {title.toLowerCase()}</p>
    </div>
  );
}

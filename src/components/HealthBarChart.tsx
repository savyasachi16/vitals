import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
  type TooltipProps,
} from 'recharts';
import { useMetric, formatLabel } from '../hooks/useMetric';

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
  const { file, series, error, loading } = useMetric(metricType);
  const fmt = formatter ?? defaultFormat;

  if (error) return <Empty title={title} message="No data" />;
  if (loading) return <Empty title={title} message="Loading…" />;

  const data = series.map((p) => ({ ...p, label: formatLabel(p.date) }));

  function CustomTooltip({ active, payload, label }: TooltipProps<number, string>) {
    if (!active || !payload?.length) return null;
    const v = payload[0].value;
    return (
      <div className="rounded-xl border border-(--color-border) bg-(--color-surface-secondary) px-4 py-3 shadow-lg">
        <p className="m-0 text-[13px] text-(--color-text-secondary)">{label}</p>
        <p className="m-0 mt-1 text-xl font-bold text-(--color-text-primary)">
          {typeof v === 'number' ? fmt(v) : String(v)}{unit ? ` ${unit}` : ''}
        </p>
      </div>
    );
  }

  return (
    <div className="health-card">
      <Header title={title} count={data.length} unit={unit} />
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

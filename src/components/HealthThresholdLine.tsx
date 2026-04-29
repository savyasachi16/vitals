import {
  AreaChart, Area, Line, ReferenceArea, ReferenceLine, XAxis, YAxis,
  CartesianGrid, Tooltip, ResponsiveContainer, ComposedChart,
  type TooltipProps,
} from 'recharts';
import { useMetric, formatLabel } from '../hooks/useMetric';

interface Threshold {
  label: string;
  y1?: number;
  y2?: number;
  color: string;
}

interface Props {
  metricType: string;
  title: string;
  color: string;
  unit?: string;
  thresholds?: Threshold[];
}

export default function HealthThresholdLine({ metricType, title, color, unit, thresholds = [] }: Props) {
  const { series, error, loading } = useMetric(metricType);

  if (error) return <Empty title={title} message="No data" />;
  if (loading) return <Empty title={title} message="Loading…" />;

  const data = series.map((p) => ({ ...p, label: formatLabel(p.date) }));

  function CustomTooltip({ active, payload, label }: TooltipProps<number, string>) {
    if (!active || !payload?.length) return null;
    const v = payload.find((x) => x.dataKey === 'value')?.value;
    return (
      <div className="rounded-xl border border-(--color-border) bg-(--color-surface-secondary) px-4 py-3 shadow-lg">
        <p className="m-0 text-[13px] text-(--color-text-secondary)">{label}</p>
        <p className="m-0 mt-1 text-xl font-bold text-(--color-text-primary)">
          {typeof v === 'number' ? v.toFixed(1) : '—'}{unit ? ` ${unit}` : ''}
        </p>
      </div>
    );
  }

  return (
    <div className="health-card">
      <div className="mb-4 flex items-center justify-between">
        <h3 className="m-0 text-[17px] font-semibold text-(--color-text-secondary)">
          {title}{unit ? <span className="ml-2 text-[12px] font-normal text-(--color-text-tertiary)">{unit}</span> : null}
        </h3>
        {thresholds.length > 0 && (
          <span className="flex gap-2 text-[11px] text-(--color-text-tertiary)">
            {thresholds.map((t) => (
              <span key={t.label} className="flex items-center gap-1">
                <span className="inline-block h-2 w-2 rounded-sm" style={{ background: t.color }} />
                {t.label}
              </span>
            ))}
          </span>
        )}
      </div>
      <ResponsiveContainer width="100%" height={250}>
        <ComposedChart data={data} margin={{ top: 0, right: 0, left: 0, bottom: 0 }}>
          <CartesianGrid strokeDasharray="3 3" stroke="#38383A" />
          <XAxis dataKey="label" stroke="#EBEBF599" fontSize={11} tickLine={false} axisLine={false} interval="preserveStartEnd" />
          <YAxis stroke="#EBEBF599" fontSize={11} tickLine={false} axisLine={false} domain={['auto', 'auto']} />
          <Tooltip content={<CustomTooltip />} />
          {thresholds.map((t, i) =>
            t.y1 != null && t.y2 != null ? (
              <ReferenceArea key={i} y1={t.y1} y2={t.y2} fill={t.color} fillOpacity={0.12} ifOverflow="extendDomain" />
            ) : (
              <ReferenceLine key={i} y={t.y1 ?? t.y2} stroke={t.color} strokeDasharray="4 4" />
            ),
          )}
          <Line type="monotone" dataKey="value" stroke={color} strokeWidth={2} dot={false} />
        </ComposedChart>
      </ResponsiveContainer>
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

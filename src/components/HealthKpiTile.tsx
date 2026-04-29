import { useMemo } from 'react';
import { AreaChart, Area, ResponsiveContainer } from 'recharts';
import { useMetric } from '../hooks/useMetric';

interface Props {
  metricType: string;
  title: string;
  color: string;
  unit?: string;
  precision?: number;
  lowerIsBetter?: boolean;
}

export default function HealthKpiTile({
  metricType,
  title,
  color,
  unit,
  precision = 0,
  lowerIsBetter = false,
}: Props) {
  const { series, error, loading } = useMetric(metricType);

  const { current, baseline, delta } = useMemo(() => {
    if (series.length === 0) return { current: null, baseline: null, delta: 0 };
    const last = series[series.length - 1].value;
    const window = series.slice(-30);
    const mean = window.reduce((a, p) => a + p.value, 0) / window.length;
    return { current: last, baseline: mean, delta: last - mean };
  }, [series]);

  if (error) return <Empty title={title} message="No data" />;
  if (loading) return <Empty title={title} message="Loading…" />;
  if (current == null) return <Empty title={title} message="Empty" />;

  const goodChange = lowerIsBetter ? delta < 0 : delta > 0;
  const arrow = delta === 0 ? '·' : delta > 0 ? '↑' : '↓';
  const deltaClass = delta === 0
    ? 'text-(--color-text-tertiary)'
    : goodChange
    ? 'text-(--color-accent-green)'
    : 'text-(--color-accent-red)';

  return (
    <div className="health-card flex flex-col">
      <h3 className="m-0 text-[15px] font-semibold text-(--color-text-secondary)">{title}</h3>
      <div className="mt-2 flex items-baseline gap-2">
        <span className="text-[40px] font-bold leading-none tracking-tight text-(--color-text-primary)">
          {current.toFixed(precision)}
        </span>
        {unit && <span className="text-[14px] text-(--color-text-tertiary)">{unit}</span>}
      </div>
      <p className={`m-0 mt-1 text-[13px] ${deltaClass}`}>
        {arrow} {Math.abs(delta).toFixed(precision)} vs 30d avg ({baseline?.toFixed(precision)})
      </p>
      <div className="mt-3 -mx-1">
        <ResponsiveContainer width="100%" height={48}>
          <AreaChart data={series} margin={{ top: 2, right: 2, left: 2, bottom: 0 }}>
            <defs>
              <linearGradient id={`spark-${metricType}`} x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor={color} stopOpacity={0.4} />
                <stop offset="100%" stopColor={color} stopOpacity={0} />
              </linearGradient>
            </defs>
            <Area type="monotone" dataKey="value" stroke={color} strokeWidth={1.5} fill={`url(#spark-${metricType})`} dot={false} isAnimationActive={false} />
          </AreaChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
}

function Empty({ title, message }: { title: string; message: string }) {
  return (
    <div className="health-card flex h-[150px] flex-col items-start justify-center">
      <h3 className="m-0 text-[15px] font-semibold text-(--color-text-secondary)">{title}</h3>
      <p className="m-0 mt-2 text-(--color-text-tertiary)">{message}</p>
    </div>
  );
}

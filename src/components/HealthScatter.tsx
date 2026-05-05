import { useMemo } from 'react';
import {
  ComposedChart, Scatter, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
  type TooltipProps,
} from 'recharts';
import { useMetric } from '../hooks/useMetric';
import { linearFit } from '../lib/regression';
import Empty from './_chart/Empty';
import ChartTooltip from './_chart/Tooltip';

interface Props {
  metricType: string;
  title: string;
  color: string;
  unit?: string;
}

export default function HealthScatter({ metricType, title, color, unit }: Props) {
  const { series, error, loading, isEmpty, unit: jsonUnit } = useMetric(metricType);
  const displayUnit = unit ?? jsonUnit;

  const { data, fitLine, latest, slopePerYear } = useMemo(() => {
    const data = series.map((p) => ({
      t: new Date(p.date + 'T00:00:00Z').getTime(),
      value: p.value,
      date: p.date,
    }));
    const fit = linearFit(data.map((p) => ({ x: p.t, y: p.value })));
    if (!fit || data.length < 2) {
      return { data, fitLine: [] as Array<{ t: number; trend: number }>, latest: data.at(-1), slopePerYear: 0 };
    }
    const first = data[0].t;
    const last = data[data.length - 1].t;
    const fitLine = [
      { t: first, trend: fit.slope * first + fit.intercept },
      { t: last, trend: fit.slope * last + fit.intercept },
    ];
    const slopePerYear = fit.slope * 365 * 86_400_000;
    return { data, fitLine, latest: data.at(-1), slopePerYear };
  }, [series]);

  if (error || isEmpty) return null;
  if (loading) return <Empty title={title} message="Loading…" />;

  const merged = [
    ...data.map((p) => ({ t: p.t, value: p.value, label: p.date })),
    ...fitLine.map((p) => ({ t: p.t, trend: p.trend, label: '' })),
  ].sort((a, b) => a.t - b.t);

  function CustomTooltip({ active, payload }: TooltipProps<number, string>) {
    if (!active || !payload?.length) return null;
    const row = payload[0].payload as { value?: number; label?: string };
    if (row.value == null) return null;
    return (
      <ChartTooltip
        label={row.label}
        primary={`${row.value.toFixed(2)}${displayUnit ? ` ${displayUnit}` : ''}`}
      />
    );
  }

  return (
    <div className="health-card">
      <div className="mb-4 flex items-center justify-between">
        <h3 className="m-0 text-[17px] font-semibold text-(--color-text-secondary)">
          {title}
          {displayUnit && (
            <span className="ml-2 text-[12px] font-normal text-(--color-text-tertiary)">{displayUnit}</span>
          )}
        </h3>
        <span className="text-[13px] text-(--color-text-tertiary)">
          {latest ? `${latest.value.toFixed(1)}${displayUnit ? ' ' + displayUnit : ''}` : '-'}
          {Number.isFinite(slopePerYear) && Math.abs(slopePerYear) > 0.01 && (
            <span className={`ml-2 ${slopePerYear < 0 ? 'text-(--color-accent-green)' : 'text-(--color-accent-red)'}`}>
              {slopePerYear > 0 ? '↑' : '↓'} {Math.abs(slopePerYear).toFixed(1)}/yr
            </span>
          )}
        </span>
      </div>
      <ResponsiveContainer width="100%" height={250}>
        <ComposedChart data={merged} margin={{ top: 8, right: 0, left: 0, bottom: 0 }}>
          <CartesianGrid strokeDasharray="3 3" stroke="#38383A" />
          <XAxis
            dataKey="t"
            type="number"
            domain={['dataMin', 'dataMax']}
            stroke="#EBEBF599"
            fontSize={11}
            tickLine={false}
            axisLine={false}
            tickFormatter={(t: number) => new Date(t).toLocaleDateString('en-US', { month: 'short', year: '2-digit' })}
            scale="time"
          />
          <YAxis stroke="#EBEBF599" fontSize={11} tickLine={false} axisLine={false} domain={['auto', 'auto']} />
          <Tooltip content={<CustomTooltip />} />
          <Line type="linear" dataKey="trend" stroke={color} strokeWidth={2} strokeDasharray="6 4" dot={false} connectNulls />
          <Scatter dataKey="value" fill={color} />
        </ComposedChart>
      </ResponsiveContainer>
    </div>
  );
}

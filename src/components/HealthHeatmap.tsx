import { useMemo } from 'react';
import { useMetric } from '../hooks/useMetric';

interface Props {
  metricType: string;
  title: string;
  color: string;
  unit?: string;
  /** How many days of history to render. Defaults to 365. */
  days?: number;
}

interface Cell {
  date: string;
  value: number | null;
}

const MS_PER_DAY = 86_400_000;
const MONTH_NAMES = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];

function isoDate(ts: number): string {
  return new Date(ts).toISOString().slice(0, 10);
}

function dayOfWeek(ts: number): number {
  return new Date(ts).getUTCDay();
}

export default function HealthHeatmap({ metricType, title, color, unit, days = 365 }: Props) {
  const { file, error, loading } = useMetric(metricType);

  const { weeks, monthLabels, max, total, daysWithData } = useMemo(() => {
    if (!file || file.series.length === 0) {
      return { weeks: [] as Cell[][], monthLabels: [] as Array<{ col: number; label: string }>, max: 0, total: 0, daysWithData: 0 };
    }
    const map = new Map(file.series.map((p) => [p.date, p.value]));
    const refTs = new Date(file.referenceDate + 'T00:00:00Z').getTime();
    const startTs = refTs - (days - 1) * MS_PER_DAY;
    // Pad to start of week (Sunday) so columns align cleanly.
    const padStart = startTs - dayOfWeek(startTs) * MS_PER_DAY;

    const cells: Cell[] = [];
    for (let t = padStart; t <= refTs; t += MS_PER_DAY) {
      const d = isoDate(t);
      const inRange = t >= startTs;
      const v = map.get(d);
      cells.push({ date: d, value: inRange && v != null ? v : null });
    }
    const weeks: Cell[][] = [];
    for (let i = 0; i < cells.length; i += 7) weeks.push(cells.slice(i, i + 7));

    // Month label per week column: emit only when the month of the week's Sunday changes.
    const monthLabels: Array<{ col: number; label: string }> = [];
    let lastMonth = -1;
    weeks.forEach((w, i) => {
      const firstReal = w.find((c) => c && c.value !== undefined);
      if (!firstReal) return;
      const m = new Date(firstReal.date + 'T00:00:00Z').getUTCMonth();
      if (m !== lastMonth) {
        monthLabels.push({ col: i + 1, label: MONTH_NAMES[m] });
        lastMonth = m;
      }
    });

    let max = 0;
    let total = 0;
    let daysWithData = 0;
    for (const c of cells) {
      if (c.value != null) {
        if (c.value > max) max = c.value;
        total += c.value;
        daysWithData++;
      }
    }
    return { weeks, monthLabels, max, total, daysWithData };
  }, [file, days]);

  if (error) return <Empty title={title} message="No data" />;
  if (loading) return <Empty title={title} message="Loading…" />;

  function intensity(v: number | null): string {
    if (v == null) return 'rgba(255,255,255,0.04)';
    if (max === 0) return 'rgba(255,255,255,0.04)';
    const t = Math.min(1, Math.max(0.12, v / max));
    return `${color}${Math.round(t * 255).toString(16).padStart(2, '0')}`;
  }

  return (
    <div className="health-card">
      <div className="mb-4 flex items-center justify-between">
        <h3 className="m-0 text-[17px] font-semibold text-(--color-text-secondary)">{title}</h3>
        <span className="text-[13px] text-(--color-text-tertiary)">
          last {days} days · {daysWithData} recorded · {total.toFixed(0)}{unit ? ` ${unit}` : ''} total
        </span>
      </div>
      <div
        className="grid"
        style={{
          gridTemplateColumns: `20px repeat(${weeks.length}, minmax(0, 1fr))`,
          gridTemplateRows: '14px repeat(7, minmax(0, 1fr))',
          gap: '3px',
        }}
      >
        {/* top-left empty corner */}
        <div />
        {/* month labels row */}
        {Array.from({ length: weeks.length }).map((_, wi) => {
          const lbl = monthLabels.find((m) => m.col === wi + 1);
          return (
            <div key={`m-${wi}`} className="text-[10px] leading-none text-(--color-text-tertiary)">
              {lbl?.label ?? ''}
            </div>
          );
        })}
        {/* day-of-week labels (Mon, Wed, Fri) and cells */}
        {Array.from({ length: 7 }).map((_, di) => (
          <div
            key={`d-${di}`}
            className="text-[10px] leading-none text-(--color-text-tertiary)"
            style={{ gridColumn: 1, gridRow: di + 2, alignSelf: 'center' }}
          >
            {di === 1 ? 'Mon' : di === 3 ? 'Wed' : di === 5 ? 'Fri' : ''}
          </div>
        ))}
        {weeks.flatMap((w, wi) =>
          Array.from({ length: 7 }).map((_, di) => {
            const cell = w[di];
            if (!cell) return null;
            return (
              <div
                key={`c-${wi}-${di}`}
                className="rounded-[3px]"
                style={{
                  background: intensity(cell.value),
                  gridColumn: wi + 2,
                  gridRow: di + 2,
                  aspectRatio: '1 / 1',
                }}
                title={cell.value != null ? `${cell.date}: ${cell.value.toFixed(1)}${unit ? ' ' + unit : ''}` : cell.date}
              />
            );
          }),
        )}
      </div>
    </div>
  );
}

function Empty({ title, message }: { title: string; message: string }) {
  return (
    <div className="health-card flex h-[180px] items-center justify-center">
      <p className="text-(--color-text-tertiary)">{message} {title.toLowerCase()}</p>
    </div>
  );
}

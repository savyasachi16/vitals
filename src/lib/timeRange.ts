export type TimeRange = '7d' | '30d' | '90d' | '365d' | 'all';

export const RANGES: TimeRange[] = ['7d', '30d', '90d', '365d', 'all'];
export const RANGE_DAYS: Record<TimeRange, number> = {
  '7d': 7,
  '30d': 30,
  '90d': 90,
  '365d': 365,
  'all': Number.POSITIVE_INFINITY,
};

const URL_KEY = 'range';
const DEFAULT: TimeRange = '30d';

function readUrl(): TimeRange {
  if (typeof window === 'undefined') return DEFAULT;
  const v = new URLSearchParams(window.location.search).get(URL_KEY);
  return (RANGES as string[]).includes(v ?? '') ? (v as TimeRange) : DEFAULT;
}

let current: TimeRange = readUrl();
const subs = new Set<(r: TimeRange) => void>();

export function getTimeRange(): TimeRange {
  return current;
}

export function setTimeRange(r: TimeRange): void {
  if (r === current) return;
  current = r;
  if (typeof window !== 'undefined') {
    const u = new URL(window.location.href);
    u.searchParams.set(URL_KEY, r);
    window.history.replaceState({}, '', u);
  }
  subs.forEach((fn) => fn(r));
}

export function subscribeTimeRange(fn: (r: TimeRange) => void): () => void {
  subs.add(fn);
  return () => {
    subs.delete(fn);
  };
}

export function sliceByRange<T extends { date: string }>(
  series: T[],
  range: TimeRange,
  referenceDate?: string,
): T[] {
  if (range === 'all' || series.length === 0) return series;
  const ref = referenceDate ?? series[series.length - 1].date;
  const refMs = new Date(ref + 'T00:00:00Z').getTime();
  const cutoff = refMs - RANGE_DAYS[range] * 86_400_000;
  return series.filter((p) => new Date(p.date + 'T00:00:00Z').getTime() >= cutoff);
}

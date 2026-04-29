import { useEffect, useMemo, useState } from 'react';
import { useTimeRange } from './useTimeRange';
import { sliceByRange } from '../lib/timeRange';

export interface DailyPoint {
  date: string;
  value: number;
  min?: number;
  max?: number;
  count: number;
}

export interface MetricFile {
  type: string;
  unit?: string;
  referenceDate: string;
  series: DailyPoint[];
  lastUpdated: string;
}

export function metricSlug(type: string): string {
  return type
    .replace('HKQuantityTypeIdentifier', '')
    .replace('HKCategoryTypeIdentifier', '')
    .toLowerCase();
}

export function useMetric(metricType: string) {
  const [file, setFile] = useState<MetricFile | null>(null);
  const [error, setError] = useState(false);
  const [range] = useTimeRange();

  useEffect(() => {
    fetch(`/data-${metricSlug(metricType)}.json`)
      .then((r) => (r.ok ? r.json() : Promise.reject(new Error(String(r.status)))))
      .then(setFile)
      .catch(() => setError(true));
  }, [metricType]);

  const series = useMemo(() => {
    if (!file) return [];
    return sliceByRange(file.series, range, file.referenceDate);
  }, [file, range]);

  return {
    file,
    series,
    range,
    unit: file?.unit ?? '',
    error,
    loading: !file && !error,
    isEmpty: !!file && file.series.length === 0,
  };
}

export function formatLabel(date: string): string {
  return new Date(date + 'T00:00:00Z').toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
    timeZone: 'UTC',
  });
}

import { useSyncExternalStore } from 'react';
import {
  getTimeRange,
  setTimeRange,
  subscribeTimeRange,
  type TimeRange,
} from '../lib/timeRange';

export function useTimeRange(): [TimeRange, (r: TimeRange) => void] {
  const range = useSyncExternalStore(subscribeTimeRange, getTimeRange, () => '30d' as const);
  return [range, setTimeRange];
}

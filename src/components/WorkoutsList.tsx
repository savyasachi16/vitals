import { useEffect, useMemo, useState } from 'react';
import { useTimeRange } from '../hooks/useTimeRange';
import { sliceByRange } from '../lib/timeRange';

interface Workout {
  activity_type: string;
  duration: number;
  duration_unit: string;
  total_energy_kcal: number;
  total_distance: number;
  distance_unit: string;
  start_date: string;
  end_date: string;
  source_name: string;
}

interface WorkoutsFile {
  workouts: Workout[];
  count: number;
  lastUpdated: string;
}

function prettyType(t: string): string {
  return t.replace('HKWorkoutActivityType', '').replace(/([A-Z])/g, ' $1').trim();
}

function isoDate(s: string): string {
  return s.slice(0, 10);
}

function formatDuration(minutes: number): string {
  const m = Math.round(minutes);
  if (m < 60) return `${m}m`;
  return `${Math.floor(m / 60)}h ${m % 60}m`;
}

export default function WorkoutsList() {
  const [file, setFile] = useState<WorkoutsFile | null>(null);
  const [range] = useTimeRange();

  useEffect(() => {
    fetch('/workouts.json')
      .then((r) => r.json())
      .then(setFile)
      .catch(() => {});
  }, []);

  const filtered = useMemo(() => {
    if (!file) return [];
    const tagged = file.workouts.map((w) => ({ ...w, date: isoDate(w.start_date) }));
    const ref = tagged.length ? tagged[0].date : undefined;
    return sliceByRange(tagged, range, ref).slice(0, 30);
  }, [file, range]);

  if (!file) {
    return (
      <div className="health-card flex h-[200px] items-center justify-center">
        <p className="text-(--color-text-tertiary)">Loading workouts…</p>
      </div>
    );
  }

  if (!filtered.length) {
    return (
      <div className="health-card flex h-[120px] items-center justify-center">
        <p className="text-(--color-text-tertiary)">No workouts in this range</p>
      </div>
    );
  }

  return (
    <div className="health-card">
      <div className="mb-3 flex items-center justify-between">
        <h3 className="m-0 text-[17px] font-semibold text-(--color-text-secondary)">Workouts</h3>
        <span className="text-[13px] text-(--color-text-tertiary)">{filtered.length} sessions</span>
      </div>
      <ul className="m-0 list-none divide-y divide-(--color-border) p-0">
        {filtered.map((w, i) => (
          <li key={`${w.start_date}-${i}`} className="flex items-center justify-between py-2">
            <div className="min-w-0">
              <p className="m-0 truncate text-[15px] font-medium text-(--color-text-primary)">
                {prettyType(w.activity_type)}
              </p>
              <p className="m-0 text-[12px] text-(--color-text-tertiary)">
                {new Date(w.start_date).toLocaleDateString()}
              </p>
            </div>
            <div className="ml-4 text-right">
              <p className="m-0 text-[15px] font-semibold text-(--color-text-primary)">
                {formatDuration(w.duration)}
              </p>
              <p className="m-0 text-[12px] text-(--color-text-tertiary)">
                {w.total_energy_kcal > 0 ? `${Math.round(w.total_energy_kcal)} kcal` : '-'}
              </p>
            </div>
          </li>
        ))}
      </ul>
    </div>
  );
}

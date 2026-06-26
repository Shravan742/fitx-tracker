import dayjs from 'dayjs';
import type { Goal, WeightEntry } from '../types';

export interface WeightTrend {
  trendLabel: string;
  onTrack: boolean;
  latest: number;
  first: number;
  perWeek: number;
}

export function computeWeightTrend(entries: WeightEntry[], goal: Goal): WeightTrend | null {
  if (entries.length < 2) return null;
  const sorted = [...entries].sort((a, b) => a.date.localeCompare(b.date));
  const vals = sorted.map((e) => e.weightKg);
  const latest = vals[vals.length - 1];
  const first = vals[0];
  const change = latest - first;
  // Elapsed calendar days between first and last log, not the number of log entries —
  // sparse logging (e.g. once a week) was being treated as "N days" where N was the
  // entry count, wildly overestimating the weekly rate of change.
  const days = Math.max(1, dayjs(sorted[sorted.length - 1].date).diff(dayjs(sorted[0].date), 'day'));
  const perWeek = Number(((change / days) * 7).toFixed(2));

  let trendLabel: string;
  let direction: 'gaining' | 'losing' | 'stable';
  if (Math.abs(change) < 0.3) {
    trendLabel = 'stable ↔';
    direction = 'stable';
  } else if (change > 0) {
    trendLabel = `gaining +${perWeek} kg/wk ↑`;
    direction = 'gaining';
  } else {
    trendLabel = `losing ${Math.abs(perWeek)} kg/wk ↓`;
    direction = 'losing';
  }

  const ideal = goal === 'bulk' ? 'gaining' : goal === 'cut' ? 'losing' : 'stable';
  const onTrack = direction === ideal;

  return { trendLabel, onTrack, latest, first, perWeek };
}

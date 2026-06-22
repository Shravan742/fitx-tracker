import dayjs from 'dayjs';
import { openDb, get1RMHistory as dbGet1RM, save1RM as dbSave1RM } from './db';

export function epley(weight: number, reps: number): number {
  if (reps === 1) return weight;
  return Math.round(weight * (1 + reps / 30));
}

export function brzycki(weight: number, reps: number): number | null {
  if (reps === 1) return weight;
  if (reps >= 37) return null;
  return Math.round((weight * 36) / (37 - reps));
}

export function estimate1RM(weight: number, reps: number): number {
  const e = epley(weight, reps);
  const b = brzycki(weight, reps);
  if (!b) return e;
  return Math.round((e + b) / 2);
}

export async function save1RM(profileId: string, lift: string, value: number, method: string, date?: string) {
  await dbSave1RM({ profileId, lift, value, method, date: date || dayjs().format('YYYY-MM-DD') });
}

export async function get1RMHistory(profileId: string, lift: string) {
  return dbGet1RM(profileId, lift);
}

export async function getLatest1RM(profileId: string, lift: string) {
  const history = await get1RMHistory(profileId, lift);
  if (!history.length) return null;
  return [...history].sort((a, b) => b.date.localeCompare(a.date))[0];
}

interface PercentageSuggestion {
  type: 'percentage';
  orm: number;
  sets: { label: string; weight: number; sets: number; reps: number }[];
}
interface StartSuggestion {
  type: 'start';
  message: string;
}
interface HeuristicSuggestion {
  type: 'increase' | 'hold' | 'same';
  weight?: number;
  sets?: number;
  reps?: number;
}
export type Suggestion = PercentageSuggestion | StartSuggestion | HeuristicSuggestion;

const PHASES = [
  { label: 'Warm-up', pct: 0.5, sets: 2, reps: 5 },
  { label: 'Build', pct: 0.65, sets: 2, reps: 4 },
  { label: 'Working', pct: 0.75, sets: 3, reps: 3 },
  { label: 'Top set', pct: 0.85, sets: 1, reps: 1 },
];

export async function getSuggestion(profileId: string, lift: string): Promise<Suggestion> {
  const latest = await getLatest1RM(profileId, lift);

  if (latest) {
    return {
      type: 'percentage',
      orm: latest.value,
      sets: PHASES.map((p) => ({
        label: p.label,
        weight: Math.round((latest.value * p.pct) / 2.5) * 2.5,
        sets: p.sets,
        reps: p.reps,
      })),
    };
  }

  const db = await openDb();
  const allSessions = await db.getAllFromIndex('sessions', 'by-profile-date');
  const liftSessions = allSessions
    .filter((s) => s.profileId === profileId && s.entries?.some((e: { exercise: string }) => e.exercise === lift))
    .sort((a, b) => b.date.localeCompare(a.date))
    .slice(0, 2);

  if (liftSessions.length < 1) {
    return { type: 'start', message: 'No history yet — log your first session!' };
  }

  const last = liftSessions[0].entries.find((e: { exercise: string }) => e.exercise === lift);
  const prev = liftSessions[1]?.entries?.find((e: { exercise: string }) => e.exercise === lift);

  const hitTarget = (entry: { repsCompleted?: number; repsTarget?: number } | undefined) =>
    !!entry && (entry.repsCompleted ?? 0) >= (entry.repsTarget ?? 0);

  if (liftSessions.length === 2 && hitTarget(last) && hitTarget(prev)) {
    return { type: 'increase', weight: (last.weight || 0) + 2.5, sets: last.sets, reps: last.repsTarget };
  } else if (last && !hitTarget(last)) {
    return { type: 'hold', weight: last.weight, sets: last.sets, reps: last.repsTarget };
  }

  return { type: 'same', weight: last?.weight, sets: last?.sets, reps: last?.repsTarget };
}

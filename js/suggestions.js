import { getLatest1RM } from './orm.js';
import { db } from './db.js';

// Percentage-based working sets when 1RM is known
const PHASES = [
  { label: 'Warm-up',   pct: 0.50, sets: 2, reps: 5  },
  { label: 'Build',     pct: 0.65, sets: 2, reps: 4  },
  { label: 'Working',   pct: 0.75, sets: 3, reps: 3  },
  { label: 'Top set',   pct: 0.85, sets: 1, reps: 1  },
];

export async function getSuggestion(profileId, lift) {
  const latest = await getLatest1RM(profileId, lift);

  if (latest) {
    return {
      type: 'percentage',
      orm: latest.value,
      sets: PHASES.map(p => ({
        label: p.label,
        weight: Math.round(latest.value * p.pct / 2.5) * 2.5, // round to nearest 2.5kg
        sets: p.sets,
        reps: p.reps,
      })),
    };
  }

  // Fallback: streak-based heuristic from last two sessions
  const sessions = await db.getAllFromIndex('sessions', 'by-profile-date',
    IDBKeyRange.bound([profileId, '2000-01-01'], [profileId, '9999-12-31']));

  const liftSessions = sessions
    .filter(s => s.entries?.some(e => e.exercise === lift))
    .sort((a, b) => b.date.localeCompare(a.date))
    .slice(0, 2);

  if (liftSessions.length < 1) {
    return { type: 'start', message: 'No history yet — log your first session!' };
  }

  const last = liftSessions[0].entries.find(e => e.exercise === lift);
  const prev = liftSessions[1]?.entries?.find(e => e.exercise === lift);

  const hitTarget = (entry) => entry && entry.repsCompleted >= entry.repsTarget;

  if (liftSessions.length === 2 && hitTarget(last) && hitTarget(prev)) {
    return { type: 'increase', weight: (last.weight || 0) + 2.5, sets: last.sets, reps: last.repsTarget };
  } else if (last && !hitTarget(last)) {
    return { type: 'hold', weight: last.weight, sets: last.sets, reps: last.repsTarget };
  }

  return { type: 'same', weight: last?.weight, sets: last?.sets, reps: last?.repsTarget };
}

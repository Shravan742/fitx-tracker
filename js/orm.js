import { db } from './db.js';

// Epley formula: weight * (1 + reps/30)
export function epley(weight, reps) {
  if (reps === 1) return weight;
  return Math.round(weight * (1 + reps / 30));
}

// Brzycki formula: weight * 36 / (37 - reps)
export function brzycki(weight, reps) {
  if (reps === 1) return weight;
  if (reps >= 37) return null;
  return Math.round(weight * 36 / (37 - reps));
}

export function estimate1RM(weight, reps) {
  const e = epley(weight, reps);
  const b = brzycki(weight, reps);
  if (!b) return e;
  return Math.round((e + b) / 2);
}

export async function save1RM(profileId, lift, value, method, date) {
  await db.put('orm', { profileId, lift, value, method, date: date || dayjs().format('YYYY-MM-DD') });
}

export async function get1RMHistory(profileId, lift) {
  return db.getAllFromIndex('orm', 'by-profile-lift', IDBKeyRange.only([profileId, lift]));
}

export async function getLatest1RM(profileId, lift) {
  const history = await get1RMHistory(profileId, lift);
  if (!history.length) return null;
  return history.sort((a, b) => b.date.localeCompare(a.date))[0];
}

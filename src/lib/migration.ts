import { openDb } from './db';
import { addMeal, addSession, addSleepLog, save1RM } from './firestoreDb';
import type { MealLog, OneRepMax, SleepLog, WorkoutSession } from '../types';

export interface LocalProfileSummary {
  id: string;
  name: string;
}

/** Lists the local-device profile slots from the old IndexedDB two-slot model, if any exist. */
export async function listLocalProfiles(): Promise<LocalProfileSummary[]> {
  const db = await openDb();
  const profiles = await db.getAll('profiles');
  return profiles.map((p) => ({ id: p.id, name: p.name }));
}

export interface ImportCounts {
  meals: number;
  sessions: number;
  sleep: number;
  orm: number;
}

/** Copies one local profile slot's logged history into the signed-in account's Firestore data. */
export async function importLocalProfileData(localProfileId: string, newUid: string): Promise<ImportCounts> {
  const db = await openDb();
  const [allMeals, allSessions, allSleep, allOrm] = await Promise.all([
    db.getAll('meals') as Promise<MealLog[]>,
    db.getAll('sessions') as Promise<WorkoutSession[]>,
    db.getAll('sleep') as Promise<SleepLog[]>,
    db.getAll('orm') as Promise<OneRepMax[]>,
  ]);

  const myMeals = allMeals.filter((m) => m.profileId === localProfileId);
  const mySessions = allSessions.filter((s) => s.profileId === localProfileId);
  const mySleep = allSleep.filter((s) => s.profileId === localProfileId);
  const myOrm = allOrm.filter((o) => o.profileId === localProfileId);

  for (const m of myMeals) {
    const { id: _id, ...rest } = m;
    await addMeal({ ...rest, profileId: newUid });
  }
  for (const s of mySessions) {
    const { id: _id, ...rest } = s;
    await addSession({ ...rest, profileId: newUid });
  }
  for (const s of mySleep) {
    const { id: _id, ...rest } = s;
    await addSleepLog({ ...rest, profileId: newUid });
  }
  for (const o of myOrm) {
    const { id: _id, ...rest } = o;
    await save1RM({ ...rest, profileId: newUid });
  }

  return { meals: myMeals.length, sessions: mySessions.length, sleep: mySleep.length, orm: myOrm.length };
}

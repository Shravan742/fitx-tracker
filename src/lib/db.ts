import { openDB, type IDBPDatabase } from 'idb';
import type { MealLog, SleepLog, WorkoutSession, OneRepMax, Profile } from '../types';

let _db: IDBPDatabase | null = null;

export async function openDb(): Promise<IDBPDatabase> {
  if (_db) return _db;
  _db = await openDB('fitx', 2, {
    upgrade(database) {
      if (!database.objectStoreNames.contains('profiles')) {
        database.createObjectStore('profiles', { keyPath: 'id' });
      }
      if (!database.objectStoreNames.contains('sessions')) {
        const s = database.createObjectStore('sessions', { keyPath: 'id', autoIncrement: true });
        s.createIndex('by-profile-date', ['profileId', 'date']);
      }
      if (!database.objectStoreNames.contains('meals')) {
        const m = database.createObjectStore('meals', { keyPath: 'id', autoIncrement: true });
        m.createIndex('by-profile-date', ['profileId', 'date']);
      }
      if (!database.objectStoreNames.contains('sleep')) {
        const sl = database.createObjectStore('sleep', { keyPath: 'id', autoIncrement: true });
        sl.createIndex('by-profile-date', ['profileId', 'date']);
      }
      if (!database.objectStoreNames.contains('orm')) {
        const o = database.createObjectStore('orm', { keyPath: 'id', autoIncrement: true });
        o.createIndex('by-profile-lift', ['profileId', 'lift']);
      }
      if (!database.objectStoreNames.contains('syncQueue')) {
        database.createObjectStore('syncQueue', { keyPath: 'id', autoIncrement: true });
      }
    },
  });
  return _db;
}

export async function getProfile(id: string): Promise<Profile | undefined> {
  const db = await openDb();
  return db.get('profiles', id);
}

export async function putProfile(profile: Profile): Promise<void> {
  const db = await openDb();
  await db.put('profiles', profile);
}

export async function getMealsForDate(profileId: string, date: string): Promise<MealLog[]> {
  const db = await openDb();
  return db.getAllFromIndex('meals', 'by-profile-date', [profileId, date]);
}

export async function addMeal(meal: Omit<MealLog, 'id'>): Promise<void> {
  const db = await openDb();
  await db.add('meals', meal);
}

export async function deleteMeal(id: number): Promise<void> {
  const db = await openDb();
  await db.delete('meals', id);
}

export async function getSleepLogs(profileId: string): Promise<SleepLog[]> {
  const db = await openDb();
  const all = await db.getAllFromIndex('sleep', 'by-profile-date');
  return all.filter((s) => s.profileId === profileId);
}

export async function addSleepLog(log: Omit<SleepLog, 'id'>): Promise<void> {
  const db = await openDb();
  await db.add('sleep', log);
}

export async function getSessions(profileId: string): Promise<WorkoutSession[]> {
  const db = await openDb();
  const all = await db.getAllFromIndex('sessions', 'by-profile-date');
  return all.filter((s) => s.profileId === profileId);
}

export async function addSession(session: Omit<WorkoutSession, 'id'>): Promise<void> {
  const db = await openDb();
  await db.add('sessions', session);
}

export async function get1RMHistory(profileId: string, lift: string): Promise<OneRepMax[]> {
  const db = await openDb();
  return db.getAllFromIndex('orm', 'by-profile-lift', [profileId, lift]);
}

export async function save1RM(entry: Omit<OneRepMax, 'id'>): Promise<void> {
  const db = await openDb();
  await db.add('orm', entry);
}

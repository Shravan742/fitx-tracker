import {
  addDoc,
  collection,
  deleteDoc,
  doc,
  getDoc,
  getDocs,
  query,
  setDoc,
  where,
} from 'firebase/firestore';
import { firestore } from './firebase';
import type { MealLog, OneRepMax, Profile, SleepLog, WorkoutSession } from '../types';

/**
 * Mirrors lib/db.ts's function signatures exactly, backed by Firestore instead of
 * IndexedDB, so views only need their import swapped — not rewritten. Collections
 * are top-level (not per-user subcollections) with a `profileId` field on each
 * record, matching the IndexedDB `by-profile-date`/`by-profile-lift` index shape;
 * Firestore security rules enforce that `profileId` must equal the caller's uid.
 */

export async function getProfile(id: string): Promise<Profile | undefined> {
  const snap = await getDoc(doc(firestore, 'profiles', id));
  return snap.exists() ? (snap.data() as Profile) : undefined;
}

export async function putProfile(profile: Profile): Promise<void> {
  await setDoc(doc(firestore, 'profiles', profile.id), profile, { merge: true });
}

export async function getMealsForDate(profileId: string, date: string): Promise<MealLog[]> {
  const q = query(collection(firestore, 'meals'), where('profileId', '==', profileId), where('date', '==', date));
  const snap = await getDocs(q);
  return snap.docs.map((d) => ({ ...(d.data() as MealLog), id: d.id }));
}

export async function addMeal(meal: Omit<MealLog, 'id'>): Promise<void> {
  await addDoc(collection(firestore, 'meals'), meal);
}

export async function deleteMeal(id: string): Promise<void> {
  await deleteDoc(doc(firestore, 'meals', id));
}

export async function getSleepLogs(profileId: string): Promise<SleepLog[]> {
  const q = query(collection(firestore, 'sleep'), where('profileId', '==', profileId));
  const snap = await getDocs(q);
  return snap.docs.map((d) => ({ ...(d.data() as SleepLog), id: d.id }));
}

export async function addSleepLog(log: Omit<SleepLog, 'id'>): Promise<void> {
  await addDoc(collection(firestore, 'sleep'), log);
}

export async function getSessions(profileId: string): Promise<WorkoutSession[]> {
  const q = query(collection(firestore, 'sessions'), where('profileId', '==', profileId));
  const snap = await getDocs(q);
  return snap.docs.map((d) => ({ ...(d.data() as WorkoutSession), id: d.id }));
}

export async function getSessionForDate(profileId: string, date: string): Promise<WorkoutSession | undefined> {
  const q = query(collection(firestore, 'sessions'), where('profileId', '==', profileId), where('date', '==', date));
  const snap = await getDocs(q);
  const d = snap.docs[0];
  return d ? { ...(d.data() as WorkoutSession), id: d.id } : undefined;
}

export async function addSession(session: Omit<WorkoutSession, 'id'>): Promise<void> {
  await addDoc(collection(firestore, 'sessions'), session);
}

export async function updateSession(session: WorkoutSession): Promise<void> {
  if (!session.id) throw new Error('updateSession requires an id');
  const { id, ...data } = session;
  await setDoc(doc(firestore, 'sessions', id), data);
}

/** Appends one exercise entry to today's session, creating the session if it doesn't exist yet. */
export async function logExerciseToTodaysSession(
  profileId: string,
  date: string,
  entry: WorkoutSession['entries'][number],
): Promise<void> {
  const existing = await getSessionForDate(profileId, date);
  if (existing) {
    await updateSession({ ...existing, entries: [...existing.entries, entry] });
  } else {
    await addSession({ profileId, date, entries: [entry] });
  }
}

export async function get1RMHistory(profileId: string, lift: string): Promise<OneRepMax[]> {
  const q = query(collection(firestore, 'orm'), where('profileId', '==', profileId), where('lift', '==', lift));
  const snap = await getDocs(q);
  return snap.docs.map((d) => ({ ...(d.data() as OneRepMax), id: d.id }));
}

export async function save1RM(entry: Omit<OneRepMax, 'id'>): Promise<void> {
  await addDoc(collection(firestore, 'orm'), entry);
}

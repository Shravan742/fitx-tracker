import { db } from './db.js';
import { calcMacros } from './macros.js';

const ACTIVE_KEY = 'fitx_activeProfile';

export function getActiveProfile() {
  return localStorage.getItem(ACTIVE_KEY) || 'user1';
}

export function setActiveProfile(id) {
  localStorage.setItem(ACTIVE_KEY, id);
}

export async function getProfile(id) {
  return db.get('profiles', id);
}

export async function saveProfile(profile) {
  await db.put('profiles', profile);
  // Recompute live macro targets — never stored as stale numbers
  return profile;
}

export function getLiveMacros(profile) {
  if (!profile) return null;
  return calcMacros(profile);
}

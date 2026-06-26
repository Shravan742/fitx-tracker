import { auth } from './firebase';

/**
 * The "active profile" is now just whichever Firebase account is signed in — there's
 * no local two-slot switcher anymore. Views that call this assume App.tsx has already
 * gated rendering behind a confirmed signed-in user, so currentUser is never null here.
 */
export function getActiveProfileId(): string {
  const uid = auth.currentUser?.uid;
  if (!uid) throw new Error('getActiveProfileId called with no signed-in user');
  return uid;
}

/** Pure performance caches for the meal planner — safe to keep local since they're
 * fully recomputable from Firestore data; clearing them never loses real data. */
export function clearPlanCache(profileId: string, date: string): void {
  Object.keys(localStorage)
    .filter((k) => k.startsWith(`fitx_plan_v6_${profileId}_${date}`))
    .forEach((k) => localStorage.removeItem(k));
}

export function clearWeeklyPlanCache(profileId: string, startDate: string): void {
  Object.keys(localStorage)
    .filter((k) => k.startsWith(`fitx_weekplan_v2_${profileId}_${startDate}`))
    .forEach((k) => localStorage.removeItem(k));
}

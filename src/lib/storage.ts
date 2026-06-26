import type { WeightEntry } from '../types';
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

export function getWeightHistory(profileId: string): WeightEntry[] {
  try {
    return JSON.parse(localStorage.getItem(`fitx_weights_${profileId}`) || '[]');
  } catch {
    return [];
  }
}

export function logWeight(profileId: string, date: string, weightKg: number): WeightEntry[] {
  const entries = getWeightHistory(profileId).filter((w) => w.date !== date);
  entries.push({ date, weightKg });
  entries.sort((a, b) => a.date.localeCompare(b.date));
  localStorage.setItem(`fitx_weights_${profileId}`, JSON.stringify(entries));
  return entries;
}

export function clearPlanCache(profileId: string, date: string): void {
  Object.keys(localStorage)
    .filter((k) => k.startsWith(`fitx_plan_v5_${profileId}_${date}`))
    .forEach((k) => localStorage.removeItem(k));
}

export function clearWeeklyPlanCache(profileId: string, startDate: string): void {
  Object.keys(localStorage)
    .filter((k) => k.startsWith(`fitx_weekplan_v1_${profileId}_${startDate}`))
    .forEach((k) => localStorage.removeItem(k));
}

/** Shopping list "bought" checkmarks, scoped to a week so the checklist resets naturally each week. */
export function getShoppingChecklist(profileId: string, startDate: string): Record<string, boolean> {
  try {
    return JSON.parse(localStorage.getItem(`fitx_shopcheck_${profileId}_${startDate}`) || '{}');
  } catch {
    return {};
  }
}

export function toggleShoppingItem(profileId: string, startDate: string, item: string): Record<string, boolean> {
  const checklist = getShoppingChecklist(profileId, startDate);
  checklist[item] = !checklist[item];
  localStorage.setItem(`fitx_shopcheck_${profileId}_${startDate}`, JSON.stringify(checklist));
  return checklist;
}

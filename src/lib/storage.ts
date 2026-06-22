import type { WeightEntry } from '../types';

const ACTIVE_KEY = 'fitx_activeProfile';

export function getActiveProfileId(): string {
  return localStorage.getItem(ACTIVE_KEY) || 'user1';
}

export function setActiveProfileId(id: string): void {
  localStorage.setItem(ACTIVE_KEY, id);
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

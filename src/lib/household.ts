import type { Diet, Macros, Profile } from '../types';
import { calcMacros, applyDietProteinModifier } from './macros';

const HOUSEHOLD_DIET_KEY = 'fitx_household_diet';
const HOUSEHOLD_BUDGET_KEY = 'fitx_household_budget';
const HOUSEHOLD_MODE_KEY = 'fitx_household_mode';

/**
 * "Cook together" must survive navigating away and back — it was plain component
 * state before, so leaving the Meals tab silently reset it to off and made the
 * combined plan look like it had stopped combining anything.
 */
export function getHouseholdModeOn(): boolean {
  return localStorage.getItem(HOUSEHOLD_MODE_KEY) === '1';
}

export function setHouseholdModeOn(on: boolean): void {
  localStorage.setItem(HOUSEHOLD_MODE_KEY, on ? '1' : '0');
}

export function getHouseholdDietPreferences(): Diet[] {
  try {
    return JSON.parse(localStorage.getItem(HOUSEHOLD_DIET_KEY) || '[]');
  } catch {
    return [];
  }
}

export function setHouseholdDietPreferences(diets: Diet[]): void {
  localStorage.setItem(HOUSEHOLD_DIET_KEY, JSON.stringify(diets));
}

/**
 * The household plan/shopping list is one shared cache, so its budget must be one
 * shared value too — not whichever person's individual weeklyBudget happens to be
 * active when they open the app, which would silently fragment into two different
 * "shared" plans depending on who's logged in. Falls back to `fallback` (typically
 * the current user's own budget) only until a household budget has been explicitly set.
 */
export function getHouseholdBudget(fallback: number): number {
  const raw = localStorage.getItem(HOUSEHOLD_BUDGET_KEY);
  if (raw == null) return fallback;
  const parsed = parseFloat(raw);
  return Number.isFinite(parsed) ? parsed : fallback;
}

export function setHouseholdBudget(amount: number): void {
  localStorage.setItem(HOUSEHOLD_BUDGET_KEY, String(amount));
}

export interface MemberMacros {
  profile: Profile;
  macros: Macros;
}

export interface HouseholdMacros {
  combined: Macros;
  members: MemberMacros[];
}

/**
 * Sums both members' individual macro targets. Each person's protein modifier comes
 * from their OWN personal diet (profile.dietPreferences) — being vegetarian/vegan
 * raises your own protein need regardless of what the household happens to be
 * cooking tonight. Using the shared household diet filter here was the bug: it
 * starts empty, so it silently dropped each person's own protein boost the moment
 * household mode was turned on, making "combined protein" not actually equal
 * "Shravan's protein + Gouri's protein" as shown on their own individual pages.
 */
export function computeHouseholdMacros(profileA: Profile, profileB: Profile): HouseholdMacros | null {
  const baseA = calcMacros(profileA);
  const baseB = calcMacros(profileB);
  if (!baseA || !baseB) return null;

  const macrosA = applyDietProteinModifier(baseA, profileA.dietPreferences);
  const macrosB = applyDietProteinModifier(baseB, profileB.dietPreferences);

  const combined: Macros = {
    calories: macrosA.calories + macrosB.calories,
    protein: macrosA.protein + macrosB.protein,
    carbs: macrosA.carbs + macrosB.carbs,
    fat: macrosA.fat + macrosB.fat,
    bmr: macrosA.bmr + macrosB.bmr,
    tdee: macrosA.tdee + macrosB.tdee,
  };

  return {
    combined,
    members: [
      { profile: profileA, macros: macrosA },
      { profile: profileB, macros: macrosB },
    ],
  };
}

/**
 * Given each member's individual calorie target for a slot and the recipe's base (1x)
 * calories, returns how many servings each person should take so the cooked total
 * matches the combined scale — clamped the same way single-person scaling is
 * (0.5–3.0, rounded to nearest 0.25).
 */
export function splitServings(memberTargetsCal: number[], recipeBaseCalories: number): number[] {
  const clampRound = (raw: number) => Math.min(3.0, Math.max(0.5, Math.round(raw * 4) / 4));
  return memberTargetsCal.map((cal) => clampRound(cal / Math.max(recipeBaseCalories, 1)));
}

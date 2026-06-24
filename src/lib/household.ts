import type { Diet, Macros, Profile } from '../types';
import { calcMacros, applyDietProteinModifier } from './macros';

const HOUSEHOLD_DIET_KEY = 'fitx_household_diet';

// The app's profile switcher only ever toggles between these two fixed IDs,
// so a "household" is always this pair — no partner-linking UI needed.
export const HOUSEHOLD_MEMBER_IDS = ['user1', 'user2'] as const;

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

export interface MemberMacros {
  profile: Profile;
  macros: Macros;
}

export interface HouseholdMacros {
  combined: Macros;
  members: MemberMacros[];
}

/** Sums both members' individual macro targets (each with their own diet protein modifier applied). */
export function computeHouseholdMacros(profileA: Profile, profileB: Profile, householdDiets: Diet[]): HouseholdMacros | null {
  const baseA = calcMacros(profileA);
  const baseB = calcMacros(profileB);
  if (!baseA || !baseB) return null;

  const macrosA = applyDietProteinModifier(baseA, householdDiets);
  const macrosB = applyDietProteinModifier(baseB, householdDiets);

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

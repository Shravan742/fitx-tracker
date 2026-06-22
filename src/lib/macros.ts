import type { ActivityLevel, Goal, Macros, Profile } from '../types';

const ACTIVITY: Record<ActivityLevel, number> = {
  sedentary: 1.2,
  light: 1.375,
  moderate: 1.55,
  active: 1.725,
  very_active: 1.9,
};

const GOAL_ADJUST: Record<Goal, number> = {
  cut: -300,
  maintain: 0,
  bulk: 250,
};

const PROTEIN_RATIO: Record<Goal, number> = { cut: 2.4, maintain: 1.8, bulk: 2.0 };
const FAT_RATIO = 0.25;

export function calcMacros(profile: Profile | null | undefined): Macros | null {
  if (!profile) return null;
  const { weightKg, heightCm, age, sex, activityLevel, goal } = profile;
  if (!weightKg || !heightCm || !age || !sex) return null;

  const bmr =
    sex === 'male'
      ? 10 * weightKg + 6.25 * heightCm - 5 * age + 5
      : 10 * weightKg + 6.25 * heightCm - 5 * age - 161;

  const tdee = bmr * (ACTIVITY[activityLevel] || 1.55);
  const calories = Math.round(tdee + (GOAL_ADJUST[goal] || 0));

  const protein = Math.round((PROTEIN_RATIO[goal] || 1.8) * weightKg);
  const fat = Math.round((calories * FAT_RATIO) / 9);
  const carbs = Math.round((calories - protein * 4 - fat * 9) / 4);

  return { calories, protein, carbs, fat, bmr: Math.round(bmr), tdee: Math.round(tdee) };
}

const DIET_PROTEIN_MODIFIER: Record<string, number> = { vegan: 1.15, vegetarian: 1.1 };

export function applyDietProteinModifier(macros: Macros, dietPreferences: string[]): Macros {
  if (!dietPreferences.length) return macros;
  let mod = 1;
  if (dietPreferences.every((d) => d === 'vegan')) mod = DIET_PROTEIN_MODIFIER.vegan;
  else if (dietPreferences.every((d) => ['vegan', 'vegetarian'].includes(d))) mod = DIET_PROTEIN_MODIFIER.vegetarian;
  if (mod === 1) return macros;
  return { ...macros, protein: Math.round(macros.protein * mod) };
}

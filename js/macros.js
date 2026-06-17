// Mifflin-St Jeor BMR, TDEE, and macro split
const ACTIVITY = {
  sedentary:    1.2,
  light:        1.375,
  moderate:     1.55,
  active:       1.725,
  very_active:  1.9,
};

const GOAL_ADJUST = {
  cut:      -300,
  maintain:    0,
  bulk:      250,
};

const PROTEIN_RATIO = { cut: 2.4, maintain: 1.8, bulk: 2.0 }; // g per kg bodyweight
const FAT_RATIO     = 0.25; // 25% of calories

export function calcMacros(profile) {
  const { weightKg, heightCm, age, sex, activityLevel, goal } = profile;
  if (!weightKg || !heightCm || !age || !sex) return null;

  // Mifflin-St Jeor
  const bmr = sex === 'male'
    ? 10 * weightKg + 6.25 * heightCm - 5 * age + 5
    : 10 * weightKg + 6.25 * heightCm - 5 * age - 161;

  const tdee = bmr * (ACTIVITY[activityLevel] || 1.55);
  const calories = Math.round(tdee + (GOAL_ADJUST[goal] || 0));

  const protein = Math.round((PROTEIN_RATIO[goal] || 1.8) * weightKg);
  const fat     = Math.round((calories * FAT_RATIO) / 9);
  const carbs   = Math.round((calories - protein * 4 - fat * 9) / 4);

  return { calories, protein, carbs, fat, bmr: Math.round(bmr), tdee: Math.round(tdee) };
}

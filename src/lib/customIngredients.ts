export interface CustomIngredient {
  id: string;
  name: string;
  kcalPer100: number;
  proteinPer100: number;
  carbsPer100: number;
  fatPer100: number;
  pricePer100?: number;
}

const KEY = 'fitx_custom_ingredients';

export function getCustomIngredients(): CustomIngredient[] {
  try {
    return JSON.parse(localStorage.getItem(KEY) || '[]');
  } catch {
    return [];
  }
}

function saveAll(items: CustomIngredient[]): void {
  localStorage.setItem(KEY, JSON.stringify(items));
}

/**
 * Cached meal plans (fitx_plan_v5_*, fitx_weekplan_v1_*) bake in which recipe was
 * picked, based on cost ranking at generation time. If a custom ingredient's price
 * changes, recipes using it should be re-ranked — otherwise editing a price silently
 * does nothing until the next unrelated cache-busting event.
 */
function invalidateMealPlanCache(): void {
  Object.keys(localStorage)
    .filter((k) => k.startsWith('fitx_plan_v5_') || k.startsWith('fitx_weekplan_v1_'))
    .forEach((k) => localStorage.removeItem(k));
}

export function addCustomIngredient(input: Omit<CustomIngredient, 'id'>): CustomIngredient {
  const item: CustomIngredient = { ...input, id: crypto.randomUUID() };
  saveAll([...getCustomIngredients(), item]);
  invalidateMealPlanCache();
  return item;
}

export function deleteCustomIngredient(id: string): void {
  saveAll(getCustomIngredients().filter((i) => i.id !== id));
  invalidateMealPlanCache();
}

export function updateCustomIngredient(id: string, patch: Omit<CustomIngredient, 'id'>): void {
  saveAll(getCustomIngredients().map((i) => (i.id === id ? { ...patch, id } : i)));
  invalidateMealPlanCache();
}

export function macrosForGrams(ingredient: CustomIngredient, grams: number) {
  const factor = grams / 100;
  return {
    calories: Math.round(ingredient.kcalPer100 * factor),
    protein: Math.round(ingredient.proteinPer100 * factor * 10) / 10,
    carbs: Math.round(ingredient.carbsPer100 * factor * 10) / 10,
    fat: Math.round(ingredient.fatPer100 * factor * 10) / 10,
  };
}

/** Finds a custom ingredient whose name matches (case-insensitive substring, either direction). */
export function findCustomIngredientByName(name: string): CustomIngredient | undefined {
  const lower = name.toLowerCase();
  return getCustomIngredients().find((i) => lower.includes(i.name.toLowerCase()) || i.name.toLowerCase().includes(lower));
}

export interface TopUpSuggestion {
  ingredient: CustomIngredient;
  grams: number;
  macros: { calories: number; protein: number; carbs: number; fat: number };
}

/**
 * Picks one saved ingredient and a gram amount that closes whichever gap (protein,
 * then calories) is still open, so the plan can suggest an exact top-up instead of
 * just telling the user to "log extra" and figure out the amount themselves.
 */
export function suggestTopUp(remaining: { calories: number; protein: number }): TopUpSuggestion | null {
  const ingredients = getCustomIngredients();
  if (!ingredients.length) return null;

  let grams: number;
  let ingredient: CustomIngredient;

  if (remaining.protein > 3) {
    const withProtein = ingredients.filter((i) => i.proteinPer100 > 0);
    if (!withProtein.length) return null;
    ingredient = withProtein.reduce((best, i) =>
      i.proteinPer100 / Math.max(i.kcalPer100, 1) > best.proteinPer100 / Math.max(best.kcalPer100, 1) ? i : best,
    );
    grams = (remaining.protein / ingredient.proteinPer100) * 100;
  } else if (remaining.calories > 50) {
    ingredient = ingredients[0];
    grams = (remaining.calories / Math.max(ingredient.kcalPer100, 1)) * 100;
  } else {
    return null;
  }

  grams = Math.min(500, Math.max(10, Math.round(grams / 5) * 5));
  return { ingredient, grams, macros: macrosForGrams(ingredient, grams) };
}

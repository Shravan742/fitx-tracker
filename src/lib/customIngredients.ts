import { addDoc, collection, deleteDoc, doc, getDocs, query, setDoc, where } from 'firebase/firestore';
import { firestore } from './firebase';

export interface CustomIngredient {
  id: string;
  profileId: string;
  name: string;
  kcalPer100: number;
  proteinPer100: number;
  carbsPer100: number;
  fatPer100: number;
  pricePer100?: number;
}

/**
 * The meal-planning pipeline (mealPlan.ts -> recipeCost.ts -> ingredientPrices.ts)
 * is entirely synchronous, so custom ingredients can't be fetched from Firestore
 * inline mid-calculation. Instead we keep an in-memory cache, refreshed whenever the
 * signed-in user (or their linked partner) changes, and every read here is just a
 * synchronous read of that cache.
 */
let cache: CustomIngredient[] = [];

export async function loadCustomIngredients(uid: string, partnerUid: string | null): Promise<void> {
  const ids = partnerUid ? [uid, partnerUid] : [uid];
  const q = query(collection(firestore, 'customIngredients'), where('profileId', 'in', ids));
  const snap = await getDocs(q);
  cache = snap.docs.map((d) => ({ ...(d.data() as Omit<CustomIngredient, 'id'>), id: d.id }));
}

export function getCustomIngredients(): CustomIngredient[] {
  return cache;
}

/**
 * Cached meal plans (fitx_plan_v6_*, fitx_weekplan_v2_*) bake in which recipe was
 * picked, based on cost ranking at generation time. If a custom ingredient's price
 * changes, recipes using it should be re-ranked — otherwise editing a price silently
 * does nothing until the next unrelated cache-busting event.
 */
function invalidateMealPlanCache(): void {
  Object.keys(localStorage)
    .filter((k) => k.startsWith('fitx_plan_v6_') || k.startsWith('fitx_weekplan_v2_'))
    .forEach((k) => localStorage.removeItem(k));
}

export async function addCustomIngredient(
  uid: string,
  partnerUid: string | null,
  input: Omit<CustomIngredient, 'id' | 'profileId'>,
): Promise<void> {
  await addDoc(collection(firestore, 'customIngredients'), { ...input, profileId: uid });
  invalidateMealPlanCache();
  await loadCustomIngredients(uid, partnerUid);
}

export async function deleteCustomIngredient(uid: string, partnerUid: string | null, id: string): Promise<void> {
  await deleteDoc(doc(firestore, 'customIngredients', id));
  invalidateMealPlanCache();
  await loadCustomIngredients(uid, partnerUid);
}

export async function updateCustomIngredient(
  uid: string,
  partnerUid: string | null,
  id: string,
  patch: Omit<CustomIngredient, 'id' | 'profileId'>,
): Promise<void> {
  await setDoc(doc(firestore, 'customIngredients', id), { ...patch, profileId: uid }, { merge: true });
  invalidateMealPlanCache();
  await loadCustomIngredients(uid, partnerUid);
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
  return cache.find((i) => lower.includes(i.name.toLowerCase()) || i.name.toLowerCase().includes(lower));
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
  const ingredients = cache;
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

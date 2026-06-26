import { collection, getDocs } from 'firebase/firestore';
import { firestore } from './firebase';
import type { Recipe } from '../types';

/**
 * mealPlan.ts / recipeCost.ts / shoppingList.ts are entirely synchronous (the planner
 * does a lot of in-memory ranking and rotation), so recipes can't be fetched from
 * Firestore inline mid-calculation. Load once at app start into this cache instead —
 * App.tsx gates rendering on `loadRecipes()` resolving, the same way it gates on auth.
 */
let cache: Recipe[] = [];
let cacheById: Map<string, Recipe> = new Map();

export async function loadRecipes(): Promise<void> {
  const snap = await getDocs(collection(firestore, 'recipes'));
  cache = snap.docs.map((d) => ({ ...(d.data() as Omit<Recipe, 'id'>), id: d.id }));
  cacheById = new Map(cache.map((r) => [r.id, r]));
}

export function getRecipes(): Recipe[] {
  return cache;
}

export function getRecipeById(id: string): Recipe | undefined {
  return cacheById.get(id);
}

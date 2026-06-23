import type { Diet, Recipe } from '../types';

// Rough EUR cost per serving by diet tier — reflects typical German supermarket pricing.
// Not exact receipts, just a planning estimate so the week's plan can be checked against a budget.
const BASE_COST_PER_SERVING: Record<Diet, number> = {
  vegan: 1.8,
  vegetarian: 2.2,
  chicken: 2.8,
  pork: 2.9,
  fish: 4.5,
  beef: 5.2,
};

export function estimateRecipeCostPerServing(recipe: Recipe): number {
  const base = BASE_COST_PER_SERVING[recipe.diet] ?? 2.5;
  const extraIngredients = Math.max(0, recipe.ingredients.length - 4);
  return +(base + extraIngredients * 0.15).toFixed(2);
}

/** Cost contribution for a planned slot, scaled the same way macros are scaled. */
export function estimateSlotCost(recipe: Recipe, scale: number): number {
  return +(estimateRecipeCostPerServing(recipe) * scale).toFixed(2);
}

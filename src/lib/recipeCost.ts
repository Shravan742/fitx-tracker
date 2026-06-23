import type { Recipe } from '../types';
import { estimateIngredientCost } from './ingredientPrices';

/**
 * Sums real per-ingredient pricing (see ingredientPrices.ts) across the recipe's
 * ingredient list, divided by servings. This rewards recipes built from genuinely
 * cheap staples (oats, lentils, quark, potato, rice) even within pricier diet
 * categories, and correctly prices premium ingredients (salmon, halloumi, nuts)
 * higher even within cheaper categories — unlike a flat per-diet-type estimate.
 */
export function estimateRecipeCostPerServing(recipe: Recipe): number {
  const total = recipe.ingredients.reduce(
    (sum, ing) => sum + estimateIngredientCost(ing.item, ing.grams, ing.ml),
    0,
  );
  return +(total / Math.max(recipe.servings, 1)).toFixed(2);
}

/** Cost contribution for a planned slot, scaled the same way macros are scaled. */
export function estimateSlotCost(recipe: Recipe, scale: number): number {
  return +(estimateRecipeCostPerServing(recipe) * scale).toFixed(2);
}

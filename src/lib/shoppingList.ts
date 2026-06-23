import recipes from '../data/recipes';
import type { DayPlan } from './mealPlan';
import { estimateSlotCost } from './recipeCost';

export interface ShoppingItem {
  item: string;
  grams: number;
  ml: number;
}

export interface ShoppingList {
  items: ShoppingItem[];
  totalCost: number;
}

export function buildShoppingList(weekPlan: DayPlan[]): ShoppingList {
  const totals = new Map<string, ShoppingItem>();
  let totalCost = 0;

  weekPlan.forEach(({ plan }) => {
    plan.forEach((p) => {
      const r = recipes[p.recipeIdx];
      if (!r) return;
      const scale = p.scale ?? 1;
      totalCost += estimateSlotCost(r, scale);

      r.ingredients.forEach((ing) => {
        const existing = totals.get(ing.item) ?? { item: ing.item, grams: 0, ml: 0 };
        if (ing.grams) existing.grams += Math.round(ing.grams * scale);
        if (ing.ml) existing.ml += Math.round(ing.ml * scale);
        totals.set(ing.item, existing);
      });
    });
  });

  const items = [...totals.values()].sort((a, b) => a.item.localeCompare(b.item));
  return { items, totalCost: +totalCost.toFixed(2) };
}

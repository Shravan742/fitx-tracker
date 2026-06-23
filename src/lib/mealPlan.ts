import dayjs from 'dayjs';
import recipes from '../data/recipes';
import type { Diet, Macros, PlanEntry, Recipe } from '../types';
import { getMealsForDate } from './db';

interface MealSlot {
  key: string;
  label: string;
  icon: string;
  ratio: number;
  types: string[];
}

export const MEAL_SLOTS: MealSlot[] = [
  { key: 'breakfast', label: 'Breakfast', icon: '🌅', ratio: 0.28, types: ['breakfast'] },
  { key: 'lunch', label: 'Lunch', icon: '☀️', ratio: 0.35, types: ['lunch', 'any'] },
  { key: 'snack', label: 'Evening Snack', icon: '🍎', ratio: 0.09, types: ['snack'] },
  { key: 'dinner', label: 'Dinner', icon: '🌙', ratio: 0.28, types: ['dinner', 'any'] },
];

export function getFiltered(diets: Diet[]): Recipe[] {
  if (!diets.length) return recipes;
  if (diets.includes('vegetarian') && !diets.includes('vegan')) {
    return recipes.filter((r) => diets.includes(r.diet) || r.diet === 'vegan');
  }
  return recipes.filter((r) => diets.includes(r.diet));
}

export function scaleFor(r: Recipe, tgtCal: number): number {
  const raw = tgtCal / Math.max(r.macros.calories, 1);
  return Math.min(3.0, Math.max(0.5, Math.round((raw * 4)) / 4));
}

export function scaledMacros(r: Recipe, scale: number) {
  return {
    calories: Math.round(r.macros.calories * scale),
    protein: Math.round(r.macros.protein * scale),
    carbs: Math.round(r.macros.carbs * scale),
    fat: Math.round(r.macros.fat * scale),
  };
}

export function getPlanKey(profileId: string, date: string, diets: Diet[], targets?: Macros | null): string {
  const macroSig = targets ? `_${targets.calories}` : '';
  return `fitx_plan_v5_${profileId}_${date}_${[...diets].sort().join(',') || 'all'}${macroSig}`;
}

function scoreCandidates(candidates: Recipe[], tgtCal: number, tgtPro: number, isSnack: boolean): Recipe[] {
  return [...candidates].sort((a, b) => {
    const scaleA = isSnack ? Math.min(1, scaleFor(a, tgtCal)) : scaleFor(a, tgtCal);
    const scaleB = isSnack ? Math.min(1, scaleFor(b, tgtCal)) : scaleFor(b, tgtCal);
    const calErrA = Math.abs(a.macros.calories * scaleA - tgtCal) / tgtCal;
    const proErrA = Math.abs(a.macros.protein * scaleA - tgtPro) / Math.max(tgtPro, 1);
    const calErrB = Math.abs(b.macros.calories * scaleB - tgtCal) / tgtCal;
    const proErrB = Math.abs(b.macros.protein * scaleB - tgtPro) / Math.max(tgtPro, 1);
    return calErrA + proErrA - (calErrB + proErrB);
  });
}

/**
 * Picks the best-fit recipe for a slot. `daySeed` rotates among the top-3 best-fitting,
 * preferring ones not in `excludeAcrossWeek` — gives day-to-day variety in a weekly plan
 * while seed=0 (today) always picks the single best fit, same as before.
 */
function pickForSlot(
  candidates: Recipe[],
  tgtCal: number,
  tgtPro: number,
  isSnack: boolean,
  excludeAcrossWeek: Set<Recipe>,
  daySeed: number,
): Recipe | undefined {
  const sorted = scoreCandidates(candidates, tgtCal, tgtPro, isSnack);
  const novel = sorted.filter((r) => !excludeAcrossWeek.has(r));
  const pool = novel.length ? novel : sorted;
  const topK = pool.slice(0, Math.min(3, pool.length));
  if (!topK.length) return undefined;
  return topK[daySeed % topK.length];
}

export function generatePlan(diets: Diet[], targets: Macros | null, daySeed = 0, excludeAcrossWeek = new Set<Recipe>()): PlanEntry[] {
  const pool = getFiltered(diets);
  const totalCal = targets?.calories || 2000;
  const totalPro = targets?.protein || 100;
  const usedToday = new Set<Recipe>();

  return MEAL_SLOTS.map((slot) => {
    const isSnack = slot.key === 'snack';
    const tgtCal = Math.round(totalCal * slot.ratio);
    const tgtPro = Math.round(totalPro * slot.ratio);

    const typed = pool.filter((r) => slot.types.includes(r.mealType) && !usedToday.has(r));
    const fallback = pool.filter((r) => !usedToday.has(r));
    const candidates = typed.length ? typed : fallback;

    const pick = pickForSlot(candidates, tgtCal, tgtPro, isSnack, excludeAcrossWeek, daySeed);

    const scale = pick ? (isSnack ? Math.min(1, scaleFor(pick, tgtCal)) : scaleFor(pick, tgtCal)) : 1;
    if (pick) usedToday.add(pick);
    return { slotKey: slot.key, recipeIdx: pick ? recipes.indexOf(pick) : 0, scale };
  });
}

export interface DayPlan {
  date: string;
  plan: PlanEntry[];
}

/** Generates a 7-day plan starting today, with day-to-day recipe variety for shopping-list purposes. */
export function generateWeeklyPlan(diets: Diet[], targets: Macros | null, startDate: string): DayPlan[] {
  const usedAcrossWeek = new Set<Recipe>();
  const days: DayPlan[] = [];

  for (let i = 0; i < 7; i++) {
    const date = dayjs(startDate).add(i, 'day').format('YYYY-MM-DD');
    const plan = generatePlan(diets, targets, i, usedAcrossWeek);
    plan.forEach((p) => {
      const r = recipes[p.recipeIdx];
      if (r) usedAcrossWeek.add(r);
    });
    days.push({ date, plan });
  }

  return days;
}

export function loadPlan(profileId: string, date: string, diets: Diet[], targets: Macros | null): PlanEntry[] {
  const key = getPlanKey(profileId, date, diets, targets);
  try {
    const saved = JSON.parse(localStorage.getItem(key) || 'null');
    if (saved && saved.length === MEAL_SLOTS.length) return saved;
  } catch {
    /* ignore */
  }
  const plan = generatePlan(diets, targets);
  localStorage.setItem(key, JSON.stringify(plan));
  return plan;
}

export function swapSlot(
  profileId: string,
  date: string,
  diets: Diet[],
  slotIdx: number,
  targets: Macros | null,
): PlanEntry[] {
  const key = getPlanKey(profileId, date, diets, targets);
  const plan = loadPlan(profileId, date, diets, targets);
  const pool = getFiltered(diets);
  const slot = MEAL_SLOTS[slotIdx];

  const currentGIdx = plan[slotIdx].recipeIdx;

  const byType = pool
    .map((r) => ({ r, gi: recipes.indexOf(r) }))
    .filter((x) => slot.types.includes(x.r.mealType) && x.gi !== currentGIdx);
  const others = pool
    .map((r) => ({ r, gi: recipes.indexOf(r) }))
    .filter((x) => !slot.types.includes(x.r.mealType) && x.gi !== currentGIdx);
  const candidates = [...byType, ...others];

  const cycleKey = `${key}_swapIdx_${slotIdx}`;
  const cycleIdx = parseInt(localStorage.getItem(cycleKey) || '0', 10) % Math.max(candidates.length, 1);
  const pick = candidates[cycleIdx];

  if (pick) {
    const tgtCal = Math.round((targets?.calories || 2000) * slot.ratio);
    const isSnack = slot.key === 'snack';
    const newScale = isSnack ? Math.min(1, scaleFor(pick.r, tgtCal)) : scaleFor(pick.r, tgtCal);
    plan[slotIdx] = { ...plan[slotIdx], recipeIdx: pick.gi, scale: newScale };
    localStorage.setItem(cycleKey, String(cycleIdx + 1));
  }
  localStorage.setItem(key, JSON.stringify(plan));
  return plan;
}

export interface MacroSurplus {
  calories: number;
  protein: number;
  carbs: number;
  fat: number;
}

export async function getYesterdaySurplus(profileId: string, baseTargets: Macros): Promise<MacroSurplus | null> {
  const yesterday = dayjs().subtract(1, 'day').format('YYYY-MM-DD');
  const logs = await getMealsForDate(profileId, yesterday);
  if (!logs.length) return null;
  const eaten = logs.reduce(
    (a, m) => ({
      calories: a.calories + (m.calories || 0),
      protein: a.protein + (m.protein || 0),
      carbs: a.carbs + (m.carbs || 0),
      fat: a.fat + (m.fat || 0),
    }),
    { calories: 0, protein: 0, carbs: 0, fat: 0 },
  );
  return {
    calories: eaten.calories - baseTargets.calories,
    protein: eaten.protein - baseTargets.protein,
    carbs: eaten.carbs - baseTargets.carbs,
    fat: eaten.fat - baseTargets.fat,
  };
}

export function adjustTargetsForSurplus(targets: Macros, surplus: MacroSurplus | null): Macros {
  if (!surplus) return targets;
  const cap = 0.25;
  const adj = (base: number, delta: number) =>
    Math.round(Math.max(base * (1 - cap), Math.min(base * (1 + cap), base - delta)));
  return {
    ...targets,
    calories: adj(targets.calories, surplus.calories),
    protein: adj(targets.protein, surplus.protein),
    carbs: adj(targets.carbs, surplus.carbs),
    fat: adj(targets.fat, surplus.fat),
  };
}

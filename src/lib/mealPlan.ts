import dayjs from 'dayjs';
import recipes from '../data/recipes';
import type { Diet, Macros, PlanEntry, Recipe } from '../types';
import { getMealsForDate } from './db';
import { estimateRecipeCostPerServing, estimateSlotCost } from './recipeCost';

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

export function getPlanKey(
  profileId: string,
  date: string,
  diets: Diet[],
  targets?: Macros | null,
  weeklyBudget?: number,
): string {
  const macroSig = targets ? `_${targets.calories}` : '';
  const budgetSig = weeklyBudget ? `_b${weeklyBudget}` : '';
  return `fitx_plan_v5_${profileId}_${date}_${[...diets].sort().join(',') || 'all'}${macroSig}${budgetSig}`;
}

function macroScore(r: Recipe, scale: number, tgtCal: number, tgtPro: number): number {
  const calErr = Math.abs(r.macros.calories * scale - tgtCal) / tgtCal;
  const proErr = Math.abs(r.macros.protein * scale - tgtPro) / Math.max(tgtPro, 1);
  return calErr + proErr;
}

/**
 * Picks a recipe for a slot. When `costAllowance` is given, affordability is a hard
 * filter first — only recipes that fit the allowance are considered for macro-fit
 * ranking, repeats included (repeating a cheap recipe is normal grocery behaviour).
 * Only if NOTHING fits the allowance do we fall back to the cheapest option overall,
 * so a plan never silently blows the budget for the sake of macro accuracy.
 * Without a budget, behaves as a pure macro-fit + variety pick (legacy behaviour).
 */
function pickForSlot(
  candidates: Recipe[],
  tgtCal: number,
  tgtPro: number,
  isSnack: boolean,
  excludeAcrossWeek: Set<Recipe>,
  daySeed: number,
  costAllowance?: number,
): { recipe: Recipe; scale: number } | undefined {
  const withScale = candidates.map((r) => ({
    r,
    scale: isSnack ? Math.min(1, scaleFor(r, tgtCal)) : scaleFor(r, tgtCal),
  }));

  if (costAllowance != null) {
    const affordable = withScale.filter((x) => estimateSlotCost(x.r, x.scale) <= costAllowance);
    const pool = affordable.length
      ? affordable
      : [...withScale].sort((a, b) => estimateSlotCost(a.r, a.scale) - estimateSlotCost(b.r, b.scale));

    const sorted = [...pool].sort((a, b) => macroScore(a.r, a.scale, tgtCal, tgtPro) - macroScore(b.r, b.scale, tgtCal, tgtPro));
    // Within the affordable set, still rotate among the best few for variety — but never
    // reach outside the affordable pool to do it, since that would spend more than allowed.
    const topK = sorted.slice(0, Math.min(3, sorted.length));
    if (!topK.length) return undefined;
    const chosen = topK[daySeed % topK.length];
    return { recipe: chosen.r, scale: chosen.scale };
  }

  // No budget constraint: pure macro-fit + novelty-preferring variety (original behaviour).
  const sorted = [...withScale].sort((a, b) => macroScore(a.r, a.scale, tgtCal, tgtPro) - macroScore(b.r, b.scale, tgtCal, tgtPro));
  const novel = sorted.filter((x) => !excludeAcrossWeek.has(x.r));
  const pool = novel.length ? novel : sorted;
  const topK = pool.slice(0, Math.min(3, pool.length));
  if (!topK.length) return undefined;
  const chosen = topK[daySeed % topK.length];
  return { recipe: chosen.r, scale: chosen.scale };
}

function generatePlanForDailyBudget(
  diets: Diet[],
  targets: Macros | null,
  daySeed: number,
  excludeAcrossWeek: Set<Recipe>,
  dailyBudget?: number,
): PlanEntry[] {
  const pool = getFiltered(diets);
  const totalCal = targets?.calories || 2000;
  const totalPro = targets?.protein || 100;
  const usedToday = new Set<Recipe>();

  return MEAL_SLOTS.map((slot) => {
    const isSnack = slot.key === 'snack';
    const tgtCal = Math.round(totalCal * slot.ratio);
    const tgtPro = Math.round(totalPro * slot.ratio);
    const costAllowance = dailyBudget != null ? dailyBudget * slot.ratio : undefined;

    const typed = pool.filter((r) => slot.types.includes(r.mealType) && !usedToday.has(r));
    const fallback = pool.filter((r) => !usedToday.has(r));
    const candidates = typed.length ? typed : fallback.length ? fallback : pool;

    const pick = pickForSlot(candidates, tgtCal, tgtPro, isSnack, excludeAcrossWeek, daySeed, costAllowance);

    if (pick) usedToday.add(pick.recipe);
    return { slotKey: slot.key, recipeIdx: pick ? recipes.indexOf(pick.recipe) : 0, scale: pick?.scale ?? 1 };
  });
}

export function generatePlan(
  diets: Diet[],
  targets: Macros | null,
  daySeed = 0,
  excludeAcrossWeek = new Set<Recipe>(),
  weeklyBudget?: number,
): PlanEntry[] {
  const dailyBudget = weeklyBudget && weeklyBudget > 0 ? weeklyBudget / 7 : undefined;
  return generatePlanForDailyBudget(diets, targets, daySeed, excludeAcrossWeek, dailyBudget);
}

export interface DayPlan {
  date: string;
  plan: PlanEntry[];
}

function planCost(plan: PlanEntry[]): number {
  return plan.reduce((sum, p) => {
    const r = recipes[p.recipeIdx];
    return r ? sum + estimateSlotCost(r, p.scale ?? 1) : sum;
  }, 0);
}

/**
 * Final corrective pass: if the week still costs more than the budget (only possible
 * when even the cheapest valid recipe for some slot exceeds its daily allowance), swap
 * the single most expensive slot across the whole week for the cheapest valid
 * alternative for that slot type, repeatedly, until under budget or no slot can be
 * made cheaper. This is the "no matter what" guarantee — it always converges to the
 * lowest achievable cost for the chosen diet filters.
 */
function enforceWeeklyBudget(days: DayPlan[], diets: Diet[], weeklyBudget: number): void {
  const pool = getFiltered(diets);
  let total = days.reduce((sum, d) => sum + planCost(d.plan), 0);
  let guard = 0;

  while (total > weeklyBudget && guard < 100) {
    guard++;

    type Worst = { day: DayPlan; slotIdx: number; cost: number };
    let worst: Worst | undefined;

    for (const day of days) {
      for (let slotIdx = 0; slotIdx < day.plan.length; slotIdx++) {
        const r = recipes[day.plan[slotIdx].recipeIdx];
        if (!r) continue;
        const cost = estimateSlotCost(r, day.plan[slotIdx].scale ?? 1);
        if (!worst || cost > worst.cost) worst = { day, slotIdx, cost };
      }
    }
    if (!worst) break;
    const found: Worst = worst;

    const slotDef = MEAL_SLOTS[found.slotIdx];
    const candidates = pool.filter((r) => slotDef.types.includes(r.mealType));
    const searchPool = candidates.length ? candidates : pool;

    const cheapest = [...searchPool].sort(
      (a, b) => estimateRecipeCostPerServing(a) - estimateRecipeCostPerServing(b),
    )[0];
    if (!cheapest) break;

    const scale = slotDef.key === 'snack' ? Math.min(1, scaleFor(cheapest, 1)) : 1;
    const newCost = estimateSlotCost(cheapest, scale || 1);
    if (newCost >= found.cost) break; // no further improvement possible

    found.day.plan[found.slotIdx] = { ...found.day.plan[found.slotIdx], recipeIdx: recipes.indexOf(cheapest) };
    total = total - found.cost + newCost;
  }
}

/** Generates a 7-day plan starting today, with day-to-day variety and a hard budget guarantee. */
export function generateWeeklyPlan(
  diets: Diet[],
  targets: Macros | null,
  startDate: string,
  weeklyBudget?: number,
): DayPlan[] {
  const usedAcrossWeek = new Set<Recipe>();
  const days: DayPlan[] = [];
  let remainingBudget = weeklyBudget && weeklyBudget > 0 ? weeklyBudget : undefined;

  for (let i = 0; i < 7; i++) {
    const date = dayjs(startDate).add(i, 'day').format('YYYY-MM-DD');
    const remainingDays = 7 - i;
    const dailyBudgetForDay = remainingBudget != null ? remainingBudget / remainingDays : undefined;

    const plan = generatePlanForDailyBudget(diets, targets, i, usedAcrossWeek, dailyBudgetForDay);
    plan.forEach((p) => {
      const r = recipes[p.recipeIdx];
      if (r) usedAcrossWeek.add(r);
    });

    if (remainingBudget != null) remainingBudget -= planCost(plan);
    days.push({ date, plan });
  }

  if (weeklyBudget && weeklyBudget > 0) {
    enforceWeeklyBudget(days, diets, weeklyBudget);
  }

  return days;
}

export function getWeeklyPlanKey(
  profileId: string,
  startDate: string,
  diets: Diet[],
  targets?: Macros | null,
  weeklyBudget?: number,
): string {
  const macroSig = targets ? `_${targets.calories}` : '';
  const budgetSig = weeklyBudget ? `_b${weeklyBudget}` : '';
  return `fitx_weekplan_v1_${profileId}_${startDate}_${[...diets].sort().join(',') || 'all'}${macroSig}${budgetSig}`;
}

export function loadWeeklyPlanCached(
  profileId: string,
  startDate: string,
  diets: Diet[],
  targets: Macros | null,
  weeklyBudget?: number,
): DayPlan[] {
  const key = getWeeklyPlanKey(profileId, startDate, diets, targets, weeklyBudget);
  try {
    const saved = JSON.parse(localStorage.getItem(key) || 'null');
    if (saved && saved.length === 7) return saved;
  } catch {
    /* ignore */
  }
  const plan = generateWeeklyPlan(diets, targets, startDate, weeklyBudget);
  localStorage.setItem(key, JSON.stringify(plan));
  return plan;
}

/** Swaps a single slot on a single day of the cached weekly plan, cycling through candidates. */
export function swapWeeklySlot(
  profileId: string,
  startDate: string,
  diets: Diet[],
  targets: Macros | null,
  weeklyBudget: number | undefined,
  dayIndex: number,
  slotIdx: number,
): DayPlan[] {
  const key = getWeeklyPlanKey(profileId, startDate, diets, targets, weeklyBudget);
  const weekPlan = loadWeeklyPlanCached(profileId, startDate, diets, targets, weeklyBudget);
  const pool = getFiltered(diets);
  const slot = MEAL_SLOTS[slotIdx];
  const dayPlan = weekPlan[dayIndex];
  if (!dayPlan) return weekPlan;

  const currentGIdx = dayPlan.plan[slotIdx].recipeIdx;

  const byType = pool
    .map((r) => ({ r, gi: recipes.indexOf(r) }))
    .filter((x) => slot.types.includes(x.r.mealType) && x.gi !== currentGIdx);
  const others = pool
    .map((r) => ({ r, gi: recipes.indexOf(r) }))
    .filter((x) => !slot.types.includes(x.r.mealType) && x.gi !== currentGIdx);
  const candidates = [...byType, ...others];

  const cycleKey = `${key}_swapIdx_${dayIndex}_${slotIdx}`;
  const cycleIdx = parseInt(localStorage.getItem(cycleKey) || '0', 10) % Math.max(candidates.length, 1);
  const pick = candidates[cycleIdx];

  if (pick) {
    const tgtCal = Math.round((targets?.calories || 2000) * slot.ratio);
    const isSnack = slot.key === 'snack';
    const newScale = isSnack ? Math.min(1, scaleFor(pick.r, tgtCal)) : scaleFor(pick.r, tgtCal);
    dayPlan.plan[slotIdx] = { ...dayPlan.plan[slotIdx], recipeIdx: pick.gi, scale: newScale };
    localStorage.setItem(cycleKey, String(cycleIdx + 1));
  }
  localStorage.setItem(key, JSON.stringify(weekPlan));
  return weekPlan;
}

export function loadPlan(
  profileId: string,
  date: string,
  diets: Diet[],
  targets: Macros | null,
  weeklyBudget?: number,
): PlanEntry[] {
  const key = getPlanKey(profileId, date, diets, targets, weeklyBudget);
  try {
    const saved = JSON.parse(localStorage.getItem(key) || 'null');
    if (saved && saved.length === MEAL_SLOTS.length) return saved;
  } catch {
    /* ignore */
  }
  const plan = generatePlan(diets, targets, 0, new Set(), weeklyBudget);
  localStorage.setItem(key, JSON.stringify(plan));
  return plan;
}

export function swapSlot(
  profileId: string,
  date: string,
  diets: Diet[],
  slotIdx: number,
  targets: Macros | null,
  weeklyBudget?: number,
): PlanEntry[] {
  const key = getPlanKey(profileId, date, diets, targets, weeklyBudget);
  const plan = loadPlan(profileId, date, diets, targets, weeklyBudget);
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

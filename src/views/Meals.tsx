import { useEffect, useMemo, useState } from 'react';
import dayjs from 'dayjs';
import { useProfile } from '../lib/ProfileContext';
import { calcMacros, applyDietProteinModifier } from '../lib/macros';
import { getActiveProfileId } from '../lib/storage';
import { addMeal, deleteMeal, getMealsForDate } from '../lib/db';
import recipes from '../data/recipes';
import type { Diet, MealLog, PlanEntry } from '../types';
import {
  MEAL_SLOTS,
  loadPlan,
  swapSlot,
  scaledMacros,
  getYesterdaySurplus,
  adjustTargetsForSurplus,
  type MacroSurplus,
} from '../lib/mealPlan';
import Card from '../components/Card';
import MealSlotCard from '../components/MealSlotCard';

const DIET_LABELS: Record<Diet, { label: string; icon: string }> = {
  chicken: { label: 'Chicken', icon: '🍗' },
  beef: { label: 'Beef', icon: '🥩' },
  pork: { label: 'Pork', icon: '🐷' },
  fish: { label: 'Fish', icon: '🐟' },
  vegetarian: { label: 'Vegetarian', icon: '🥗' },
  vegan: { label: 'Vegan', icon: '🌱' },
};

export default function Meals() {
  const { profile, saveProfile } = useProfile();
  const pid = getActiveProfileId();
  const today = dayjs().format('YYYY-MM-DD');

  const [todayMeals, setTodayMeals] = useState<MealLog[]>([]);
  const [surplus, setSurplus] = useState<MacroSurplus | null>(null);
  const [plan, setPlan] = useState<PlanEntry[]>([]);
  const [showCustomForm, setShowCustomForm] = useState(false);
  const [customMeal, setCustomMeal] = useState({ name: '', calories: '', protein: '', carbs: '', fat: '' });

  const activeDiets = profile?.dietPreferences ?? [];
  const activeDietsKey = activeDiets.join(',');

  const baseTargets = useMemo(() => {
    const m = calcMacros(profile);
    if (!m) return null;
    return applyDietProteinModifier(m, activeDiets);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [profile, activeDietsKey]);

  useEffect(() => {
    if (!profile) return;
    (async () => {
      const meals = await getMealsForDate(pid, today);
      setTodayMeals(meals);
      if (baseTargets) {
        const s = await getYesterdaySurplus(pid, baseTargets);
        setSurplus(s);
        const targets = adjustTargetsForSurplus(baseTargets, s);
        setPlan(loadPlan(pid, today, activeDiets, targets));
      }
    })();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [profile, pid, today, activeDietsKey, baseTargets]);

  const targets = baseTargets ? adjustTargetsForSurplus(baseTargets, surplus) : null;

  const eaten = useMemo(
    () =>
      todayMeals.reduce(
        (a, m) => ({
          calories: a.calories + (m.calories || 0),
          protein: a.protein + (m.protein || 0),
          carbs: a.carbs + (m.carbs || 0),
          fat: a.fat + (m.fat || 0),
        }),
        { calories: 0, protein: 0, carbs: 0, fat: 0 },
      ),
    [todayMeals],
  );

  const remaining = targets
    ? {
        calories: targets.calories - eaten.calories,
        protein: targets.protein - eaten.protein,
        carbs: targets.carbs - eaten.carbs,
        fat: targets.fat - eaten.fat,
      }
    : null;

  const loggedNames = new Set(todayMeals.map((m) => m.name));

  const planTotals = useMemo(() => {
    const totals = { calories: 0, protein: 0, carbs: 0, fat: 0 };
    plan.forEach((p) => {
      const r = recipes[p.recipeIdx];
      if (r) {
        const m = scaledMacros(r, p.scale ?? 1);
        totals.calories += m.calories;
        totals.protein += m.protein;
        totals.carbs += m.carbs;
        totals.fat += m.fat;
      }
    });
    return totals;
  }, [plan]);

  const toggleDiet = async (diet: Diet | 'all') => {
    if (!profile) return;
    let diets = [...activeDiets];
    if (diet === 'all') {
      diets = [];
    } else {
      const idx = diets.indexOf(diet);
      if (idx >= 0) diets.splice(idx, 1);
      else diets.push(diet);
    }
    await saveProfile({ ...profile, dietPreferences: diets });
  };

  const handleSwap = (slotIdx: number) => {
    const updated = swapSlot(pid, today, activeDiets, slotIdx, targets);
    setPlan(updated);
  };

  const handleLogPlanItem = async (slotIdx: number) => {
    const p = plan[slotIdx];
    const r = recipes[p.recipeIdx];
    if (!r) return;
    const m = scaledMacros(r, p.scale ?? 1);
    await addMeal({
      profileId: pid,
      date: today,
      name: r.name,
      calories: m.calories,
      protein: m.protein,
      carbs: m.carbs,
      fat: m.fat,
      loggedAt: new Date().toISOString(),
    });
    setTodayMeals(await getMealsForDate(pid, today));
  };

  const handleDeleteMeal = async (id?: number) => {
    if (id == null) return;
    await deleteMeal(id);
    setTodayMeals(await getMealsForDate(pid, today));
  };

  const handleCustomSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    await addMeal({
      profileId: pid,
      date: today,
      name: customMeal.name,
      calories: +customMeal.calories,
      protein: +customMeal.protein,
      carbs: +customMeal.carbs,
      fat: +customMeal.fat,
      loggedAt: new Date().toISOString(),
    });
    setCustomMeal({ name: '', calories: '', protein: '', carbs: '', fat: '' });
    setShowCustomForm(false);
    setTodayMeals(await getMealsForDate(pid, today));
  };

  const surplusNote = useMemo(() => {
    if (!surplus) return null;
    const parts: string[] = [];
    if (Math.abs(surplus.calories) > 50)
      parts.push(`${surplus.calories > 0 ? surplus.calories + ' kcal over' : Math.abs(surplus.calories) + ' kcal under'} yesterday`);
    if (Math.abs(surplus.protein) > 5)
      parts.push(surplus.protein > 0 ? `${surplus.protein}g protein surplus` : `${Math.abs(surplus.protein)}g protein deficit`);
    return parts.length ? parts.join(' · ') : null;
  }, [surplus]);

  if (!profile) return null;

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h1 className="text-xl font-bold">Meals</h1>
        <button
          className="flex h-9 w-9 items-center justify-center rounded-full bg-surface2 text-lg"
          onClick={() => setShowCustomForm((v) => !v)}
        >
          ＋
        </button>
      </div>

      {targets ? (
        <Card>
          <div className="flex justify-between text-center">
            <Stat value={eaten.calories} label="eaten kcal" />
            <Stat
              value={Math.abs(remaining?.calories ?? 0)}
              label={(remaining?.calories ?? 1) < 0 ? 'over' : 'remaining'}
              accent={(remaining?.calories ?? 0) < 0}
            />
            <Stat value={targets.calories} label="target kcal" />
          </div>
          <div className="mt-4 space-y-2">
            <MacroBar label="Protein" eaten={eaten.protein} target={targets.protein} color="#60a5fa" />
            <MacroBar label="Carbs" eaten={eaten.carbs} target={targets.carbs} color="#4ade80" />
            <MacroBar label="Fat" eaten={eaten.fat} target={targets.fat} color="#ffb84d" />
          </div>
          {activeDiets.length > 0 && (
            <p className="mt-3 text-xs text-text-muted">
              {activeDiets.map((d) => DIET_LABELS[d]?.icon).join('')} Filtered by{' '}
              <strong>{activeDiets.map((d) => DIET_LABELS[d]?.label).join(' + ')}</strong>
            </p>
          )}
        </Card>
      ) : (
        <Card>
          <p className="text-sm text-text-muted">Complete your profile to see macro targets and a daily meal plan.</p>
        </Card>
      )}

      <div>
        <p className="mb-2 text-xs text-text-muted">Select one or more — tap again to deselect</p>
        <div className="flex flex-wrap gap-1.5">
          <button
            onClick={() => toggleDiet('all')}
            className={`rounded-full px-3 py-1.5 text-xs font-medium ${
              !activeDiets.length ? 'bg-accent text-white' : 'bg-surface2 text-text-muted'
            }`}
          >
            🍽️ All
          </button>
          {Object.entries(DIET_LABELS).map(([key, val]) => (
            <button
              key={key}
              onClick={() => toggleDiet(key as Diet)}
              className={`rounded-full px-3 py-1.5 text-xs font-medium ${
                activeDiets.includes(key as Diet) ? 'bg-accent text-white' : 'bg-surface2 text-text-muted'
              }`}
            >
              {val.icon} {val.label}
            </button>
          ))}
        </div>
      </div>

      {plan.length > 0 && targets && (
        <>
          <Card>
            <div className="flex justify-between text-sm">
              <div>
                <div className="text-xs uppercase tracking-wide text-text-muted">Today's Plan</div>
                <div className="font-semibold">
                  {planTotals.calories} kcal · {planTotals.protein}g protein
                </div>
              </div>
              <div className="text-right">
                <div className="text-xs uppercase tracking-wide text-text-muted">Your Target</div>
                <div className="font-semibold">
                  {targets.calories} kcal · {targets.protein}g protein
                </div>
              </div>
            </div>
            <div className="mt-3 h-2 overflow-hidden rounded-full bg-surface2">
              <div
                className="h-full rounded-full bg-accent"
                style={{ width: `${Math.min(100, Math.round((planTotals.calories / targets.calories) * 100))}%` }}
              />
            </div>
            <p className="mt-2 text-xs text-text-muted">
              {planTotals.calories >= targets.calories * 0.9
                ? '✓ Plan covers your daily target'
                : `Plan covers ${Math.round((planTotals.calories / targets.calories) * 100)}% of calories — log extra snacks to reach your target`}
            </p>
            {surplusNote && (
              <p className="mt-2 rounded-lg bg-info/10 p-2 text-xs text-info">↩ Adjusted for yesterday: {surplusNote}</p>
            )}
          </Card>

          <h2 className="text-sm font-semibold uppercase tracking-wide text-text-muted">Today's Meal Plan</h2>
          <div className="space-y-3">
            {MEAL_SLOTS.map((slot, idx) => {
              const p = plan[idx];
              const r = recipes[p.recipeIdx];
              if (!r) return null;
              const tgtCal = Math.round(targets.calories * slot.ratio);
              const tgtPro = Math.round(targets.protein * slot.ratio);
              return (
                <MealSlotCard
                  key={slot.key}
                  slotIcon={slot.icon}
                  slotLabel={slot.label}
                  tgtCal={tgtCal}
                  tgtPro={tgtPro}
                  recipe={r}
                  scale={p.scale ?? 1}
                  isLogged={loggedNames.has(r.name)}
                  onSwap={() => handleSwap(idx)}
                  onLog={() => handleLogPlanItem(idx)}
                />
              );
            })}
          </div>
        </>
      )}

      {todayMeals.length > 0 && (
        <Card title="Today's Log">
          <div className="space-y-2">
            {todayMeals.map((m) => (
              <div key={m.id} className="flex items-center justify-between rounded-lg bg-surface2 px-3 py-2">
                <div>
                  <strong className="text-sm">{m.name}</strong>
                  <div className="text-xs text-text-muted">
                    {m.calories} kcal · P{m.protein}g · C{m.carbs}g · F{m.fat}g
                  </div>
                </div>
                <button className="text-accent" onClick={() => handleDeleteMeal(m.id)}>
                  ✕
                </button>
              </div>
            ))}
          </div>
        </Card>
      )}

      {showCustomForm && (
        <Card title="Log Custom Meal">
          <form onSubmit={handleCustomSubmit} className="space-y-3">
            <input
              className="input"
              placeholder="e.g. Protein bar"
              required
              value={customMeal.name}
              onChange={(e) => setCustomMeal({ ...customMeal, name: e.target.value })}
            />
            <div className="grid grid-cols-2 gap-2">
              <input
                className="input"
                type="number"
                min={0}
                placeholder="Calories"
                required
                value={customMeal.calories}
                onChange={(e) => setCustomMeal({ ...customMeal, calories: e.target.value })}
              />
              <input
                className="input"
                type="number"
                min={0}
                placeholder="Protein (g)"
                required
                value={customMeal.protein}
                onChange={(e) => setCustomMeal({ ...customMeal, protein: e.target.value })}
              />
              <input
                className="input"
                type="number"
                min={0}
                placeholder="Carbs (g)"
                required
                value={customMeal.carbs}
                onChange={(e) => setCustomMeal({ ...customMeal, carbs: e.target.value })}
              />
              <input
                className="input"
                type="number"
                min={0}
                placeholder="Fat (g)"
                required
                value={customMeal.fat}
                onChange={(e) => setCustomMeal({ ...customMeal, fat: e.target.value })}
              />
            </div>
            <div className="flex gap-2">
              <button type="submit" className="btn-primary flex-1">
                Save
              </button>
              <button type="button" className="btn-secondary" onClick={() => setShowCustomForm(false)}>
                Cancel
              </button>
            </div>
          </form>
        </Card>
      )}
    </div>
  );
}

function Stat({ value, label, accent }: { value: number; label: string; accent?: boolean }) {
  return (
    <div>
      <div className={`text-xl font-bold ${accent ? 'text-accent' : ''}`}>{value}</div>
      <div className="text-[0.65rem] text-text-muted">{label}</div>
    </div>
  );
}

function MacroBar({ label, eaten, target, color }: { label: string; eaten: number; target: number; color: string }) {
  const pct = Math.min(100, (eaten / Math.max(target, 1)) * 100);
  return (
    <div>
      <div className="mb-1 flex justify-between text-xs text-text-muted">
        <span>{label}</span>
        <span>
          {eaten}g / {target}g
        </span>
      </div>
      <div className="h-1.5 overflow-hidden rounded-full bg-surface2">
        <div className="h-full rounded-full" style={{ width: `${pct}%`, background: color }} />
      </div>
    </div>
  );
}

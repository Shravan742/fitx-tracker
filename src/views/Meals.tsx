import { useEffect, useMemo, useState } from 'react';
import dayjs from 'dayjs';
import { useProfile } from '../lib/ProfileContext';
import { useAuth } from '../lib/AuthContext';
import { usePartner } from '../lib/usePartner';
import { calcMacros, applyDietProteinModifier } from '../lib/macros';
import { getActiveProfileId } from '../lib/storage';
import { addMeal, deleteMeal, getMealsForDate } from '../lib/firestoreDb';
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
import {
  computeHouseholdMacros,
  getHouseholdDietPreferences,
  setHouseholdDietPreferences,
  getHouseholdBudget,
  setHouseholdBudget,
  getHouseholdModeOn,
  setHouseholdModeOn,
  splitServings,
} from '../lib/household';
import Card from '../components/Card';
import MealSlotCard from '../components/MealSlotCard';
import WeeklyPlanView from '../components/WeeklyPlanView';
import CustomIngredients from '../components/CustomIngredients';
import TopUpSuggestion from '../components/TopUpSuggestion';
import { AnimatedNumber, ProgressBar, StaggerList, StaggerItem } from '../components/motion';
import { AnimatePresence, motion } from 'framer-motion';

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
  const { user } = useAuth();
  const pid = getActiveProfileId();
  const today = dayjs().format('YYYY-MM-DD');
  // Partner linking is invite-based (see lib/invites.ts) — until your partner has
  // accepted an invite, partnerUid is null and household mode stays hidden.
  const { partnerUid: partnerId, partnerProfile } = usePartner(user?.uid, user?.email ?? undefined);

  const [tab, setTab] = useState<'today' | 'week'>('today');
  const [todayMeals, setTodayMeals] = useState<MealLog[]>([]);
  const [partnerMeals, setPartnerMeals] = useState<MealLog[]>([]);
  const [surplus, setSurplus] = useState<MacroSurplus | null>(null);
  const [plan, setPlan] = useState<PlanEntry[]>([]);
  const [showCustomForm, setShowCustomForm] = useState(false);
  const [customMeal, setCustomMeal] = useState({ name: '', calories: '', protein: '', carbs: '', fat: '' });
  const [customSaving, setCustomSaving] = useState(false);

  const [householdMode, setHouseholdModeState] = useState(getHouseholdModeOn);
  const setHouseholdMode = (on: boolean) => {
    setHouseholdModeOn(on);
    setHouseholdModeState(on);
  };
  const [householdBudgetInput, setHouseholdBudgetInput] = useState('');
  const [householdDiets, setHouseholdDiets] = useState<Diet[]>(getHouseholdDietPreferences());

  useEffect(() => {
    if (!partnerId) setHouseholdMode(false);
  }, [partnerId]);

  const householdMacros = useMemo(
    () => (profile && partnerProfile ? computeHouseholdMacros(profile, partnerProfile) : null),
    [profile, partnerProfile],
  );

  const activeDiets = householdMode ? householdDiets : profile?.dietPreferences ?? [];
  const activeDietsKey = activeDiets.join(',');
  const planOwnerId = householdMode ? 'household' : pid;
  // The shared plan must use one shared budget regardless of which partner is currently
  // logged in — see getHouseholdBudget for why this can't just be profile.weeklyBudget.
  const effectiveBudget = householdMode ? getHouseholdBudget(profile?.weeklyBudget ?? 0) : profile?.weeklyBudget;

  const baseTargets = useMemo(() => {
    if (householdMode) return householdMacros?.combined ?? null;
    const m = calcMacros(profile);
    if (!m) return null;
    return applyDietProteinModifier(m, activeDiets);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [profile, activeDietsKey, householdMode, householdMacros]);

  useEffect(() => {
    if (!profile) return;
    (async () => {
      const meals = await getMealsForDate(pid, today);
      setTodayMeals(meals);
      if (householdMode && partnerId) {
        setPartnerMeals(await getMealsForDate(partnerId, today));
      } else {
        setPartnerMeals([]);
      }
      if (baseTargets) {
        if (householdMode) {
          // Surplus carryover is an individual concept — skip it for the shared plan.
          setSurplus(null);
          setPlan(loadPlan(planOwnerId, today, activeDiets, baseTargets, effectiveBudget));
        } else {
          const s = await getYesterdaySurplus(pid, baseTargets);
          setSurplus(s);
          const targets = adjustTargetsForSurplus(baseTargets, s);
          setPlan(loadPlan(planOwnerId, today, activeDiets, targets, effectiveBudget));
        }
      }
    })();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [profile, pid, partnerId, today, activeDietsKey, baseTargets, householdMode, planOwnerId, effectiveBudget]);

  const targets = baseTargets ? adjustTargetsForSurplus(baseTargets, surplus) : null;

  const eaten = useMemo(() => {
    // In household mode the target is the combined total, so "eaten" must be both
    // people's logged meals combined too — otherwise "remaining" looks far too generous
    // since it would ignore everything the partner already ate today.
    const combined = householdMode ? [...todayMeals, ...partnerMeals] : todayMeals;
    return combined.reduce(
      (a, m) => ({
        calories: a.calories + (m.calories || 0),
        protein: a.protein + (m.protein || 0),
        carbs: a.carbs + (m.carbs || 0),
        fat: a.fat + (m.fat || 0),
      }),
      { calories: 0, protein: 0, carbs: 0, fat: 0 },
    );
  }, [todayMeals, partnerMeals, householdMode]);

  const remaining = targets
    ? {
        calories: targets.calories - eaten.calories,
        protein: targets.protein - eaten.protein,
        carbs: targets.carbs - eaten.carbs,
        fat: targets.fat - eaten.fat,
      }
    : null;

  const loggedNames = new Set(
    (householdMode ? [...todayMeals, ...partnerMeals] : todayMeals).map((m) => m.name),
  );

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
    if (householdMode) {
      setHouseholdDiets(diets);
      setHouseholdDietPreferences(diets);
    } else {
      await saveProfile({ ...profile, dietPreferences: diets });
    }
  };

  const handleSwap = (slotIdx: number) => {
    const updated = swapSlot(planOwnerId, today, activeDiets, slotIdx, targets, effectiveBudget);
    setPlan(updated);
  };

  const handleLogPlanItem = async (slotIdx: number) => {
    const p = plan[slotIdx];
    const r = recipes[p.recipeIdx];
    if (!r) return;

    if (householdMode && householdMacros && partnerId) {
      // Log each person's own share to their own meal log, not the combined total.
      const slot = MEAL_SLOTS[slotIdx];
      const [memberA, memberB] = householdMacros.members;
      const splits = splitServings(
        [memberA.macros.calories * slot.ratio, memberB.macros.calories * slot.ratio],
        r.macros.calories,
      );
      await Promise.all(
        householdMacros.members.map((member, i) => {
          const m = scaledMacros(r, splits[i]);
          return addMeal({
            profileId: member.profile.id,
            date: today,
            name: r.name,
            calories: m.calories,
            protein: m.protein,
            carbs: m.carbs,
            fat: m.fat,
            loggedAt: new Date().toISOString(),
          });
        }),
      );
      setTodayMeals(await getMealsForDate(pid, today));
      setPartnerMeals(await getMealsForDate(partnerId, today));
      return;
    }

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

  const handleDeleteMeal = async (id?: string) => {
    if (id == null) return;
    await deleteMeal(id);
    setTodayMeals(await getMealsForDate(pid, today));
  };

  const handleCustomSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setCustomSaving(true);
    try {
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
    } finally {
      setCustomSaving(false);
    }
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
        {tab === 'today' && (
          <button
            className="flex h-9 w-9 items-center justify-center rounded-full bg-surface2 text-lg"
            onClick={() => setShowCustomForm((v) => !v)}
          >
            ＋
          </button>
        )}
      </div>

      <div className="flex gap-2 rounded-xl bg-surface2 p-1">
        <button
          className={`flex-1 rounded-lg py-2 text-sm font-semibold transition-colors ${
            tab === 'today' ? 'bg-accent text-bg' : 'text-text-muted'
          }`}
          onClick={() => setTab('today')}
        >
          Today
        </button>
        <button
          className={`flex-1 rounded-lg py-2 text-sm font-semibold transition-colors ${
            tab === 'week' ? 'bg-accent text-bg' : 'text-text-muted'
          }`}
          onClick={() => setTab('week')}
        >
          This Week
        </button>
      </div>

      {partnerProfile && (
        <button
          onClick={() => setHouseholdMode(!householdMode)}
          className={`flex w-full items-center justify-between rounded-xl border px-4 py-3 text-left transition-colors ${
            householdMode ? 'border-accent bg-accent/10' : 'border-border bg-card'
          }`}
        >
          <span className="text-sm font-semibold">
            👥 Cook together with {partnerProfile.name}
            {householdMode && <span className="ml-2 text-accent">· Active</span>}
          </span>
          <span className="text-text-muted">{householdMode ? '✓' : '○'}</span>
        </button>
      )}
      {householdMode && householdMacros && (
        <>
          <p className="text-xs text-text-muted">
            Combined target: {householdMacros.combined.calories} kcal · {householdMacros.combined.protein}g protein —{' '}
            {householdMacros.members[0].profile.name} needs {householdMacros.members[0].macros.calories} kcal,{' '}
            {householdMacros.members[1].profile.name} needs {householdMacros.members[1].macros.calories} kcal.
          </p>
          <div className="flex items-center gap-2 rounded-xl bg-surface2 px-3 py-2">
            <span className="text-xs text-text-muted whitespace-nowrap">Shared weekly budget (€)</span>
            <input
              type="number"
              min={0}
              step={5}
              className="input"
              placeholder={String(effectiveBudget ?? 0)}
              value={householdBudgetInput}
              onChange={(e) => setHouseholdBudgetInput(e.target.value)}
              onBlur={() => {
                const val = parseFloat(householdBudgetInput);
                if (val > 0) setHouseholdBudget(val);
                setHouseholdBudgetInput('');
              }}
            />
          </div>
          <p className="text-[0.7rem] text-text-muted">
            One shared budget for both of you — set once, applies no matter who's logged in.
          </p>
        </>
      )}

      {tab === 'week' ? (
        targets ? (
          <WeeklyPlanView
            diets={activeDiets}
            targets={targets}
            weeklyBudget={effectiveBudget ?? 0}
            planOwnerId={planOwnerId}
            householdMembers={
              householdMode && householdMacros
                ? householdMacros.members.map((mem) => ({ name: mem.profile.name, caloriesPerDay: mem.macros.calories }))
                : undefined
            }
          />
        ) : (
          <Card>
            <p className="text-sm text-text-muted">Complete your profile to see a weekly meal plan.</p>
          </Card>
        )
      ) : (
        <>
      {targets ? (
        <Card variant="glow">
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
            <MacroBar label="Protein" eaten={eaten.protein} target={targets.protein} color="#22d3ee" />
            <MacroBar label="Carbs" eaten={eaten.carbs} target={targets.carbs} color="#34d399" />
            <MacroBar label="Fat" eaten={eaten.fat} target={targets.fat} color="#fbbf24" />
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
              !activeDiets.length ? 'bg-accent text-bg' : 'bg-surface2 text-text-muted'
            }`}
          >
            🍽️ All
          </button>
          {Object.entries(DIET_LABELS).map(([key, val]) => (
            <button
              key={key}
              onClick={() => toggleDiet(key as Diet)}
              className={`rounded-full px-3 py-1.5 text-xs font-medium ${
                activeDiets.includes(key as Diet) ? 'bg-accent text-bg' : 'bg-surface2 text-text-muted'
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
            <ProgressBar
              className="mt-3 h-2"
              pct={Math.round((planTotals.calories / targets.calories) * 100)}
              gradient="linear-gradient(90deg, var(--color-accent), var(--color-accent2))"
            />
            <ProgressBar
              className="mt-1.5 h-1.5"
              pct={Math.round((planTotals.protein / targets.protein) * 100)}
              color="var(--color-info)"
            />
            {(() => {
              const calPct = Math.round((planTotals.calories / targets.calories) * 100);
              const proPct = Math.round((planTotals.protein / targets.protein) * 100);
              const covers = calPct >= 90 && proPct >= 90;
              if (covers) return <p className="mt-2 text-xs text-success">✓ Plan covers your daily target</p>;
              const gaps: string[] = [];
              if (calPct < 90) gaps.push(`${calPct}% of calories`);
              if (proPct < 90) gaps.push(`${proPct}% of protein`);
              return (
                <>
                  <p className="mt-2 text-xs text-text-muted">Plan covers {gaps.join(' and ')}</p>
                  <TopUpSuggestion
                    profileId={pid}
                    date={today}
                    remaining={{
                      calories: Math.max(0, targets.calories - planTotals.calories),
                      protein: Math.max(0, targets.protein - planTotals.protein),
                    }}
                    onLogged={async () => setTodayMeals(await getMealsForDate(pid, today))}
                  />
                </>
              );
            })()}
            {surplusNote && (
              <p className="mt-2 rounded-lg bg-info/10 p-2 text-xs text-info">↩ Adjusted for yesterday: {surplusNote}</p>
            )}
          </Card>

          <h2 className="text-sm font-semibold uppercase tracking-wide text-text-muted">Today's Meal Plan</h2>
          <StaggerList className="space-y-3">
            {MEAL_SLOTS.map((slot, idx) => {
              const p = plan[idx];
              const r = recipes[p.recipeIdx];
              if (!r) return null;
              const tgtCal = Math.round(targets.calories * slot.ratio);
              const tgtPro = Math.round(targets.protein * slot.ratio);
              const servingSplit =
                householdMode && householdMacros
                  ? (() => {
                      const splits = splitServings(
                        householdMacros.members.map((mem) => mem.macros.calories * slot.ratio),
                        r.macros.calories,
                      );
                      return householdMacros.members.map((mem, i) => ({ name: mem.profile.name, servings: splits[i] }));
                    })()
                  : undefined;
              return (
                <StaggerItem key={slot.key}>
                  <MealSlotCard
                    slotIcon={slot.icon}
                    slotLabel={slot.label}
                    tgtCal={tgtCal}
                    tgtPro={tgtPro}
                    recipe={r}
                    scale={p.scale ?? 1}
                    isLogged={loggedNames.has(r.name)}
                    onSwap={() => handleSwap(idx)}
                    onLog={() => handleLogPlanItem(idx)}
                    servingSplit={servingSplit}
                  />
                </StaggerItem>
              );
            })}
          </StaggerList>
        </>
      )}

      {(todayMeals.length > 0 || (householdMode && partnerMeals.length > 0)) && (
        <Card title="Today's Log">
          <StaggerList className="space-y-2">
            <AnimatePresence initial={false}>
              {todayMeals.map((m) => (
                <motion.div
                  key={m.id}
                  layout
                  initial={{ opacity: 0, y: 8 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, x: -20 }}
                  transition={{ duration: 0.25 }}
                  className="flex items-center justify-between rounded-lg bg-surface2 px-3 py-2"
                >
                  <div>
                    <strong className="text-sm">{m.name}</strong>
                    <div className="text-xs text-text-muted">
                      {m.calories} kcal · P{m.protein}g · C{m.carbs}g · F{m.fat}g
                      {householdMode && profile && <span> · {profile.name}</span>}
                    </div>
                  </div>
                  <button className="text-accent transition-transform hover:scale-110 active:scale-90" onClick={() => handleDeleteMeal(m.id)}>
                    ✕
                  </button>
                </motion.div>
              ))}
            </AnimatePresence>
            {householdMode &&
              partnerMeals.map((m) => (
                <div key={`partner-${m.id}`} className="flex items-center justify-between rounded-lg bg-surface2/50 px-3 py-2 opacity-80">
                  <div>
                    <strong className="text-sm">{m.name}</strong>
                    <div className="text-xs text-text-muted">
                      {m.calories} kcal · P{m.protein}g · C{m.carbs}g · F{m.fat}g · {partnerProfile?.name}
                    </div>
                  </div>
                </div>
              ))}
          </StaggerList>
        </Card>
      )}

      <CustomIngredients
        profileId={pid}
        date={today}
        onLogged={async () => setTodayMeals(await getMealsForDate(pid, today))}
        onIngredientsChanged={() => {
          if (baseTargets) setPlan(loadPlan(planOwnerId, today, activeDiets, baseTargets, effectiveBudget));
        }}
      />

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
              <button type="submit" className="btn-primary flex-1 disabled:cursor-not-allowed" disabled={customSaving}>
                {customSaving ? <Spinner /> : 'Save'}
              </button>
              <button type="button" className="btn-secondary" onClick={() => setShowCustomForm(false)}>
                Cancel
              </button>
            </div>
          </form>
        </Card>
      )}
        </>
      )}
    </div>
  );
}

function Spinner() {
  return (
    <span className="inline-flex items-center justify-center gap-2">
      <motion.span
        className="h-3.5 w-3.5 rounded-full border-2 border-bg/40 border-t-bg"
        animate={{ rotate: 360 }}
        transition={{ duration: 0.7, repeat: Infinity, ease: 'linear' }}
      />
    </span>
  );
}

function Stat({ value, label, accent }: { value: number; label: string; accent?: boolean }) {
  return (
    <div>
      <div className={`text-xl font-bold ${accent ? 'text-accent' : ''}`}>
        <AnimatedNumber value={value} />
      </div>
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
      <ProgressBar pct={pct} className="h-1.5" color={color} />
    </div>
  );
}

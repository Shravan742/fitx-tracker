import { useEffect, useMemo, useState } from 'react';
import dayjs from 'dayjs';
import recipes from '../data/recipes';
import type { Diet, Macros } from '../types';
import { MEAL_SLOTS, loadWeeklyPlanCached, swapWeeklySlot, scaledMacros, type DayPlan } from '../lib/mealPlan';
import { buildShoppingList } from '../lib/shoppingList';
import { getActiveProfileId, getShoppingChecklist, toggleShoppingItem } from '../lib/storage';
import { splitServings } from '../lib/household';
import Card from './Card';
import { ProgressBar, AnimatedNumber, StaggerList, StaggerItem } from './motion';
import { motion } from 'framer-motion';

export interface HouseholdMember {
  name: string;
  caloriesPerDay: number;
}

export default function WeeklyPlanView({
  diets,
  targets,
  weeklyBudget,
  planOwnerId,
  householdMembers,
}: {
  diets: Diet[];
  targets: Macros;
  weeklyBudget: number;
  planOwnerId?: string;
  householdMembers?: HouseholdMember[];
}) {
  const pid = planOwnerId ?? getActiveProfileId();
  const today = dayjs().format('YYYY-MM-DD');
  const [expandedDay, setExpandedDay] = useState<string | null>(null);
  const [weekPlan, setWeekPlan] = useState<DayPlan[]>([]);
  const [checklist, setChecklist] = useState<Record<string, boolean>>({});

  useEffect(() => {
    setWeekPlan(loadWeeklyPlanCached(pid, today, diets, targets, weeklyBudget));
    setChecklist(getShoppingChecklist(pid, today));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [pid, today, JSON.stringify(diets), targets.calories, weeklyBudget]);

  const shoppingList = useMemo(() => buildShoppingList(weekPlan), [weekPlan]);

  const overBudget = shoppingList.totalCost > weeklyBudget;
  const diff = Math.abs(shoppingList.totalCost - weeklyBudget).toFixed(2);

  const handleSwap = (dayIndex: number, slotIdx: number) => {
    const updated = swapWeeklySlot(pid, today, diets, targets, weeklyBudget, dayIndex, slotIdx);
    setWeekPlan([...updated]);
  };

  const handleToggleItem = (item: string) => {
    setChecklist(toggleShoppingItem(pid, today, item));
  };

  const boughtCount = shoppingList.items.filter((i) => checklist[i.item]).length;
  const sortedItems = useMemo(
    () => [...shoppingList.items].sort((a, b) => Number(!!checklist[a.item]) - Number(!!checklist[b.item])),
    [shoppingList.items, checklist],
  );

  return (
    <div className="space-y-4">
      <Card title="Weekly Grocery Budget" variant="glow">
        <div className="flex items-baseline justify-between">
          <div>
            <div className="text-2xl font-bold">
              €<AnimatedNumber value={shoppingList.totalCost} decimals={2} />
            </div>
            <div className="text-xs text-text-muted">estimated for this week's plan</div>
          </div>
          <div className="text-right">
            <div className="text-lg font-semibold text-text-muted">€{weeklyBudget.toFixed(2)}</div>
            <div className="text-xs text-text-muted">your budget</div>
          </div>
        </div>
        <ProgressBar
          className="mt-3 h-2"
          pct={(shoppingList.totalCost / Math.max(weeklyBudget, 1)) * 100}
          gradient={
            overBudget
              ? 'linear-gradient(135deg, var(--color-warn), var(--color-accent))'
              : 'linear-gradient(135deg, var(--color-accent), var(--color-accent2))'
          }
        />
        <p className={`mt-2 text-xs ${overBudget ? 'text-warn' : 'text-success'}`}>
          {overBudget
            ? `€${diff} over budget even after picking cheaper recipes where possible — raise your budget, switch to more vegan/vegetarian options, or swap pricier meals below.`
            : `€${diff} under budget ✓ — plan already favors cheaper recipes within your macros.`}
        </p>
      </Card>

      <h2 className="text-sm font-semibold uppercase tracking-wide text-text-muted">7-Day Plan</h2>
      <StaggerList className="space-y-2">
        {weekPlan.map(({ date, plan }, dayIndex) => {
          const isToday = date === today;
          const isOpen = expandedDay === date;
          const dayTotals = plan.reduce(
            (acc, p) => {
              const r = recipes[p.recipeIdx];
              if (!r) return acc;
              const m = scaledMacros(r, p.scale ?? 1);
              return { calories: acc.calories + m.calories, protein: acc.protein + m.protein };
            },
            { calories: 0, protein: 0 },
          );

          return (
            <StaggerItem key={date}>
              <div className="overflow-hidden rounded-xl border border-border bg-card transition-colors hover:border-accent/30">
              <button
                className="flex w-full items-center justify-between px-4 py-3 text-left"
                onClick={() => setExpandedDay(isOpen ? null : date)}
              >
                <div>
                  <div className="text-sm font-semibold">
                    {dayjs(date).format('ddd, D MMM')} {isToday && <span className="text-accent">· Today</span>}
                  </div>
                  <div className="text-xs text-text-muted">
                    {dayTotals.calories} kcal · {dayTotals.protein}g protein
                  </div>
                </div>
                <motion.span className="text-text-muted" animate={{ rotate: isOpen ? 180 : 0 }} transition={{ duration: 0.2 }}>
                  ▼
                </motion.span>
              </button>
              {isOpen && (
                <motion.div
                  initial={{ opacity: 0, height: 0 }}
                  animate={{ opacity: 1, height: 'auto' }}
                  transition={{ duration: 0.25, ease: [0.16, 1, 0.3, 1] }}
                  className="space-y-2 border-t border-border px-4 py-3"
                >
                  {plan.map((p, slotIdx) => {
                    const r = recipes[p.recipeIdx];
                    if (!r) return null;
                    const m = scaledMacros(r, p.scale ?? 1);
                    const slot = MEAL_SLOTS[slotIdx];
                    const splits = householdMembers
                      ? splitServings(
                          householdMembers.map((mem) => mem.caloriesPerDay * slot.ratio),
                          r.macros.calories,
                        )
                      : null;
                    return (
                      <div key={slotIdx} className="space-y-1.5">
                        <div className="flex items-center justify-between gap-2 text-sm">
                          <div className="min-w-0 flex-1">
                            <div className="text-[0.65rem] uppercase tracking-wide text-text-muted">
                              {slot.icon} {slot.label}
                            </div>
                            <div className="truncate">{r.name}</div>
                          </div>
                          <span className="whitespace-nowrap text-xs text-text-muted">{m.calories} kcal</span>
                          <button
                            className="btn-secondary btn-sm whitespace-nowrap"
                            onClick={() => handleSwap(dayIndex, slotIdx)}
                          >
                            ↻ Swap
                          </button>
                        </div>
                        {splits && householdMembers && (
                          <div className="flex flex-wrap gap-1.5 pl-0">
                            {householdMembers.map((mem, i) => (
                              <span
                                key={mem.name}
                                className="rounded-full bg-info/15 px-2 py-0.5 text-[0.65rem] font-medium text-info"
                              >
                                👤 {mem.name}: {splits[i]}×
                              </span>
                            ))}
                          </div>
                        )}
                      </div>
                    );
                  })}
                </motion.div>
              )}
              </div>
            </StaggerItem>
          );
        })}
      </StaggerList>

      <Card
        title={
          <span>
            Shopping List ({shoppingList.items.length} items)
            {shoppingList.items.length > 0 && (
              <span className="ml-2 text-text-muted">
                {boughtCount}/{shoppingList.items.length} bought
              </span>
            )}
          </span>
        }
      >
        {shoppingList.items.length > 0 && (
          <ProgressBar className="mb-3 h-1.5" pct={(boughtCount / shoppingList.items.length) * 100} color="var(--color-success)" />
        )}
        <div className="space-y-1">
          {sortedItems.map((item) => {
            const bought = !!checklist[item.item];
            return (
              <motion.button
                key={item.item}
                onClick={() => handleToggleItem(item.item)}
                whileTap={{ scale: 0.98 }}
                className={`flex w-full items-center justify-between gap-3 rounded-lg px-2 py-2 text-left text-sm transition-colors ${
                  bought ? 'opacity-40' : 'hover:bg-surface2'
                }`}
              >
                <span className="flex items-center gap-2 min-w-0">
                  <motion.span
                    className={`flex h-5 w-5 flex-shrink-0 items-center justify-center rounded-md border-2 text-xs ${
                      bought ? 'border-success bg-success text-white' : 'border-border'
                    }`}
                    initial={false}
                    animate={bought ? { scale: [1, 1.25, 1] } : { scale: 1 }}
                    transition={{ duration: 0.25 }}
                  >
                    {bought ? '✓' : ''}
                  </motion.span>
                  <span className={`truncate ${bought ? 'line-through text-text-muted' : ''}`}>{item.item}</span>
                </span>
                <span className={`whitespace-nowrap font-medium ${bought ? 'text-text-muted' : ''}`}>
                  {item.grams > 0 ? `${item.grams}g` : ''}
                  {item.ml > 0 ? `${item.ml}ml` : ''}
                </span>
              </motion.button>
            );
          })}
        </div>
      </Card>
    </div>
  );
}

import { useMemo, useState } from 'react';
import dayjs from 'dayjs';
import recipes from '../data/recipes';
import type { Diet, Macros } from '../types';
import { generateWeeklyPlan, scaledMacros } from '../lib/mealPlan';
import { buildShoppingList } from '../lib/shoppingList';
import Card from './Card';

export default function WeeklyPlanView({
  diets,
  targets,
  weeklyBudget,
}: {
  diets: Diet[];
  targets: Macros;
  weeklyBudget: number;
}) {
  const [expandedDay, setExpandedDay] = useState<string | null>(null);
  const today = dayjs().format('YYYY-MM-DD');

  const weekPlan = useMemo(() => generateWeeklyPlan(diets, targets, today), [diets, targets, today]);
  const shoppingList = useMemo(() => buildShoppingList(weekPlan), [weekPlan]);

  const overBudget = shoppingList.totalCost > weeklyBudget;
  const diff = Math.abs(shoppingList.totalCost - weeklyBudget).toFixed(2);

  return (
    <div className="space-y-4">
      <Card title="Weekly Grocery Budget" className="card-glow">
        <div className="flex items-baseline justify-between">
          <div>
            <div className="text-2xl font-bold">€{shoppingList.totalCost.toFixed(2)}</div>
            <div className="text-xs text-text-muted">estimated for this week's plan</div>
          </div>
          <div className="text-right">
            <div className="text-lg font-semibold text-text-muted">€{weeklyBudget.toFixed(2)}</div>
            <div className="text-xs text-text-muted">your budget</div>
          </div>
        </div>
        <div className="mt-3 h-2 overflow-hidden rounded-full bg-surface2">
          <div
            className="h-full rounded-full"
            style={{
              width: `${Math.min(100, (shoppingList.totalCost / Math.max(weeklyBudget, 1)) * 100)}%`,
              backgroundImage: overBudget
                ? 'linear-gradient(135deg, var(--color-warn), var(--color-accent))'
                : 'linear-gradient(135deg, var(--color-accent), var(--color-accent2))',
            }}
          />
        </div>
        <p className={`mt-2 text-xs ${overBudget ? 'text-warn' : 'text-success'}`}>
          {overBudget
            ? `€${diff} over budget — try swapping a few meals for cheaper diet options.`
            : `€${diff} under budget ✓`}
        </p>
      </Card>

      <h2 className="text-sm font-semibold uppercase tracking-wide text-text-muted">7-Day Plan</h2>
      <div className="space-y-2">
        {weekPlan.map(({ date, plan }) => {
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
            <div key={date} className="overflow-hidden rounded-xl border border-border bg-card">
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
                <span className="text-text-muted">{isOpen ? '▲' : '▼'}</span>
              </button>
              {isOpen && (
                <div className="space-y-2 border-t border-border px-4 py-3">
                  {plan.map((p, idx) => {
                    const r = recipes[p.recipeIdx];
                    if (!r) return null;
                    const m = scaledMacros(r, p.scale ?? 1);
                    return (
                      <div key={idx} className="flex items-center justify-between text-sm">
                        <span>{r.name}</span>
                        <span className="text-xs text-text-muted">{m.calories} kcal</span>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          );
        })}
      </div>

      <Card title={`Shopping List (${shoppingList.items.length} items)`}>
        <div className="grid grid-cols-2 gap-x-4 gap-y-1.5 text-sm">
          {shoppingList.items.map((item) => (
            <div key={item.item} className="flex justify-between border-b border-border pb-1">
              <span className="text-text-muted">{item.item}</span>
              <span className="font-medium">
                {item.grams > 0 ? `${item.grams}g` : ''}
                {item.ml > 0 ? `${item.ml}ml` : ''}
              </span>
            </div>
          ))}
        </div>
      </Card>
    </div>
  );
}

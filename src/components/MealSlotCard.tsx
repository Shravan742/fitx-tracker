import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import type { Recipe } from '../types';
import { scaledMacros } from '../lib/mealPlan';

const DIET_COLOR: Record<string, string> = {
  chicken: '#f59e0b',
  beef: '#ef4444',
  pork: '#f97316',
  fish: '#06b6d4',
  vegetarian: '#22c55e',
  vegan: '#84cc16',
};

export interface ServingSplit {
  name: string;
  servings: number;
}

export default function MealSlotCard({
  slotIcon,
  slotLabel,
  tgtCal,
  tgtPro,
  recipe,
  scale,
  isLogged,
  onSwap,
  onLog,
  servingSplit,
}: {
  slotIcon: string;
  slotLabel: string;
  tgtCal: number;
  tgtPro: number;
  recipe: Recipe;
  scale: number;
  isLogged: boolean;
  onSwap: () => void;
  onLog: () => void;
  servingSplit?: ServingSplit[];
}) {
  const [showDetails, setShowDetails] = useState(false);
  const m = scaledMacros(recipe, scale);
  const servingLabel = scale === 1 ? '1 serving' : scale < 1 ? `${scale}× serving` : `${scale}× servings`;

  return (
    <motion.div
      whileHover={{ y: -2 }}
      transition={{ type: 'spring', stiffness: 300, damping: 24 }}
      className={`overflow-hidden rounded-2xl border ${isLogged ? 'border-success/40' : 'border-border'} bg-card shadow-[0_4px_20px_-8px_rgba(0,0,0,0.4)]`}
    >
      <div className="flex items-center justify-between bg-surface2 px-4 py-2.5 text-sm">
        <span className="font-semibold text-accent2">
          {slotIcon} {slotLabel}
        </span>
        <span className="text-text-muted">
          ~{tgtCal} kcal · ~{tgtPro}g protein
        </span>
      </div>

      <div className="flex gap-3 p-3">
        <img
          src={recipe.photo}
          alt={recipe.name}
          className="h-20 w-20 flex-shrink-0 rounded-xl object-cover bg-surface2"
          loading="lazy"
          onError={(e) => (e.currentTarget.style.display = 'none')}
        />
        <div className="flex-1">
          <div className="font-semibold">{recipe.name}</div>
          <div className="mt-0.5 flex items-center gap-1.5 text-xs text-text-muted">
            <span className="h-2 w-2 rounded-full" style={{ background: DIET_COLOR[recipe.diet] || '#6366f1' }} />
            {recipe.cuisine} · {recipe.diet}
            {scale !== 1 && (
              <span className="rounded-full bg-accent px-1.5 py-0.5 text-[0.62rem] font-semibold text-bg">
                {servingLabel}
              </span>
            )}
          </div>
          <div className="mt-1.5 flex gap-2 text-xs text-text-muted">
            <span>🔥 {m.calories}</span>
            <span>💪 P{m.protein}g</span>
            <span>🌾 C{m.carbs}g</span>
            <span>🧈 F{m.fat}g</span>
          </div>
          {servingSplit && servingSplit.length > 0 && (
            <div className="mt-2 flex flex-wrap gap-1.5">
              {servingSplit.map((s) => (
                <span key={s.name} className="rounded-full bg-info/15 px-2 py-0.5 text-[0.68rem] font-medium text-info">
                  👤 {s.name}: {s.servings}×
                </span>
              ))}
            </div>
          )}
        </div>
      </div>

      <button
        className="w-full px-4 py-2 text-left text-xs font-medium text-text-muted hover:bg-surface2"
        onClick={() => setShowDetails((v) => !v)}
      >
        📋 Ingredients &amp; Instructions {showDetails ? '▲' : '▼'}
      </button>

      <AnimatePresence initial={false}>
        {showDetails && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.25, ease: [0.16, 1, 0.3, 1] }}
            className="overflow-hidden"
          >
            <div className="space-y-3 border-t border-border px-4 py-3 text-sm">
              <div>
                <strong className="text-xs">
                  Ingredients {scale !== 1 && <span className="text-text-muted">(scaled to {servingLabel})</span>}
                </strong>
                <ul className="mt-1 list-disc space-y-0.5 pl-5 text-text-muted">
                  {recipe.ingredients.map((i, idx) => {
                    const qty = Math.round((i.grams || i.ml || 0) * scale);
                    return (
                      <li key={idx}>
                        {qty}
                        {i.ml ? 'ml' : 'g'} {i.item}
                      </li>
                    );
                  })}
                </ul>
              </div>
              <div>
                <strong className="text-xs">Method</strong>
                <ol className="mt-1 list-decimal space-y-0.5 pl-5 text-text-muted">
                  {recipe.instructions.map((s, idx) => (
                    <li key={idx}>{s}</li>
                  ))}
                </ol>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      <div className="flex gap-2 px-4 pb-3">
        {isLogged ? (
          <motion.span
            initial={{ scale: 0.8, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            className="rounded-lg bg-success/15 px-3 py-1.5 text-xs font-semibold text-success"
          >
            ✓ Logged
          </motion.span>
        ) : (
          <>
            <button className="btn-secondary btn-sm" onClick={onSwap}>
              ↻ Swap
            </button>
            <button className="btn-primary btn-sm" onClick={onLog}>
              + Log this
            </button>
          </>
        )}
      </div>
    </motion.div>
  );
}

import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { suggestTopUp } from '../lib/customIngredients';
import { addMeal } from '../lib/firestoreDb';

export default function TopUpSuggestion({
  profileId,
  date,
  remaining,
  onLogged,
}: {
  profileId: string;
  date: string;
  remaining: { calories: number; protein: number };
  onLogged: () => void;
}) {
  const [logging, setLogging] = useState(false);
  const [logged, setLogged] = useState(false);

  const suggestion = suggestTopUp(remaining);
  if (!suggestion) return null;

  const handleLog = async () => {
    setLogging(true);
    try {
      await addMeal({
        profileId,
        date,
        name: `${suggestion.ingredient.name} (${suggestion.grams}g top-up)`,
        calories: suggestion.macros.calories,
        protein: suggestion.macros.protein,
        carbs: suggestion.macros.carbs,
        fat: suggestion.macros.fat,
        loggedAt: new Date().toISOString(),
      });
      setLogged(true);
      setTimeout(() => setLogged(false), 2500);
      onLogged();
    } finally {
      setLogging(false);
    }
  };

  return (
    <div className="mt-2 rounded-lg border border-accent/30 bg-accent/5 p-3">
      <div className="text-xs text-text-muted">
        Suggested top-up: <strong className="text-text">{suggestion.grams}g {suggestion.ingredient.name}</strong> — adds{' '}
        {suggestion.macros.calories}kcal · {suggestion.macros.protein}g protein
      </div>
      <button
        className="btn-primary btn-sm mt-2 w-full disabled:cursor-not-allowed"
        onClick={handleLog}
        disabled={logging}
      >
        {logging ? (
          <motion.span
            className="mx-auto inline-block h-3 w-3 rounded-full border-2 border-bg/40 border-t-bg"
            animate={{ rotate: 360 }}
            transition={{ duration: 0.7, repeat: Infinity, ease: 'linear' }}
          />
        ) : (
          '+ Log this top-up'
        )}
      </button>
      <AnimatePresence>
        {logged && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
            exit={{ opacity: 0, height: 0 }}
            className="mt-2 overflow-hidden rounded-lg bg-success/10 p-2 text-center text-xs text-success"
          >
            ✓ Logged
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

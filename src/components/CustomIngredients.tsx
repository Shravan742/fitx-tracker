import { useState } from 'react';
import dayjs from 'dayjs';
import { motion, AnimatePresence } from 'framer-motion';
import {
  getCustomIngredients,
  addCustomIngredient,
  updateCustomIngredient,
  deleteCustomIngredient,
  macrosForGrams,
  type CustomIngredient,
} from '../lib/customIngredients';
import { addMeal } from '../lib/db';
import Card from './Card';
import { StaggerList, StaggerItem } from './motion';

type BuilderRow = { ingredientId: string; grams: string };

export default function CustomIngredients({
  profileId,
  date,
  onLogged,
  onIngredientsChanged,
}: {
  profileId: string;
  date: string;
  onLogged: () => void;
  onIngredientsChanged?: () => void;
}) {
  const [ingredients, setIngredients] = useState<CustomIngredient[]>(getCustomIngredients);
  const [expanded, setExpanded] = useState(false);
  const [showAddForm, setShowAddForm] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [form, setForm] = useState({ name: '', kcal: '', protein: '', carbs: '', fat: '', price: '' });
  const [rows, setRows] = useState<BuilderRow[]>([]);
  const [mealName, setMealName] = useState('');
  const [logging, setLogging] = useState(false);
  const [logged, setLogged] = useState(false);

  const emptyForm = { name: '', kcal: '', protein: '', carbs: '', fat: '', price: '' };

  const startEdit = (ing: CustomIngredient) => {
    setEditingId(ing.id);
    setForm({
      name: ing.name,
      kcal: String(ing.kcalPer100),
      protein: String(ing.proteinPer100),
      carbs: String(ing.carbsPer100),
      fat: String(ing.fatPer100),
      price: ing.pricePer100 != null ? String(ing.pricePer100) : '',
    });
    setShowAddForm(true);
  };

  const handleSaveIngredient = (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.name.trim()) return;
    const payload = {
      name: form.name.trim(),
      kcalPer100: +form.kcal || 0,
      proteinPer100: +form.protein || 0,
      carbsPer100: +form.carbs || 0,
      fatPer100: +form.fat || 0,
      pricePer100: form.price ? +form.price : undefined,
    };
    if (editingId) {
      updateCustomIngredient(editingId, payload);
    } else {
      addCustomIngredient(payload);
    }
    setIngredients(getCustomIngredients());
    setForm(emptyForm);
    setEditingId(null);
    setShowAddForm(false);
    onIngredientsChanged?.();
  };

  const cancelForm = () => {
    setForm(emptyForm);
    setEditingId(null);
    setShowAddForm(false);
  };

  const handleDelete = (id: string) => {
    deleteCustomIngredient(id);
    setIngredients(getCustomIngredients());
    setRows((r) => r.filter((row) => row.ingredientId !== id));
    onIngredientsChanged?.();
  };

  const addRow = () => {
    if (!ingredients.length) return;
    setRows((r) => [...r, { ingredientId: ingredients[0].id, grams: '100' }]);
  };
  const updateRow = (i: number, patch: Partial<BuilderRow>) =>
    setRows((r) => r.map((row, idx) => (idx === i ? { ...row, ...patch } : row)));
  const removeRow = (i: number) => setRows((r) => r.filter((_, idx) => idx !== i));

  const totals = rows.reduce(
    (acc, row) => {
      const ing = ingredients.find((i) => i.id === row.ingredientId);
      if (!ing) return acc;
      const m = macrosForGrams(ing, parseFloat(row.grams) || 0);
      return {
        calories: acc.calories + m.calories,
        protein: acc.protein + m.protein,
        carbs: acc.carbs + m.carbs,
        fat: acc.fat + m.fat,
      };
    },
    { calories: 0, protein: 0, carbs: 0, fat: 0 },
  );

  const handleLog = async () => {
    if (!rows.length) return;
    setLogging(true);
    try {
      const names = rows
        .map((row) => ingredients.find((i) => i.id === row.ingredientId)?.name)
        .filter(Boolean)
        .join(', ');
      await addMeal({
        profileId,
        date,
        name: mealName.trim() || names || 'Custom mix',
        calories: Math.round(totals.calories),
        protein: Math.round(totals.protein),
        carbs: Math.round(totals.carbs),
        fat: Math.round(totals.fat),
        loggedAt: new Date(`${date}T${dayjs().format('HH:mm:ss')}`).toISOString(),
      });
      setRows([]);
      setMealName('');
      setLogged(true);
      setTimeout(() => setLogged(false), 2500);
      onLogged();
    } finally {
      setLogging(false);
    }
  };

  return (
    <Card title="🧪 Custom Ingredients & Meal Builder">
      <button
        type="button"
        className="flex w-full items-center justify-between text-left"
        onClick={() => setExpanded((v) => !v)}
      >
        <p className="text-xs text-text-muted">
          Add your real products (e.g. your brand of Quark) with their per-100g nutrition and price.
          {ingredients.length > 0 && !expanded ? ` ${ingredients.length} saved.` : ''}
        </p>
        <span className="ml-2 shrink-0 text-xs text-text-muted">{expanded ? '▲ Hide' : '▼ Show'}</span>
      </button>

      {expanded && (
        <div className="mt-3">
      {ingredients.length > 0 && (
        <StaggerList className="mb-3 space-y-1.5">
          {ingredients.map((ing) => (
            <StaggerItem key={ing.id}>
              <div className="flex items-center justify-between rounded-lg bg-surface2 px-3 py-2 text-sm">
                <div>
                  <span className="font-semibold">{ing.name}</span>
                  <span className="ml-2 text-xs text-text-muted">
                    {ing.kcalPer100}kcal · P{ing.proteinPer100}g · C{ing.carbsPer100}g · F{ing.fatPer100}g /100g
                    {ing.pricePer100 != null ? ` · €${ing.pricePer100.toFixed(2)}/100g` : ''}
                  </span>
                </div>
                <div className="flex shrink-0 items-center gap-3">
                  <button
                    type="button"
                    aria-label="Edit ingredient"
                    className="text-text-muted transition-colors hover:text-accent"
                    onClick={() => startEdit(ing)}
                  >
                    ✎
                  </button>
                  <button
                    type="button"
                    aria-label="Delete ingredient"
                    className="text-text-muted transition-colors hover:text-danger"
                    onClick={() => handleDelete(ing.id)}
                  >
                    ✕
                  </button>
                </div>
              </div>
            </StaggerItem>
          ))}
        </StaggerList>
      )}

      {showAddForm ? (
        <form onSubmit={handleSaveIngredient} className="mb-3 space-y-2 rounded-lg bg-surface2 p-3">
          {editingId && <div className="text-xs font-semibold uppercase tracking-wide text-accent">Editing ingredient</div>}
          <input
            className="input"
            placeholder="Name (e.g. Quark 0.2% — my brand)"
            value={form.name}
            onChange={(e) => setForm({ ...form, name: e.target.value })}
            required
          />
          <div className="grid grid-cols-2 gap-2">
            <label className="block">
              <span className="mb-1 block text-xs text-text-muted">kcal / 100g</span>
              <input
                type="number"
                min={0}
                className="input"
                value={form.kcal}
                onChange={(e) => setForm({ ...form, kcal: e.target.value })}
              />
            </label>
            <label className="block">
              <span className="mb-1 block text-xs text-text-muted">Protein / 100g</span>
              <input
                type="number"
                min={0}
                step={0.1}
                className="input"
                value={form.protein}
                onChange={(e) => setForm({ ...form, protein: e.target.value })}
              />
            </label>
            <label className="block">
              <span className="mb-1 block text-xs text-text-muted">Carbs / 100g</span>
              <input
                type="number"
                min={0}
                step={0.1}
                className="input"
                value={form.carbs}
                onChange={(e) => setForm({ ...form, carbs: e.target.value })}
              />
            </label>
            <label className="block">
              <span className="mb-1 block text-xs text-text-muted">Fat / 100g</span>
              <input
                type="number"
                min={0}
                step={0.1}
                className="input"
                value={form.fat}
                onChange={(e) => setForm({ ...form, fat: e.target.value })}
              />
            </label>
          </div>
          <label className="block">
            <span className="mb-1 block text-xs text-text-muted">Price per 100g (€, optional)</span>
            <input
              type="number"
              min={0}
              step={0.01}
              className="input"
              placeholder="e.g. 0.30"
              value={form.price}
              onChange={(e) => setForm({ ...form, price: e.target.value })}
            />
          </label>
          <div className="flex gap-2">
            <button type="submit" className="btn-primary btn-sm flex-1">
              {editingId ? 'Save changes' : 'Save ingredient'}
            </button>
            <button type="button" className="btn-secondary btn-sm" onClick={cancelForm}>
              Cancel
            </button>
          </div>
        </form>
      ) : (
        <button type="button" className="btn-secondary btn-sm mb-4 w-full" onClick={() => setShowAddForm(true)}>
          + Add an ingredient
        </button>
      )}

      {ingredients.length > 0 && (
        <div className="border-t border-border pt-3">
          <h5 className="mb-2 text-xs font-semibold uppercase tracking-wide text-text-muted">Build a meal from grams</h5>
          {rows.map((row, i) => {
            const ing = ingredients.find((x) => x.id === row.ingredientId);
            const m = ing ? macrosForGrams(ing, parseFloat(row.grams) || 0) : null;
            return (
              <div key={i} className="mb-2 grid grid-cols-[1fr_5rem_2rem] items-center gap-2">
                <select
                  className="input"
                  value={row.ingredientId}
                  onChange={(e) => updateRow(i, { ingredientId: e.target.value })}
                >
                  {ingredients.map((ing2) => (
                    <option key={ing2.id} value={ing2.id}>
                      {ing2.name}
                    </option>
                  ))}
                </select>
                <input
                  type="number"
                  min={0}
                  className="input"
                  value={row.grams}
                  onChange={(e) => updateRow(i, { grams: e.target.value })}
                />
                <button
                  type="button"
                  aria-label="Remove row"
                  className="text-text-muted transition-colors hover:text-danger"
                  onClick={() => removeRow(i)}
                >
                  ✕
                </button>
                {m && (
                  <div className="col-span-3 -mt-1 text-[0.65rem] text-text-muted">
                    {m.calories}kcal · P{m.protein}g · C{m.carbs}g · F{m.fat}g
                  </div>
                )}
              </div>
            );
          })}
          <button type="button" className="btn-secondary btn-sm mt-1" onClick={addRow}>
            + Add ingredient to meal
          </button>

          {rows.length > 0 && (
            <div className="mt-3 rounded-lg bg-surface2 p-3">
              <div className="mb-2 text-sm font-semibold">
                Total: {Math.round(totals.calories)}kcal · P{Math.round(totals.protein)}g · C{Math.round(totals.carbs)}g
                · F{Math.round(totals.fat)}g
              </div>
              <input
                className="input mb-2"
                placeholder="Meal name (optional)"
                value={mealName}
                onChange={(e) => setMealName(e.target.value)}
              />
              <button className="btn-primary w-full disabled:cursor-not-allowed" onClick={handleLog} disabled={logging}>
                {logging ? (
                  <motion.span
                    className="mx-auto inline-block h-3.5 w-3.5 rounded-full border-2 border-bg/40 border-t-bg"
                    animate={{ rotate: 360 }}
                    transition={{ duration: 0.7, repeat: Infinity, ease: 'linear' }}
                  />
                ) : (
                  '+ Log this meal'
                )}
              </button>
              <AnimatePresence>
                {logged && (
                  <motion.div
                    initial={{ opacity: 0, height: 0 }}
                    animate={{ opacity: 1, height: 'auto' }}
                    exit={{ opacity: 0, height: 0 }}
                    className="mt-2 overflow-hidden rounded-lg bg-success/10 p-2 text-center text-sm text-success"
                  >
                    ✓ Logged to today's meals
                  </motion.div>
                )}
              </AnimatePresence>
            </div>
          )}
        </div>
      )}
        </div>
      )}
    </Card>
  );
}

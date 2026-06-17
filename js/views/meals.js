import { db } from '../db.js';
import { getActiveProfile } from '../profiles.js';
import { getLiveMacros } from '../profiles.js';
import recipes from '../data/recipes.js';

export async function renderMeals(profile) {
  const el   = document.getElementById('view-meals');
  const pid  = getActiveProfile();
  const today = dayjs().format('YYYY-MM-DD');
  const macros = getLiveMacros(profile);

  const todayMeals = await db.getAllFromIndex('meals', 'by-profile-date', IDBKeyRange.only([pid, today]));
  const eaten = todayMeals.reduce((a, m) => ({
    calories: a.calories + (m.calories||0),
    protein:  a.protein  + (m.protein ||0),
    carbs:    a.carbs    + (m.carbs   ||0),
    fat:      a.fat      + (m.fat     ||0),
  }), { calories:0, protein:0, carbs:0, fat:0 });

  const remaining = macros ? {
    calories: macros.calories - eaten.calories,
    protein:  macros.protein  - eaten.protein,
    carbs:    macros.carbs    - eaten.carbs,
    fat:      macros.fat      - eaten.fat,
  } : { calories: 9999, protein: 9999, carbs: 9999, fat: 9999 };

  // Filter recipes that fit remaining budget
  const fitting = recipes.filter(r =>
    r.macros.calories <= remaining.calories + 50 &&
    r.macros.protein  <= remaining.protein  + 10
  ).slice(0, 4);

  el.innerHTML = `
    <h2>Meals</h2>

    <div class="card">
      <div class="card-title">Log a meal</div>
      <div class="form-group"><label>Name</label><input id="meal-name" placeholder="e.g. Protein shake" /></div>
      <div style="display:grid;grid-template-columns:repeat(2,1fr);gap:8px">
        <div class="form-group"><label>Calories</label><input id="meal-cal" type="number" min="0"/></div>
        <div class="form-group"><label>Protein (g)</label><input id="meal-pro" type="number" min="0" step="0.1"/></div>
        <div class="form-group"><label>Carbs (g)</label><input id="meal-carb" type="number" min="0" step="0.1"/></div>
        <div class="form-group"><label>Fat (g)</label><input id="meal-fat" type="number" min="0" step="0.1"/></div>
      </div>
      <button class="btn btn-primary btn-full mt-8" id="log-meal-btn">Log meal</button>
    </div>

    <div class="card">
      <div class="card-title">Today's log</div>
      ${todayMeals.length ? `
        <ul class="item-list">
          ${todayMeals.map(m => `
            <li>
              <div><div style="font-weight:600">${m.name}</div>
              <div class="text-muted">${m.protein}g P · ${m.carbs}g C · ${m.fat}g F</div></div>
              <span style="font-weight:700">${m.calories} kcal</span>
            </li>`).join('')}
        </ul>
        <div style="margin-top:10px;font-weight:700;text-align:right">${eaten.calories} kcal total</div>
      ` : '<p class="text-muted">Nothing logged yet.</p>'}
    </div>

    ${fitting.length ? `
    <div class="card">
      <div class="card-title">Recipe suggestions (fits your remaining budget)</div>
      ${fitting.map(r => `
        <div style="background:var(--surface2);border-radius:8px;padding:12px;margin-bottom:8px">
          <div style="font-weight:600">${r.name}</div>
          <div class="text-muted" style="font-size:0.8rem;margin:4px 0">${r.cuisine} · ${r.macros.calories} kcal · ${r.macros.protein}g protein</div>
          <button class="btn btn-secondary" style="font-size:0.75rem;padding:5px 12px" data-recipe="${r.name}">Add this meal</button>
        </div>`).join('')}
    </div>` : ''}
  `;

  document.getElementById('log-meal-btn').onclick = async () => {
    const name     = document.getElementById('meal-name').value.trim() || 'Meal';
    const calories = +document.getElementById('meal-cal').value  || 0;
    const protein  = +document.getElementById('meal-pro').value  || 0;
    const carbs    = +document.getElementById('meal-carb').value || 0;
    const fat      = +document.getElementById('meal-fat').value  || 0;
    await db.put('meals', { profileId: pid, date: today, name, calories, protein, carbs, fat, loggedAt: new Date().toISOString() });
    renderMeals(profile);
  };

  el.querySelectorAll('[data-recipe]').forEach(btn => {
    btn.onclick = async () => {
      const r = recipes.find(x => x.name === btn.dataset.recipe);
      if (!r) return;
      await db.put('meals', { profileId: pid, date: today, name: r.name,
        calories: r.macros.calories, protein: r.macros.protein,
        carbs: r.macros.carbs, fat: r.macros.fat, loggedAt: new Date().toISOString() });
      renderMeals(profile);
    };
  });
}

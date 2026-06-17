import { db } from '../db.js';
import { getActiveProfile, getLiveMacros } from '../profiles.js';
import recipes from '../data/recipes.js';

// Emoji placeholders per recipe — no external images needed
const RECIPE_EMOJI = {
  'Dal Tadka with Rice': '🍛',
  'Chicken Tikka (High Protein)': '🍗',
  'Paneer Bhurji': '🧀',
  'Egg White Omelette (Cutting)': '🍳',
  'Moong Dal Chilla': '🥞',
  'Rajma (Kidney Bean Curry)': '🫘',
  'Curd Rice (Recovery)': '🍚',
  'Sprouts Salad (Pre-workout)': '🥗',
};

export async function renderMeals(profile) {
  const el    = document.getElementById('view-meals');
  const pid   = getActiveProfile();
  const today = dayjs().format('YYYY-MM-DD');
  const macros = getLiveMacros(profile);

  const todayMeals = await db.getAllFromIndex('meals', 'by-profile-date', IDBKeyRange.only([pid, today]));
  const eaten = todayMeals.reduce((a, m) => ({
    calories: a.calories + (m.calories || 0),
    protein:  a.protein  + (m.protein  || 0),
    carbs:    a.carbs    + (m.carbs    || 0),
    fat:      a.fat      + (m.fat      || 0),
  }), { calories: 0, protein: 0, carbs: 0, fat: 0 });

  const remaining = macros
    ? { calories: macros.calories - eaten.calories, protein: macros.protein - eaten.protein,
        carbs: macros.carbs - eaten.carbs, fat: macros.fat - eaten.fat }
    : null;

  // Split recipes: fits budget vs all others
  const fitsNow = remaining
    ? recipes.filter(r => r.macros.calories <= remaining.calories + 50 && r.macros.protein <= remaining.protein + 10)
    : [];
  const otherRecipes = recipes.filter(r => !fitsNow.includes(r));

  el.innerHTML = `
    <h2>Meals</h2>

    <!-- Quick log -->
    <div class="card">
      <div class="card-title">Log a meal manually</div>
      <div class="form-group"><label>Name</label><input id="meal-name" placeholder="e.g. Protein shake" /></div>
      <div style="display:grid;grid-template-columns:repeat(2,1fr);gap:8px">
        <div class="form-group"><label>Calories</label><input id="meal-cal" type="number" min="0" placeholder="0"/></div>
        <div class="form-group"><label>Protein (g)</label><input id="meal-pro" type="number" min="0" step="0.1" placeholder="0"/></div>
        <div class="form-group"><label>Carbs (g)</label><input id="meal-carb" type="number" min="0" step="0.1" placeholder="0"/></div>
        <div class="form-group"><label>Fat (g)</label><input id="meal-fat" type="number" min="0" step="0.1" placeholder="0"/></div>
      </div>
      <button class="btn btn-primary btn-full mt-8" id="log-meal-btn">+ Log meal</button>
    </div>

    <!-- Today's log -->
    <div class="card">
      <div class="card-title">Today's food log</div>
      ${todayMeals.length === 0
        ? '<p class="text-muted">Nothing logged yet today.</p>'
        : `<ul class="item-list">
            ${todayMeals.map((m, i) => `
              <li>
                <div>
                  <div style="font-weight:600">${m.name}</div>
                  <div class="text-muted" style="font-size:0.8rem">${m.protein}g P · ${m.carbs}g C · ${m.fat}g F</div>
                </div>
                <div style="text-align:right">
                  <div style="font-weight:700">${m.calories} kcal</div>
                  <button class="btn btn-secondary" style="font-size:0.7rem;padding:2px 8px;margin-top:4px" data-del="${i}">remove</button>
                </div>
              </li>`).join('')}
          </ul>
          <div style="margin-top:10px;display:flex;justify-content:space-between;font-weight:700;padding:8px 0;border-top:1px solid var(--surface2)">
            <span>Total</span>
            <span>${eaten.calories} kcal · ${eaten.protein}g P</span>
          </div>`}
      ${macros ? `
        <div class="progress-bar" style="margin-top:6px">
          <div class="progress-fill" style="width:${Math.min(100, Math.round(eaten.calories / macros.calories * 100))}%;background:var(--accent)"></div>
        </div>
        <div style="display:flex;justify-content:space-between;font-size:0.75rem;color:var(--text-muted);margin-top:4px">
          <span>${eaten.calories} eaten</span>
          <span>${Math.max(0, macros.calories - eaten.calories)} remaining</span>
        </div>` : ''}
    </div>

    <!-- Recipes that fit remaining budget -->
    ${fitsNow.length > 0 ? `
    <div class="card">
      <div class="card-title" style="color:var(--success)">✓ Fits your remaining budget</div>
      <div style="display:flex;flex-direction:column;gap:10px">
        ${fitsNow.map(r => recipeCard(r, true)).join('')}
      </div>
    </div>` : ''}

    <!-- Full recipe library -->
    <div class="card">
      <div class="card-title">Recipe library (${recipes.length} recipes)</div>
      <div style="display:flex;flex-direction:column;gap:10px">
        ${(fitsNow.length > 0 ? otherRecipes : recipes).map(r => recipeCard(r, false)).join('')}
      </div>
    </div>
  `;

  // Log meal
  document.getElementById('log-meal-btn').onclick = async () => {
    const name     = document.getElementById('meal-name').value.trim() || 'Meal';
    const calories = +document.getElementById('meal-cal').value  || 0;
    const protein  = +document.getElementById('meal-pro').value  || 0;
    const carbs    = +document.getElementById('meal-carb').value || 0;
    const fat      = +document.getElementById('meal-fat').value  || 0;
    await db.put('meals', { profileId: pid, date: today, name, calories, protein, carbs, fat, loggedAt: new Date().toISOString() });
    renderMeals(profile);
  };

  // Remove meal
  el.querySelectorAll('[data-del]').forEach(btn => {
    btn.onclick = async () => {
      const meal = todayMeals[+btn.dataset.del];
      if (meal?.id) await db.delete('meals', meal.id);
      renderMeals(profile);
    };
  });

  // Add recipe as meal
  el.querySelectorAll('[data-add-recipe]').forEach(btn => {
    btn.onclick = async () => {
      const r = recipes.find(x => x.name === btn.dataset.addRecipe);
      if (!r) return;
      await db.put('meals', {
        profileId: pid, date: today, name: r.name,
        calories: r.macros.calories, protein: r.macros.protein,
        carbs: r.macros.carbs, fat: r.macros.fat,
        loggedAt: new Date().toISOString(),
      });
      renderMeals(profile);
    };
  });

  // Toggle recipe instructions
  el.querySelectorAll('[data-toggle-recipe]').forEach(btn => {
    btn.onclick = () => {
      const key   = btn.dataset.toggleRecipe;
      const panel = document.getElementById(`recipe-detail-${key}`);
      const open  = panel.style.display !== 'none';
      panel.style.display = open ? 'none' : 'block';
      btn.textContent = open ? 'View recipe ▾' : 'Hide ▴';
    };
  });
}

function recipeCard(r, highlight) {
  const emoji = RECIPE_EMOJI[r.name] || '🍽️';
  const key   = r.name.replace(/\s+/g, '-');
  return `
    <div style="background:var(--surface2);border-radius:10px;overflow:hidden${highlight ? ';border:1px solid var(--success)44' : ''}">
      <!-- Photo placeholder -->
      <div style="background:linear-gradient(135deg,var(--surface2),var(--surface));height:80px;display:flex;align-items:center;justify-content:space-between;padding:0 16px">
        <span style="font-size:2.8rem">${emoji}</span>
        <div style="text-align:right">
          <div style="font-size:0.7rem;color:var(--text-muted);text-transform:uppercase">${r.cuisine}</div>
          <div style="font-size:1.1rem;font-weight:700;color:var(--accent)">${r.macros.calories} kcal</div>
        </div>
      </div>
      <!-- Info -->
      <div style="padding:12px">
        <div style="font-weight:700;margin-bottom:6px">${r.name}</div>
        <div style="display:flex;gap:12px;font-size:0.8rem;margin-bottom:10px">
          <span><strong style="color:#64b5f6">${r.macros.protein}g</strong> <span class="text-muted">protein</span></span>
          <span><strong style="color:var(--accent2)">${r.macros.carbs}g</strong> <span class="text-muted">carbs</span></span>
          <span><strong style="color:#ce93d8">${r.macros.fat}g</strong> <span class="text-muted">fat</span></span>
        </div>
        <!-- Ingredients summary -->
        <div style="font-size:0.75rem;color:var(--text-muted);margin-bottom:10px">
          ${r.ingredients.slice(0, 3).map(i => `${i.item} (${i.grams || i.ml}${i.ml ? 'ml' : 'g'})`).join(' · ')}${r.ingredients.length > 3 ? ` · +${r.ingredients.length - 3} more` : ''}
        </div>
        <div style="display:flex;gap:8px">
          <button class="btn btn-secondary" style="font-size:0.75rem;padding:5px 12px;flex:1" data-toggle-recipe="${key}">View recipe ▾</button>
          <button class="btn btn-primary" style="font-size:0.75rem;padding:5px 14px" data-add-recipe="${r.name}">+ Log</button>
        </div>
        <!-- Expandable detail -->
        <div id="recipe-detail-${key}" style="display:none;margin-top:12px">
          <div style="font-size:0.8rem;font-weight:600;margin-bottom:6px">Ingredients</div>
          <ul style="list-style:none;font-size:0.8rem;margin-bottom:10px">
            ${r.ingredients.map(i => `<li style="padding:3px 0;border-bottom:1px solid var(--bg)">${i.item} — <strong>${i.grams || i.ml}${i.ml ? 'ml' : 'g'}</strong></li>`).join('')}
          </ul>
          <div style="font-size:0.8rem;font-weight:600;margin-bottom:6px">Steps</div>
          <ol style="font-size:0.8rem;padding-left:16px">
            ${r.instructions.map(step => `<li style="margin-bottom:5px">${step}</li>`).join('')}
          </ol>
        </div>
      </div>
    </div>`;
}

import { db } from '../db.js';
import { calcMacros } from '../macros.js';
import recipes from '../data/recipes.js';

const DIET_LABELS = {
  chicken:    { label: 'Chicken',    icon: '🍗' },
  beef:       { label: 'Beef',       icon: '🥩' },
  pork:       { label: 'Pork',       icon: '🐷' },
  fish:       { label: 'Fish',       icon: '🐟' },
  vegetarian: { label: 'Vegetarian', icon: '🥗' },
  vegan:      { label: 'Vegan',      icon: '🌱' },
};

const DIET_PROTEIN_MODIFIER = { vegan: 1.15, vegetarian: 1.10 };

const MEAL_SLOTS = [
  { key: 'breakfast', label: 'Breakfast',     icon: '🌅', ratio: 0.28, types: ['breakfast'] },
  { key: 'lunch',     label: 'Lunch',         icon: '☀️', ratio: 0.35, types: ['lunch', 'any'] },
  { key: 'snack',     label: 'Evening Snack', icon: '🍎', ratio: 0.09, types: ['snack'] },
  { key: 'dinner',    label: 'Dinner',        icon: '🌙', ratio: 0.28, types: ['dinner', 'any'] },
];

function getActiveDiets(profile) {
  if (Array.isArray(profile.dietPreferences)) return profile.dietPreferences;
  if (profile.dietPreference && profile.dietPreference !== 'all') return [profile.dietPreference];
  return [];
}

function getPlanKey(profileId, date, diets, targets) {
  const macroSig = targets ? `_${targets.calories}` : '';
  return `fitx_plan_v5_${profileId}_${date}_${[...diets].sort().join(',') || 'all'}${macroSig}`;
}

function getFiltered(diets) {
  if (!diets.length) return recipes;
  if (diets.includes('vegetarian') && !diets.includes('vegan')) {
    return recipes.filter(r => diets.includes(r.diet) || r.diet === 'vegan');
  }
  return recipes.filter(r => diets.includes(r.diet));
}

// For snack slots: pick closest to target. For main meals: pick highest calorie available.
function scaleFor(r, tgtCal) {
  // Round to nearest 0.25 serving, clamp 0.5–3.0
  const raw = tgtCal / Math.max(r.macros.calories, 1);
  return Math.min(3.0, Math.max(0.5, Math.round(raw * 4) / 4));
}

function scaledMacros(r, scale) {
  return {
    calories: Math.round(r.macros.calories * scale),
    protein:  Math.round(r.macros.protein  * scale),
    carbs:    Math.round(r.macros.carbs    * scale),
    fat:      Math.round(r.macros.fat      * scale),
  };
}

function generatePlan(diets, targets) {
  const pool     = getFiltered(diets);
  const totalCal = targets?.calories || 2000;
  const totalPro = targets?.protein  || 100;
  const used = new Set();

  return MEAL_SLOTS.map(slot => {
    const isSnack = slot.key === 'snack';
    const tgtCal  = Math.round(totalCal * slot.ratio);
    const tgtPro  = Math.round(totalPro * slot.ratio);

    const typed    = pool.filter(r => slot.types.includes(r.mealType) && !used.has(r));
    const fallback = pool.filter(r => !used.has(r));
    const candidates = typed.length ? typed : fallback;

    // Score by combined calorie + protein error after scaling
    const pick = candidates.slice().sort((a, b) => {
      const scaleA = isSnack ? Math.min(1, scaleFor(a, tgtCal)) : scaleFor(a, tgtCal);
      const scaleB = isSnack ? Math.min(1, scaleFor(b, tgtCal)) : scaleFor(b, tgtCal);
      const calErrA = Math.abs(a.macros.calories * scaleA - tgtCal) / tgtCal;
      const proErrA = Math.abs(a.macros.protein  * scaleA - tgtPro) / Math.max(tgtPro, 1);
      const calErrB = Math.abs(b.macros.calories * scaleB - tgtCal) / tgtCal;
      const proErrB = Math.abs(b.macros.protein  * scaleB - tgtPro) / Math.max(tgtPro, 1);
      return (calErrA + proErrA) - (calErrB + proErrB);
    })[0];

    const scale = pick
      ? (isSnack ? Math.min(1, scaleFor(pick, tgtCal)) : scaleFor(pick, tgtCal))
      : 1;

    if (pick) used.add(pick);
    return { slotKey: slot.key, recipeIdx: pick ? recipes.indexOf(pick) : 0, scale };
  });
}

function loadPlan(profileId, date, diets, targets) {
  const key = getPlanKey(profileId, date, diets, targets);
  try {
    const saved = JSON.parse(localStorage.getItem(key));
    if (saved && saved.length === MEAL_SLOTS.length) return saved;
  } catch {}
  const plan = generatePlan(diets, targets);
  localStorage.setItem(key, JSON.stringify(plan));
  return plan;
}

async function getYesterdaySurplus(profileId, baseTargets) {
  const yesterday = dayjs().subtract(1, 'day').format('YYYY-MM-DD');
  const logs = await db.getAllFromIndex('meals', 'by-profile-date', IDBKeyRange.only([profileId, yesterday]));
  if (!logs.length) return null;
  const eaten = logs.reduce((a, m) => ({
    calories: a.calories + (m.calories || 0),
    protein:  a.protein  + (m.protein  || 0),
    carbs:    a.carbs    + (m.carbs    || 0),
    fat:      a.fat      + (m.fat      || 0),
  }), { calories: 0, protein: 0, carbs: 0, fat: 0 });
  return {
    calories: eaten.calories - baseTargets.calories,
    protein:  eaten.protein  - baseTargets.protein,
    carbs:    eaten.carbs    - baseTargets.carbs,
    fat:      eaten.fat      - baseTargets.fat,
    eaten,
  };
}

function adjustTargetsForSurplus(targets, surplus) {
  if (!surplus) return targets;
  const cap = 0.25; // max ±25% adjustment
  const adj = (base, delta) => Math.round(Math.max(base * (1 - cap), Math.min(base * (1 + cap), base - delta)));
  return {
    ...targets,
    calories: adj(targets.calories, surplus.calories),
    protein:  adj(targets.protein,  surplus.protein),
    carbs:    adj(targets.carbs,     surplus.carbs),
    fat:      adj(targets.fat,       surplus.fat),
  };
}

function swapSlot(profileId, date, diets, slotIdx, targets) {
  const key  = getPlanKey(profileId, date, diets, targets);
  const plan = loadPlan(profileId, date, diets, targets);
  const pool = getFiltered(diets);
  const slot = MEAL_SLOTS[slotIdx];

  const currentGIdx = plan[slotIdx].recipeIdx;

  // Build ordered candidate list: typed matches first, then anything else — all excluding current
  const byType = pool
    .map(r => ({ r, gi: recipes.indexOf(r) }))
    .filter(x => slot.types.includes(x.r.mealType) && x.gi !== currentGIdx);
  const others = pool
    .map(r => ({ r, gi: recipes.indexOf(r) }))
    .filter(x => !slot.types.includes(x.r.mealType) && x.gi !== currentGIdx);
  const candidates = [...byType, ...others];

  // Track swap cycle position per slot
  const cycleKey = `${key}_swapIdx_${slotIdx}`;
  const cycleIdx = ((parseInt(localStorage.getItem(cycleKey) || '0', 10)) % Math.max(candidates.length, 1));
  const pick = candidates[cycleIdx];

  if (pick) {
    const tgtCal  = Math.round((targets?.calories || 2000) * slot.ratio);
    const isSnack = slot.key === 'snack';
    const newScale = isSnack
      ? Math.min(1, scaleFor(pick.r, tgtCal))
      : scaleFor(pick.r, tgtCal);
    plan[slotIdx].recipeIdx = pick.gi;
    plan[slotIdx].scale     = newScale;
    localStorage.setItem(cycleKey, String(cycleIdx + 1));
  }
  localStorage.setItem(key, JSON.stringify(plan));
  return plan;
}

export async function renderMeals(profile) {
  const el = document.getElementById('view-meals');
  if (!el) return;

  const today      = new Date().toISOString().split('T')[0];
  const profileId  = profile.id;
  const activeDiets = getActiveDiets(profile);

  const todayMeals = (await db.getAllFromIndex('meals', 'by-profile-date',
    IDBKeyRange.bound([profileId, today], [profileId, today + '￿']))) || [];

  const baseTargets = profile.onboardingDone ? calcMacros(profile) : null;

  if (baseTargets) {
    let mod = 1;
    if (activeDiets.length) {
      if (activeDiets.every(d => d === 'vegan')) mod = DIET_PROTEIN_MODIFIER.vegan;
      else if (activeDiets.every(d => ['vegan','vegetarian'].includes(d))) mod = DIET_PROTEIN_MODIFIER.vegetarian;
    }
    if (mod !== 1) baseTargets.protein = Math.round(baseTargets.protein * mod);
  }

  const surplus   = baseTargets ? await getYesterdaySurplus(profileId, baseTargets) : null;
  const targets   = baseTargets ? adjustTargetsForSurplus(baseTargets, surplus) : null;

  const eaten = todayMeals.reduce((a, m) => ({
    calories: a.calories + (m.calories || 0),
    protein:  a.protein  + (m.protein  || 0),
    carbs:    a.carbs    + (m.carbs    || 0),
    fat:      a.fat      + (m.fat      || 0),
  }), { calories: 0, protein: 0, carbs: 0, fat: 0 });

  const remaining = targets ? {
    calories: targets.calories - eaten.calories,
    protein:  targets.protein  - eaten.protein,
    carbs:    targets.carbs    - eaten.carbs,
    fat:      targets.fat      - eaten.fat,
  } : null;

  const plan = targets ? loadPlan(profileId, today, activeDiets, targets) : null;
  const loggedNames = new Set(todayMeals.map(m => m.name));

  // Compute plan totals using scaled macros
  let planTotals = { calories: 0, protein: 0, carbs: 0, fat: 0 };
  if (plan) {
    plan.forEach(p => {
      const r = recipes[p.recipeIdx];
      if (r) {
        const m = scaledMacros(r, p.scale ?? 1);
        planTotals.calories += m.calories;
        planTotals.protein  += m.protein;
        planTotals.carbs    += m.carbs;
        planTotals.fat      += m.fat;
      }
    });
  }

  const dietNoteHtml = activeDiets.length
    ? `<p class="diet-note">${activeDiets.map(d => DIET_LABELS[d]?.icon || '').join('')} Filtered by <strong>${activeDiets.map(d => DIET_LABELS[d]?.label).join(' + ')}</strong></p>`
    : '';

  el.innerHTML = `
    <div class="view-header">
      <h2>Meals</h2>
      <button class="btn-icon" id="add-meal-btn" title="Log custom meal">＋</button>
    </div>

    ${targets ? `
    <div class="card macro-summary">
      <div class="macro-row">
        <div class="macro-col">
          <span class="macro-val">${eaten.calories}</span>
          <span class="macro-lbl">eaten kcal</span>
        </div>
        <div class="macro-col">
          <span class="macro-val ${(remaining?.calories ?? 0) < 0 ? 'over' : ''}">
            ${Math.abs(remaining?.calories ?? 0)}
          </span>
          <span class="macro-lbl">${(remaining?.calories ?? 1) < 0 ? 'over' : 'remaining'} kcal</span>
        </div>
        <div class="macro-col">
          <span class="macro-val">${targets.calories}</span>
          <span class="macro-lbl">target kcal</span>
        </div>
      </div>
      <div class="macro-bars">
        ${macroBar('Protein', eaten.protein, targets.protein, '#4ade80')}
        ${macroBar('Carbs',   eaten.carbs,   targets.carbs,   '#60a5fa')}
        ${macroBar('Fat',     eaten.fat,      targets.fat,     '#f59e0b')}
      </div>
      ${dietNoteHtml}
    </div>` : `
    <div class="card info-card">
      <p>Complete your profile to see macro targets and a daily meal plan.</p>
    </div>`}

    <!-- Diet filter (multi-select) -->
    <div class="diet-filter">
      <p class="diet-filter-hint">Select one or more — tap again to deselect</p>
      <div class="diet-pills-row">
        <button class="diet-pill ${!activeDiets.length ? 'active' : ''}" data-diet="all">🍽️ All</button>
        ${Object.entries(DIET_LABELS).map(([key, val]) => `
          <button class="diet-pill ${activeDiets.includes(key) ? 'active' : ''}" data-diet="${key}">
            ${val.icon} ${val.label}
          </button>`).join('')}
      </div>
    </div>

    ${plan ? `
    <!-- Plan macro totals vs target -->
    <div class="card plan-totals-card plan-summary">
      <div class="plan-totals-row">
        <div class="plan-totals-col">
          <span class="plan-totals-label">TODAY'S PLAN</span>
          <span class="plan-totals-value">${planTotals.calories} kcal · ${planTotals.protein}g protein</span>
        </div>
        <div class="plan-totals-col">
          <span class="plan-totals-label">YOUR TARGET</span>
          <span class="plan-totals-value">${targets.calories} kcal · ${targets.protein}g protein</span>
        </div>
      </div>
      <div class="plan-totals-bar-wrap">
        <div class="plan-totals-bar" style="width:${Math.min(100, Math.round(planTotals.calories / targets.calories * 100))}%"></div>
      </div>
      <p class="plan-totals-note">
        ${planTotals.calories >= targets.calories * 0.9
          ? '✓ Plan covers your daily target'
          : `Plan covers ${Math.round(planTotals.calories / targets.calories * 100)}% of calories — log extra snacks to reach your target`}
      </p>
      ${surplus ? (() => {
        const parts = [];
        if (Math.abs(surplus.calories) > 50)
          parts.push(`${surplus.calories > 0 ? surplus.calories + ' kcal over' : Math.abs(surplus.calories) + ' kcal under'} yesterday`);
        if (Math.abs(surplus.protein) > 5)
          parts.push(`${surplus.protein > 0 ? surplus.protein + 'g protein surplus' : Math.abs(surplus.protein) + 'g protein deficit'}`);
        return parts.length
          ? `<p class="carryover-note">↩ Adjusted for yesterday: ${parts.join(' · ')}</p>`
          : '';
      })() : ''}
    </div>

    <!-- TODAY'S MEAL PLAN — each slot with full recipe details -->
    <h3 class="section-title-standalone">Today's Meal Plan</h3>
    ${MEAL_SLOTS.map((slot, slotIdx) => {
      const p        = plan[slotIdx];
      const r        = recipes[p.recipeIdx];
      if (!r) return '';
      const scale    = p.scale ?? 1;
      const m        = scaledMacros(r, scale);
      const isLogged = loggedNames.has(r.name);
      const tgtCal   = Math.round(targets.calories * slot.ratio);
      const tgtPro   = Math.round(targets.protein  * slot.ratio);
      const dietColor = {
        chicken:'#f59e0b', beef:'#ef4444', pork:'#f97316',
        fish:'#06b6d4', vegetarian:'#22c55e', vegan:'#84cc16',
      }[r.diet] || '#6366f1';
      const servingLabel = scale === 1 ? '1 serving'
        : scale < 1 ? `${scale}× serving`
        : `${scale}× servings`;

      return `
      <div class="meal-slot-card ${isLogged ? 'logged' : ''}">
        <div class="meal-slot-header">
          <span class="meal-slot-icon-label">${slot.icon} ${slot.label}</span>
          <span class="meal-slot-targets">~${tgtCal} kcal · ~${tgtPro}g protein</span>
        </div>

        <div class="meal-slot-body">
          <div class="meal-slot-photo-wrap">
            <img class="meal-slot-photo" src="${r.photo}" alt="${r.name}" loading="lazy"
              onerror="this.style.display='none'" />
          </div>
          <div class="meal-slot-info">
            <div class="meal-slot-name">${r.name}</div>
            <div class="meal-slot-cuisine">
              <span class="diet-dot" style="background:${dietColor}"></span>
              ${r.cuisine} · ${r.diet}
              ${scale !== 1 ? `<span class="serving-badge">${servingLabel}</span>` : ''}
            </div>
            <div class="meal-slot-macros">
              <span>🔥 ${m.calories}</span>
              <span>💪 P${m.protein}g</span>
              <span>🌾 C${m.carbs}g</span>
              <span>🧈 F${m.fat}g</span>
            </div>
          </div>
        </div>

        <details class="recipe-details-inline">
          <summary class="recipe-details-toggle">📋 Ingredients &amp; Instructions</summary>
          <div class="recipe-details-body">
            <div class="recipe-section">
              <strong>Ingredients${scale !== 1 ? ` <span class="serving-note">(scaled to ${servingLabel})</span>` : ''}</strong>
              <ul class="recipe-ingredients-list">
                ${r.ingredients.map(i => {
                  const qty = Math.round((i.grams || i.ml) * scale);
                  return `<li>${qty}${i.ml ? 'ml' : 'g'} ${i.item}</li>`;
                }).join('')}
              </ul>
            </div>
            <div class="recipe-section">
              <strong>Method</strong>
              <ol class="recipe-steps-list">
                ${r.instructions.map(s => `<li>${s}</li>`).join('')}
              </ol>
            </div>
          </div>
        </details>

        <div class="meal-slot-actions">
          ${isLogged
            ? `<span class="logged-badge">✓ Logged</span>`
            : `<button class="btn-secondary sm" data-swap="${slotIdx}">↻ Swap</button>
               <button class="btn-primary sm" data-log-plan="${slotIdx}">+ Log this</button>`}
        </div>
      </div>`;
    }).join('')}` : ''}

    <!-- Today's logged meals -->
    ${todayMeals.length ? `
    <div class="card">
      <h3 class="section-title">Today's Log</h3>
      <div class="meal-list">
        ${todayMeals.map(m => `
          <div class="meal-item">
            <div class="meal-info">
              <strong>${m.name}</strong>
              <span class="meal-macros">${m.calories} kcal · P${m.protein}g · C${m.carbs}g · F${m.fat}g</span>
            </div>
            <button class="btn-icon danger" data-del="${m.id}">✕</button>
          </div>`).join('')}
      </div>
    </div>` : ''}

    <!-- Custom meal form -->
    <div id="meal-form-wrap" class="card hidden">
      <h3 class="section-title">Log Custom Meal</h3>
      <form id="meal-form">
        <label>Meal name<input name="name" type="text" placeholder="e.g. Protein bar" required /></label>
        <div class="form-row">
          <label>Calories<input name="calories" type="number" min="0" required /></label>
          <label>Protein (g)<input name="protein" type="number" min="0" required /></label>
        </div>
        <div class="form-row">
          <label>Carbs (g)<input name="carbs" type="number" min="0" required /></label>
          <label>Fat (g)<input name="fat" type="number" min="0" required /></label>
        </div>
        <div class="form-row">
          <button type="submit" class="btn-primary">Save</button>
          <button type="button" id="cancel-meal-btn" class="btn-secondary">Cancel</button>
        </div>
      </form>
    </div>
  `;

  // Diet filter — multi-select
  el.querySelectorAll('.diet-pill').forEach(pill => {
    pill.addEventListener('click', async () => {
      const diet = pill.dataset.diet;
      let diets  = [...getActiveDiets(profile)];
      if (diet === 'all') {
        diets = [];
      } else {
        const idx = diets.indexOf(diet);
        if (idx >= 0) diets.splice(idx, 1);
        else diets.push(diet);
      }
      profile.dietPreferences = diets;
      delete profile.dietPreference;
      await db.put('profiles', profile);
      renderMeals(profile);
    });
  });

  // Swap
  el.querySelectorAll('[data-swap]').forEach(btn => {
    btn.addEventListener('click', () => {
      swapSlot(profileId, today, activeDiets, +btn.dataset.swap, targets);
      renderMeals(profile);
    });
  });

  // Log plan slot — use scaled macros
  el.querySelectorAll('[data-log-plan]').forEach(btn => {
    btn.addEventListener('click', async () => {
      const p = plan[+btn.dataset.logPlan];
      const r = recipes[p.recipeIdx];
      if (!r) return;
      const m = scaledMacros(r, p.scale ?? 1);
      await db.put('meals', {
        id: crypto.randomUUID(), profileId, date: today,
        name: r.name, calories: m.calories,
        protein: m.protein, carbs: m.carbs, fat: m.fat,
        loggedAt: new Date().toISOString(),
      });
      renderMeals(profile);
    });
  });

  // Delete from log
  el.querySelectorAll('[data-del]').forEach(btn => {
    btn.addEventListener('click', async () => {
      await db.delete('meals', btn.dataset.del);
      renderMeals(profile);
    });
  });

  document.getElementById('add-meal-btn').addEventListener('click', () =>
    document.getElementById('meal-form-wrap').classList.remove('hidden'));
  document.getElementById('cancel-meal-btn').addEventListener('click', () =>
    document.getElementById('meal-form-wrap').classList.add('hidden'));

  document.getElementById('meal-form').addEventListener('submit', async e => {
    e.preventDefault();
    const fd = new FormData(e.target);
    await db.put('meals', {
      id: crypto.randomUUID(), profileId, date: today,
      name: fd.get('name'), calories: +fd.get('calories'),
      protein: +fd.get('protein'), carbs: +fd.get('carbs'), fat: +fd.get('fat'),
      loggedAt: new Date().toISOString(),
    });
    renderMeals(profile);
  });

}

function macroBar(label, eaten, target, color) {
  const pct = target > 0 ? Math.min(100, Math.round(eaten / target * 100)) : 0;
  return `
    <div class="macro-bar-row">
      <span class="macro-bar-lbl">${label}</span>
      <div class="macro-bar-track">
        <div class="macro-bar-fill" style="width:${pct}%;background:${color}"></div>
      </div>
      <span class="macro-bar-num">${eaten}/${target}g</span>
    </div>`;
}

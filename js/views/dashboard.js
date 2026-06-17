import { getLiveMacros } from '../profiles.js';
import { db } from '../db.js';
import { getActiveProfile } from '../profiles.js';

export async function renderDashboard(profile) {
  const el = document.getElementById('view-dashboard');
  if (!profile) { el.innerHTML = '<p class="text-muted">No profile loaded.</p>'; return; }

  const macros = getLiveMacros(profile);
  const today  = dayjs().format('YYYY-MM-DD');
  const pid    = getActiveProfile();

  // Today's meals
  const meals = await db.getAllFromIndex('meals', 'by-profile-date', IDBKeyRange.only([pid, today]));
  const eaten = meals.reduce((acc, m) => ({
    calories: acc.calories + (m.calories||0),
    protein:  acc.protein  + (m.protein ||0),
    carbs:    acc.carbs    + (m.carbs   ||0),
    fat:      acc.fat      + (m.fat     ||0),
  }), { calories:0, protein:0, carbs:0, fat:0 });

  const remaining = macros ? {
    calories: macros.calories - eaten.calories,
    protein:  macros.protein  - eaten.protein,
    carbs:    macros.carbs    - eaten.carbs,
    fat:      macros.fat      - eaten.fat,
  } : null;

  // Today's sleep
  const sleepLog = await db.getAllFromIndex('sleep', 'by-profile-date', IDBKeyRange.only([pid, today]));
  const lastSleep = sleepLog[sleepLog.length - 1];

  el.innerHTML = `
    <h2>Good ${greeting()}, ${profile.name || 'there'}</h2>

    ${macros ? `
    <div class="card">
      <div class="card-title">Today's macros</div>
      <div style="display:flex;justify-content:space-between;align-items:baseline;margin-bottom:8px">
        <span style="font-size:1.8rem;font-weight:700">${eaten.calories}</span>
        <span class="text-muted">/ ${macros.calories} kcal</span>
      </div>
      <div class="progress-bar">
        <div class="progress-fill" style="width:${Math.min(100,(eaten.calories/macros.calories)*100)}%;background:var(--accent)"></div>
      </div>
      <div class="macro-summary" style="margin-top:12px">
        <div class="macro-pill protein">
          <div class="value">${eaten.protein}g</div>
          <div class="label">Protein / ${macros.protein}g</div>
        </div>
        <div class="macro-pill carbs">
          <div class="value">${eaten.carbs}g</div>
          <div class="label">Carbs / ${macros.carbs}g</div>
        </div>
        <div class="macro-pill fat">
          <div class="value">${eaten.fat}g</div>
          <div class="label">Fat / ${macros.fat}g</div>
        </div>
      </div>
    </div>` : ''}

    ${remaining ? `
    <div class="card">
      <div class="card-title">Remaining today</div>
      <div style="display:grid;grid-template-columns:repeat(2,1fr);gap:8px">
        <div class="macro-pill"><div class="value" style="color:var(--accent)">${remaining.calories}</div><div class="label">kcal left</div></div>
        <div class="macro-pill protein"><div class="value">${remaining.protein}g</div><div class="label">protein left</div></div>
      </div>
    </div>` : ''}

    ${lastSleep ? `
    <div class="card">
      <div class="card-title">Last night's sleep</div>
      <div style="display:flex;justify-content:space-between;align-items:center">
        <span style="font-size:1.5rem;font-weight:700">${lastSleep.durationH}h ${lastSleep.durationM}m</span>
        <span style="font-size:1.5rem">${qualityEmoji(lastSleep.quality)}</span>
      </div>
    </div>` : ''}

    <div class="card">
      <div class="card-title">Quick actions</div>
      <div style="display:flex;flex-direction:column;gap:8px">
        <button class="btn btn-secondary btn-full" onclick="document.querySelector('[data-view=workout]').click()">Log workout</button>
        <button class="btn btn-secondary btn-full" onclick="document.querySelector('[data-view=meals]').click()">Log meal</button>
        <button class="btn btn-secondary btn-full" onclick="document.querySelector('[data-view=sleep]').click()">Log sleep</button>
      </div>
    </div>

    <div class="card">
      <div class="card-title">Profile — <span class="badge badge-${profile.goal}">${profile.goal}</span></div>
      <div style="display:grid;grid-template-columns:repeat(3,1fr);gap:8px;font-size:0.85rem">
        <div><div class="text-muted">Weight</div><div>${profile.weightKg} kg</div></div>
        <div><div class="text-muted">Height</div><div>${profile.heightCm} cm</div></div>
        <div><div class="text-muted">BMR</div><div>${macros?.bmr || '—'} kcal</div></div>
      </div>
    </div>
  `;
}

function greeting() {
  const h = new Date().getHours();
  if (h < 12) return 'morning';
  if (h < 17) return 'afternoon';
  return 'evening';
}

function qualityEmoji(q) {
  return ['','😴','😐','🙂','😊','🤩'][q] || '😐';
}

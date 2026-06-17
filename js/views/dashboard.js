import { getLiveMacros, saveProfile } from '../profiles.js';
import { db } from '../db.js';
import { getActiveProfile } from '../profiles.js';

export async function renderDashboard(profile) {
  const el = document.getElementById('view-dashboard');
  if (!profile) { el.innerHTML = '<p class="text-muted">No profile loaded.</p>'; return; }

  const macros = getLiveMacros(profile);
  const today  = dayjs().format('YYYY-MM-DD');
  const pid    = getActiveProfile();

  // Weight history from localStorage (no DB version bump needed)
  const weightKey  = `fitx_weights_${pid}`;
  const allWeights = JSON.parse(localStorage.getItem(weightKey) || '[]')
    .filter(w => w.date >= dayjs().subtract(60, 'day').format('YYYY-MM-DD'))
    .sort((a, b) => a.date.localeCompare(b.date));
  const todayWeight = allWeights.find(w => w.date === today);

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

    <!-- Weight tracking -->
    <div class="card">
      <div class="card-title">Weight tracking</div>
      <div style="display:flex;gap:8px;align-items:center;margin-bottom:12px">
        <input id="weight-input" type="number" step="0.1" min="30" max="300"
          placeholder="${todayWeight ? todayWeight.weightKg + ' kg (today)' : 'Enter kg…'}"
          style="flex:1;padding:8px 10px;border-radius:8px;border:1px solid var(--border);background:var(--card-bg);color:var(--text);font-size:1rem" />
        <button class="btn btn-primary" style="white-space:nowrap" onclick="window.__logWeight()">Log weight</button>
      </div>
      ${allWeights.length >= 1 ? weightGraph(allWeights) : '<p class="text-muted" style="font-size:0.82rem">Log your weight daily to see your trend chart.</p>'}
      ${allWeights.length >= 2 ? weightStats(allWeights, profile) : allWeights.length === 1 ? `<p style="font-size:0.82rem;color:var(--text-muted);margin-top:6px">Keep logging daily — trend will appear after 2+ entries.</p>` : ''}
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

function weightGraph(weights) {
  const W = 320, H = 100, PAD = { t: 8, r: 8, b: 20, l: 36 };
  const vals = weights.map(w => w.weightKg);
  const minV = Math.min(...vals) - 0.5;
  const maxV = Math.max(...vals) + 0.5;
  const n = weights.length;
  // Single point: centre it
  const x = i => n === 1 ? (W / 2) : PAD.l + (i / (n - 1)) * (W - PAD.l - PAD.r);
  const y = v => PAD.t + (1 - (v - minV) / (maxV - minV)) * (H - PAD.t - PAD.b);

  // Trend line (linear regression)
  const avgX = (n - 1) / 2;
  const avgY = vals.reduce((a, v) => a + v, 0) / n;
  const slope = vals.reduce((a, v, i) => a + (i - avgX) * (v - avgY), 0) /
                vals.reduce((a, _, i) => a + (i - avgX) ** 2, 0);
  const intercept = avgY - slope * avgX;
  const ty0 = y(intercept + slope * 0);
  const ty1 = y(intercept + slope * (n - 1));

  const pts = weights.map((_, i) => `${x(i).toFixed(1)},${y(vals[i]).toFixed(1)}`).join(' ');

  // X-axis labels: first, mid, last
  const labelIdxs = [0, Math.floor((n - 1) / 2), n - 1];
  const xLabels = labelIdxs.map(i => {
    const d = dayjs(weights[i].date);
    return `<text x="${x(i).toFixed(1)}" y="${H - 2}" text-anchor="middle" font-size="9" fill="var(--text-muted)">${d.format('D MMM')}</text>`;
  }).join('');

  // Y-axis labels
  const yMid = (minV + maxV) / 2;
  const yLabels = [maxV, yMid, minV].map((v, i) =>
    `<text x="${PAD.l - 4}" y="${y(v).toFixed(1)}" text-anchor="end" dominant-baseline="middle" font-size="9" fill="var(--text-muted)">${v.toFixed(1)}</text>`
  ).join('');

  return `<svg viewBox="0 0 ${W} ${H}" style="width:100%;overflow:visible">
    ${yLabels}
    ${xLabels}
    ${n > 1 ? `<polyline points="${pts}" fill="none" stroke="var(--accent)" stroke-width="2" stroke-linejoin="round"/>` : ''}
    ${n > 1 ? `<line x1="${x(0).toFixed(1)}" y1="${ty0.toFixed(1)}" x2="${x(n-1).toFixed(1)}" y2="${ty1.toFixed(1)}"
      stroke="#60a5fa" stroke-width="1" stroke-dasharray="4 3" opacity="0.6"/>` : ''}
    ${weights.map((w, i) => `<circle cx="${x(i).toFixed(1)}" cy="${y(vals[i]).toFixed(1)}" r="3" fill="var(--accent)"/>`).join('')}
    <circle cx="${x(n-1).toFixed(1)}" cy="${y(vals[n-1]).toFixed(1)}" r="4" fill="#fff" stroke="var(--accent)" stroke-width="2"/>
  </svg>`;
}

function weightStats(weights, profile) {
  const vals = weights.map(w => w.weightKg);
  const latest = vals[vals.length - 1];
  const first  = vals[0];
  const change = latest - first;
  const days   = weights.length;
  const perWeek = (change / days * 7).toFixed(2);
  const trend   = Math.abs(change) < 0.3 ? 'stable ↔' : change > 0 ? `gaining +${perWeek} kg/wk ↑` : `losing ${perWeek} kg/wk ↓`;
  const goal    = profile.goal;
  const ideal   = goal === 'bulk' ? 'gaining' : goal === 'cut' ? 'losing' : 'stable';
  const onTrack = trend.startsWith(ideal) || (ideal === 'stable' && trend.startsWith('stable'));

  return `<div style="display:flex;justify-content:space-between;align-items:center;margin-top:8px;font-size:0.82rem">
    <span style="color:var(--text-muted)">Trend: <strong style="color:${onTrack ? '#4ade80' : '#f59e0b'}">${trend}</strong></span>
    <span style="color:var(--text-muted)">${latest} kg now · started ${first} kg</span>
  </div>
  ${!onTrack ? `<p style="font-size:0.78rem;color:#f59e0b;margin-top:4px">Your trend doesn't match your ${goal} goal — your meal plan targets have been adjusted.</p>` : ''}`;
}

// Global handler so inline onclick always calls the current module's code
window.__logWeight = async () => {
  const inp = document.getElementById('weight-input');
  if (!inp) return;
  const val = parseFloat(inp.value);
  if (!val || val < 30 || val > 300) { inp.style.borderColor = '#ef4444'; return; }
  inp.style.borderColor = '';
  const pid   = getActiveProfile();
  const today = dayjs().format('YYYY-MM-DD');

  const wKey    = `fitx_weights_${pid}`;
  const entries = JSON.parse(localStorage.getItem(wKey) || '[]').filter(w => w.date !== today);
  entries.push({ date: today, weightKg: val });
  localStorage.setItem(wKey, JSON.stringify(entries));

  // Clear today's meal plan cache so it regenerates with new macros
  Object.keys(localStorage).filter(k => k.startsWith(`fitx_plan_v5_${pid}_${today}`))
    .forEach(k => localStorage.removeItem(k));

  const profile = await db.get('profiles', pid);
  if (profile) {
    profile.weightKg = val;
    await db.put('profiles', profile);
    renderDashboard(profile);
  }
};

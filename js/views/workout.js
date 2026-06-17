import { db } from '../db.js';
import { getActiveProfile } from '../profiles.js';
import { getSuggestion } from '../suggestions.js';
import { estimate1RM, save1RM, get1RMHistory } from '../orm.js';
import exercises from '../data/exercises.js';

const MAJOR_LIFTS = ['Squat', 'Bench Press', 'Deadlift', 'Overhead Press'];

export async function renderWorkout(profile) {
  const el  = document.getElementById('view-workout');
  const pid = getActiveProfile();
  const today = dayjs().format('YYYY-MM-DD');

  const allSessions = (await db.getAllFromIndex('sessions', 'by-profile-date',
    IDBKeyRange.bound([pid, '2000-01-01'], [pid, '9999-12-31'])))
    .sort((a, b) => b.date.localeCompare(a.date));

  const recent = allSessions.slice(0, 5);

  // Get suggestions for major lifts
  const suggestions = {};
  for (const lift of MAJOR_LIFTS) {
    suggestions[lift] = await getSuggestion(pid, lift);
  }

  el.innerHTML = `
    <h2>Workout</h2>

    <!-- Suggestions for major lifts -->
    <div class="card">
      <div class="card-title">Today's suggestions</div>
      <div style="display:flex;flex-direction:column;gap:10px">
        ${MAJOR_LIFTS.map(lift => {
          const s = suggestions[lift];
          return `
          <div style="background:var(--surface2);border-radius:8px;padding:12px">
            <div style="font-weight:600;margin-bottom:6px">${lift}</div>
            ${renderSuggestion(s)}
          </div>`;
        }).join('')}
      </div>
    </div>

    <!-- 1RM quick log -->
    <div class="card">
      <div class="card-title">Log / estimate 1RM</div>
      <div style="display:grid;grid-template-columns:1fr 1fr 1fr;gap:8px">
        <div class="form-group" style="margin:0">
          <label>Lift</label>
          <select id="orm-lift-quick">
            ${MAJOR_LIFTS.map(l => `<option>${l}</option>`).join('')}
          </select>
        </div>
        <div class="form-group" style="margin:0">
          <label>Weight (kg)</label>
          <input id="orm-weight-quick" type="number" step="0.5" placeholder="e.g. 100"/>
        </div>
        <div class="form-group" style="margin:0">
          <label>Reps (1=actual)</label>
          <input id="orm-reps-quick" type="number" value="1" min="1" max="10"/>
        </div>
      </div>
      <button class="btn btn-secondary btn-full mt-8" id="orm-save-quick">Save 1RM</button>
      <div id="orm-result" style="margin-top:8px"></div>
    </div>

    <!-- Start session -->
    <button class="btn btn-primary btn-full" id="start-session-btn">+ Log session</button>
    <div id="session-form" style="margin-top:12px"></div>

    <!-- Exercise library by muscle -->
    <div class="card" style="margin-top:12px">
      <div class="card-title">Exercise library (${exercises.length} exercises)</div>
      ${renderExerciseLibrary()}
    </div>

    <!-- Recent sessions -->
    <div style="margin-top:4px">
      <h3>Recent sessions</h3>
      ${recent.length ? `<ul class="item-list">
        ${recent.map(s => `
          <li>
            <div>
              <div style="font-weight:600">${s.date}</div>
              <div class="text-muted">${(s.entries || []).map(e => e.exercise).join(', ').slice(0, 50) || 'No exercises'}</div>
            </div>
            <span class="text-muted">${(s.entries || []).reduce((a, e) => a + (e.sets || 0), 0)} sets</span>
          </li>`).join('')}
      </ul>` : '<p class="text-muted">No sessions yet — log your first one above.</p>'}
    </div>
  `;

  // 1RM quick save
  document.getElementById('orm-save-quick').onclick = async () => {
    const lift   = document.getElementById('orm-lift-quick').value;
    const weight = +document.getElementById('orm-weight-quick').value;
    const reps   = +document.getElementById('orm-reps-quick').value;
    if (!weight) { alert('Enter a weight.'); return; }
    const value  = reps === 1 ? weight : estimate1RM(weight, reps);
    const method = reps === 1 ? 'Tested 1RM' : `Estimated from ${reps} reps @ ${weight}kg`;
    await save1RM(pid, lift, value, method);
    document.getElementById('orm-result').innerHTML =
      `<div class="card" style="background:var(--success)22;border:1px solid var(--success);margin:0">
        <span style="color:var(--success);font-weight:700">Saved: ${lift} 1RM = ${value} kg</span>
        ${reps > 1 ? `<div class="text-muted" style="font-size:0.8rem">${method}</div>` : ''}
      </div>`;
    // Refresh suggestions
    renderWorkout(profile);
  };

  document.getElementById('start-session-btn').onclick = () => renderSessionForm(pid, today, profile);
}

function renderSuggestion(s) {
  if (!s || s.type === 'start') {
    return `<div class="text-muted" style="font-size:0.85rem">No history yet — log a session to get suggestions.</div>`;
  }
  if (s.type === 'percentage') {
    return `
      <div style="font-size:0.8rem;color:var(--accent2);margin-bottom:6px">Based on 1RM: <strong>${s.orm} kg</strong></div>
      <div style="display:flex;flex-wrap:wrap;gap:6px">
        ${s.sets.map(set => `
          <div style="background:var(--bg);border-radius:6px;padding:6px 10px;font-size:0.8rem;text-align:center">
            <div style="font-weight:700">${set.weight}kg</div>
            <div class="text-muted">${set.sets}×${set.reps}</div>
            <div style="font-size:0.7rem;color:var(--text-muted)">${set.label}</div>
          </div>`).join('')}
      </div>`;
  }
  if (s.type === 'increase') {
    return `<div style="color:var(--success);font-size:0.85rem">↑ Increase to <strong>${s.weight}kg</strong> — ${s.sets}×${s.reps}</div>`;
  }
  if (s.type === 'hold') {
    return `<div style="color:var(--warning);font-size:0.85rem">Hold at <strong>${s.weight}kg</strong> — ${s.sets}×${s.reps} (missed reps last session)</div>`;
  }
  return `<div style="font-size:0.85rem">${s.weight}kg — ${s.sets}×${s.reps}</div>`;
}

function renderExerciseLibrary() {
  const byMuscle = {};
  exercises.forEach(ex => {
    if (!byMuscle[ex.muscle]) byMuscle[ex.muscle] = [];
    byMuscle[ex.muscle].push(ex);
  });

  return Object.entries(byMuscle).map(([muscle, exs]) => `
    <div style="margin-bottom:12px">
      <div style="font-size:0.75rem;font-weight:700;color:var(--accent2);margin-bottom:6px;text-transform:uppercase">${muscle}</div>
      <div style="display:flex;flex-wrap:wrap;gap:6px">
        ${exs.map(ex => `
          <span style="background:var(--surface2);border-radius:20px;padding:4px 10px;font-size:0.75rem">
            ${ex.name} <span style="color:var(--text-muted)">(${ex.equipment})</span>
          </span>`).join('')}
      </div>
    </div>`).join('');
}

async function renderSessionForm(pid, date, profile) {
  const btn  = document.getElementById('start-session-btn');
  const form = document.getElementById('session-form');
  btn.classList.add('hidden');

  let entries = [];

  function redraw() {
    form.innerHTML = `
      <div class="card">
        <h3>Session — ${date}</h3>
        ${entries.length === 0 ? '<p class="text-muted" style="margin-bottom:10px">No exercises added yet.</p>' : ''}
        ${entries.map((e, i) => `
          <div style="background:var(--surface2);border-radius:8px;padding:10px;margin-bottom:8px;display:flex;justify-content:space-between;align-items:center">
            <div>
              <div style="font-weight:600">${e.exercise}</div>
              <div class="text-muted" style="font-size:0.85rem">${e.sets} × ${e.repsTarget} reps @ ${e.weight}kg
                ${e.repsCompleted < e.repsTarget ? `<span style="color:var(--accent)"> (${e.repsCompleted} done)</span>` : ''}
              </div>
            </div>
            <button class="btn btn-secondary" style="font-size:0.75rem;padding:4px 10px" data-remove="${i}">✕</button>
          </div>`).join('')}

        <div style="background:var(--bg);border-radius:8px;padding:12px;margin-top:4px">
          <div class="form-group">
            <label>Exercise</label>
            <select id="ex-name">
              ${exercises.map(ex => `<option value="${ex.name}">${ex.name} (${ex.equipment})</option>`).join('')}
            </select>
          </div>
          <div style="display:grid;grid-template-columns:repeat(3,1fr);gap:8px">
            <div class="form-group"><label>Sets</label><input id="ex-sets" type="number" value="3" min="1"/></div>
            <div class="form-group"><label>Reps target</label><input id="ex-reps" type="number" value="8" min="1"/></div>
            <div class="form-group"><label>Weight (kg)</label><input id="ex-weight" type="number" value="0" step="0.5"/></div>
          </div>
          <div class="form-group">
            <label>Reps actually completed</label>
            <input id="ex-reps-done" type="number" value="8" min="0"/>
          </div>
          <button class="btn btn-secondary btn-full" id="add-ex-btn">+ Add exercise</button>
        </div>

        <div class="form-group" style="margin-top:12px">
          <label>Session notes (optional)</label>
          <textarea id="session-notes" placeholder="How did it feel? Any form notes?"></textarea>
        </div>
        <div style="display:flex;gap:8px;margin-top:12px">
          <button class="btn btn-secondary" id="cancel-session-btn">Cancel</button>
          <button class="btn btn-success" style="flex:1" id="save-session-btn">Save session</button>
        </div>
      </div>`;

    form.querySelectorAll('[data-remove]').forEach(b => {
      b.onclick = () => { entries.splice(+b.dataset.remove, 1); redraw(); };
    });

    document.getElementById('add-ex-btn').onclick = () => {
      const name  = document.getElementById('ex-name').value;
      const sets  = +document.getElementById('ex-sets').value || 3;
      const reps  = +document.getElementById('ex-reps').value || 8;
      const weight= +document.getElementById('ex-weight').value || 0;
      const done  = +document.getElementById('ex-reps-done').value;
      entries.push({ exercise: name, sets, repsTarget: reps, repsCompleted: done, weight });
      redraw();
    };

    document.getElementById('save-session-btn').onclick = async () => {
      if (!entries.length) { alert('Add at least one exercise.'); return; }
      const notes = document.getElementById('session-notes').value;
      await db.put('sessions', { profileId: pid, date, entries, notes, savedAt: new Date().toISOString() });
      form.innerHTML = '';
      btn.classList.remove('hidden');
      renderWorkout(profile);
    };

    document.getElementById('cancel-session-btn').onclick = () => {
      form.innerHTML = '';
      btn.classList.remove('hidden');
    };
  }

  redraw();
}

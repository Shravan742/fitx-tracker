import { db } from '../db.js';
import { getActiveProfile } from '../profiles.js';
import { getSuggestion } from '../suggestions.js';
import { estimate1RM, save1RM } from '../orm.js';
import exercises from '../data/exercises.js';

export async function renderWorkout(profile) {
  const el = document.getElementById('view-workout');
  const pid = getActiveProfile();
  const today = dayjs().format('YYYY-MM-DD');

  const recent = (await db.getAllFromIndex('sessions', 'by-profile-date',
    IDBKeyRange.bound([pid,'2000-01-01'],[pid,'9999-12-31'])))
    .sort((a,b) => b.date.localeCompare(a.date)).slice(0,5);

  el.innerHTML = `
    <h2>Workout</h2>
    <button class="btn btn-primary btn-full" id="start-session-btn">+ Start session</button>

    <div id="session-form" class="hidden" style="margin-top:16px"></div>

    <div style="margin-top:20px">
      <h3>Recent sessions</h3>
      ${recent.length ? `<ul class="item-list">
        ${recent.map(s => `
          <li>
            <div>
              <div style="font-weight:600">${s.date}</div>
              <div class="text-muted">${s.entries?.length || 0} exercises · ${s.notes||''}</div>
            </div>
            <span class="text-muted">${s.entries?.reduce((a,e)=>a+(e.sets||0),0)} sets</span>
          </li>`).join('')}
      </ul>` : '<p class="text-muted">No sessions yet.</p>'}
    </div>
  `;

  document.getElementById('start-session-btn').onclick = () => renderSessionForm(pid, today, el);
}

async function renderSessionForm(pid, date, parentEl) {
  const form = document.getElementById('session-form');
  form.classList.remove('hidden');
  document.getElementById('start-session-btn').classList.add('hidden');

  let entries = [];

  function redraw() {
    form.innerHTML = `
      <div class="card">
        <h3>Session — ${date}</h3>
        ${entries.map((e,i) => `
          <div style="background:var(--surface2);border-radius:8px;padding:10px;margin-bottom:8px">
            <div style="font-weight:600">${e.exercise}</div>
            <div class="text-muted">${e.sets} sets × ${e.repsTarget} reps @ ${e.weight} kg</div>
            <button class="btn btn-secondary" style="font-size:0.75rem;padding:4px 10px;margin-top:6px" data-remove="${i}">Remove</button>
          </div>`).join('')}
        <div id="add-exercise-form" style="margin-top:12px">
          <div class="form-group">
            <label>Exercise</label>
            <select id="ex-name">
              ${exercises.map(ex => `<option value="${ex.name}">${ex.name} (${ex.equipment})</option>`).join('')}
            </select>
          </div>
          <div style="display:grid;grid-template-columns:repeat(3,1fr);gap:8px">
            <div class="form-group"><label>Sets</label><input id="ex-sets" type="number" value="3" min="1"/></div>
            <div class="form-group"><label>Reps</label><input id="ex-reps" type="number" value="8" min="1"/></div>
            <div class="form-group"><label>Weight (kg)</label><input id="ex-weight" type="number" value="0" step="0.5"/></div>
          </div>
          <div class="form-group"><label>Reps completed</label><input id="ex-reps-done" type="number" value="8" min="0"/></div>
          <button class="btn btn-secondary btn-full" id="add-ex-btn">Add exercise</button>
        </div>
        <div class="form-group" style="margin-top:12px">
          <label>Session notes</label>
          <textarea id="session-notes" placeholder="How did it feel?"></textarea>
        </div>
        <button class="btn btn-success btn-full mt-16" id="save-session-btn">Save session</button>
        <button class="btn btn-secondary btn-full mt-8" id="cancel-session-btn">Cancel</button>
      </div>`;

    form.querySelectorAll('[data-remove]').forEach(btn => {
      btn.onclick = () => { entries.splice(+btn.dataset.remove, 1); redraw(); };
    });

    document.getElementById('add-ex-btn').onclick = () => {
      const name    = document.getElementById('ex-name').value;
      const sets    = +document.getElementById('ex-sets').value;
      const reps    = +document.getElementById('ex-reps').value;
      const weight  = +document.getElementById('ex-weight').value;
      const done    = +document.getElementById('ex-reps-done').value;
      entries.push({ exercise: name, sets, repsTarget: reps, repsCompleted: done, weight });
      redraw();
    };

    document.getElementById('save-session-btn').onclick = async () => {
      const notes = document.getElementById('session-notes').value;
      await db.put('sessions', { profileId: pid, date, entries, notes, savedAt: new Date().toISOString() });
      form.classList.add('hidden');
      document.getElementById('start-session-btn').classList.remove('hidden');
      renderWorkout(null); // refresh
    };

    document.getElementById('cancel-session-btn').onclick = () => {
      form.classList.add('hidden');
      document.getElementById('start-session-btn').classList.remove('hidden');
    };
  }

  redraw();
}

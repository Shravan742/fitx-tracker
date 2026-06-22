import { db } from '../db.js';
import { getActiveProfile } from '../profiles.js';
import { getSuggestion } from '../suggestions.js';
import { estimate1RM, save1RM, get1RMHistory } from '../orm.js';
import exercises from '../data/exercises.js';
import { bodyDiagram } from '../bodymap.js';

const MAJOR_LIFTS = ['Squat', 'Bench Press', 'Deadlift', 'Overhead Press'];
let demoLoopInterval = null;

const MUSCLE_ICON = {
  Chest: '🏋️', Back: '🔙', Shoulders: '💪', Legs: '🦵',
  Biceps: '💪', Triceps: '💪', Core: '⚡',
};

const EQUIPMENT_ICON = {
  Barbell: '🏋️', Dumbbell: '🔵', Cable: '🔗', Machine: '⚙️', Bodyweight: '🤸',
};

export async function renderWorkout(profile) {
  const el  = document.getElementById('view-workout');
  const pid = getActiveProfile();
  const today = dayjs().format('YYYY-MM-DD');

  const allSessions = (await db.getAllFromIndex('sessions', 'by-profile-date',
    IDBKeyRange.bound([pid, '2000-01-01'], [pid, '9999-12-31'])))
    .sort((a, b) => b.date.localeCompare(a.date));

  const recent = allSessions.slice(0, 5);

  const suggestions = {};
  for (const lift of MAJOR_LIFTS) {
    suggestions[lift] = await getSuggestion(pid, lift);
  }

  const byMuscle = {};
  exercises.forEach(ex => {
    if (!byMuscle[ex.muscle]) byMuscle[ex.muscle] = [];
    byMuscle[ex.muscle].push(ex);
  });

  el.innerHTML = `
    <div class="view-header"><h2>Workout</h2></div>

    <!-- Today's suggestions -->
    <div class="card">
      <h3 class="section-title">Today's Suggestions</h3>
      <div class="lift-suggestions">
        ${MAJOR_LIFTS.map(lift => {
          const s = suggestions[lift];
          return `
          <div class="lift-card">
            <div class="lift-name">${lift}</div>
            ${renderSuggestion(s)}
          </div>`;
        }).join('')}
      </div>
    </div>

    <!-- 1RM quick log -->
    <div class="card">
      <h3 class="section-title">Log / Estimate 1RM</h3>
      <div class="orm-grid">
        <div class="form-group">
          <label>Lift</label>
          <select id="orm-lift-quick">
            ${MAJOR_LIFTS.map(l => `<option>${l}</option>`).join('')}
          </select>
        </div>
        <div class="form-group">
          <label>Weight (kg)</label>
          <input id="orm-weight-quick" type="number" step="0.5" placeholder="100" />
        </div>
        <div class="form-group">
          <label>Reps (1 = actual)</label>
          <input id="orm-reps-quick" type="number" value="1" min="1" max="10" />
        </div>
      </div>
      <button class="btn-secondary btn-full mt-8" id="orm-save-quick">Save 1RM</button>
      <div id="orm-result"></div>
    </div>

    <!-- Start session -->
    <button class="btn-primary btn-full" id="start-session-btn">＋ Log session</button>
    <div id="session-form"></div>

    <!-- Exercise library -->
    <div class="card" id="exercise-library-card">
      <h3 class="section-title">Exercise Library
        <span class="badge">${exercises.length}</span>
      </h3>
      ${Object.entries(byMuscle).map(([muscle, exs]) => `
        <div class="muscle-group">
          <div class="muscle-label">${MUSCLE_ICON[muscle] || '💪'} ${muscle}</div>
          <div class="exercise-chips">
            ${exs.map(ex => `
              <button class="exercise-chip" data-ex="${ex.name}">
                ${EQUIPMENT_ICON[ex.equipment] || ''} ${ex.name}
              </button>`).join('')}
          </div>
        </div>`).join('')}
    </div>

    <!-- Exercise detail panel (hidden until chip clicked) -->
    <div id="exercise-detail" class="card hidden">
      <button id="close-ex-detail" class="btn-secondary sm" style="margin-bottom:12px">← Back to library</button>
      <div id="exercise-detail-content"></div>
    </div>

    <!-- Recent sessions -->
    <div class="card">
      <h3 class="section-title">Recent Sessions</h3>
      ${recent.length ? `
        <div class="session-list">
          ${recent.map(s => `
            <div class="session-item">
              <div>
                <div class="session-date">${s.date}</div>
                <div class="session-exercises">${(s.entries || []).map(e => e.exercise).join(', ').slice(0, 60) || 'No exercises'}</div>
              </div>
              <span class="session-sets">${(s.entries || []).reduce((a, e) => a + (e.sets || 0), 0)} sets</span>
            </div>`).join('')}
        </div>` :
        '<p class="empty-state">No sessions yet — log your first one above.</p>'}
    </div>
  `;

  // 1RM save
  document.getElementById('orm-save-quick').onclick = async () => {
    const lift   = document.getElementById('orm-lift-quick').value;
    const weight = +document.getElementById('orm-weight-quick').value;
    const reps   = +document.getElementById('orm-reps-quick').value;
    if (!weight) { alert('Enter a weight.'); return; }
    const value  = reps === 1 ? weight : estimate1RM(weight, reps);
    const method = reps === 1 ? 'Tested 1RM' : `Estimated from ${reps} reps @ ${weight}kg`;
    await save1RM(pid, lift, value, method);
    document.getElementById('orm-result').innerHTML =
      `<div class="success-banner">✓ ${lift} 1RM saved: <strong>${value} kg</strong>
        ${reps > 1 ? `<span class="text-muted"> (${method})</span>` : ''}
      </div>`;
    setTimeout(() => renderWorkout(profile), 1200);
  };

  document.getElementById('start-session-btn').onclick = () =>
    renderSessionForm(pid, today, profile);

  // Exercise chip → detail panel
  el.querySelectorAll('.exercise-chip').forEach(chip => {
    chip.addEventListener('click', () => {
      const ex = exercises.find(e => e.name === chip.dataset.ex);
      if (!ex) return;
      showExerciseDetail(ex);
    });
  });

  document.getElementById('close-ex-detail').addEventListener('click', () => {
    if (demoLoopInterval) { clearInterval(demoLoopInterval); demoLoopInterval = null; }
    document.getElementById('exercise-detail').classList.add('hidden');
    document.getElementById('exercise-library-card').classList.remove('hidden');
  });
}

function slugify(name) {
  return name.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');
}

function showExerciseDetail(ex) {
  document.getElementById('exercise-library-card').classList.add('hidden');
  const panel = document.getElementById('exercise-detail');
  panel.classList.remove('hidden');

  const muscleList = [
    ...ex.musclesPrimary.map(m => `<span class="muscle-tag primary">${m}</span>`),
    ...(ex.musclesSecondary || []).map(m => `<span class="muscle-tag secondary">${m}</span>`),
  ].join('');

  const slug = slugify(ex.name);

  document.getElementById('exercise-detail-content').innerHTML = `
    <div class="ex-detail-header">
      <div>
        <h3 class="ex-detail-name">${ex.name}</h3>
        <div class="ex-detail-meta">
          <span class="equipment-tag">${EQUIPMENT_ICON[ex.equipment]} ${ex.equipment}</span>
          <span class="muscle-tag-group">${muscleList}</span>
        </div>
      </div>
    </div>

    <div class="ex-demo-loop-wrap" id="ex-demo-loop-wrap">
      <img id="ex-demo-loop-img" class="ex-demo-loop-img" src="img/exercises/${slug}-0.jpg" alt="${ex.name} demo"
        onerror="this.closest('.ex-demo-loop-wrap').classList.add('hidden')" />
      <span class="ex-demo-loop-badge">DEMO LOOP</span>
    </div>

    <div class="yt-embed-wrap">
      <div class="yt-thumb" id="yt-thumb">
        <img
          class="yt-thumb-img"
          src="https://img.youtube.com/vi/${ex.ytId}/hqdefault.jpg"
          alt="Tutorial thumbnail"
          onerror="this.src=''"
        />
        <button class="yt-play-overlay" id="yt-play-btn" aria-label="Play tutorial">
          <svg class="yt-play-icon" viewBox="0 0 68 48">
            <path class="yt-play-bg" d="M66.52 7.74c-.78-2.93-2.49-5.41-5.42-6.19C55.79.13 34 0 34 0S12.21.13 6.9 1.55c-2.93.78-4.63 3.26-5.42 6.19C.06 13.05 0 24 0 24s.06 10.95 1.48 16.26c.78 2.93 2.49 5.41 5.42 6.19C12.21 47.87 34 48 34 48s21.79-.13 27.1-1.55c2.93-.78 4.64-3.26 5.42-6.19C67.94 34.95 68 24 68 24s-.06-10.95-1.48-16.26z" fill="#ff0000"/>
            <path d="M 45,24 27,14 27,34" fill="#fff"/>
          </svg>
        </button>
      </div>
      <iframe
        id="yt-frame"
        class="yt-frame hidden"
        src=""
        data-src="https://www.youtube-nocookie.com/embed/${ex.ytId}?autoplay=1&rel=0&modestbranding=1"
        allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
        allowfullscreen
      ></iframe>
    </div>

    <div class="ex-section ex-bodymap-section">
      <h4>🫀 Exercise Details</h4>
      ${bodyDiagram(ex.muscle)}
      <div class="ex-detail-grid">
        <div class="ex-detail-row"><span class="ex-detail-label">Body Part</span><span class="ex-detail-value">${ex.muscle}</span></div>
        <div class="ex-detail-row"><span class="ex-detail-label">Equipment</span><span class="ex-detail-value">${ex.equipment}</span></div>
        <div class="ex-detail-row"><span class="ex-detail-label">Primary Muscles</span><span class="ex-detail-value">${ex.musclesPrimary.join(', ')}</span></div>
        ${ex.musclesSecondary?.length ? `<div class="ex-detail-row"><span class="ex-detail-label">Secondary Muscles</span><span class="ex-detail-value">${ex.musclesSecondary.join(', ')}</span></div>` : ''}
      </div>
    </div>

    <div class="ex-section">
      <h4>🔧 Equipment Setup</h4>
      <p>${ex.setup}</p>
    </div>

    <div class="ex-section">
      <h4>📋 How To Perform</h4>
      <ol class="ex-steps">
        ${ex.steps.map(s => `<li>${s}</li>`).join('')}
      </ol>
    </div>

    <div class="ex-section ex-tips">
      <h4>💡 Pro Tip</h4>
      <p>${ex.tips}</p>
    </div>

    <div class="ex-section ex-mistakes">
      <h4>⚠️ Common Mistake</h4>
      <p>${ex.mistakes}</p>
    </div>

    <div class="ex-defaults">
      Recommended: <strong>${ex.defaultSets} sets × ${ex.defaultReps} reps</strong>
    </div>
  `;

  panel.scrollIntoView({ behavior: 'smooth', block: 'start' });

  // Loop between the two demo frames to simulate a moving exercise animation
  if (demoLoopInterval) clearInterval(demoLoopInterval);
  const loopImg = document.getElementById('ex-demo-loop-img');
  if (loopImg) {
    let frame = 0;
    demoLoopInterval = setInterval(() => {
      frame = 1 - frame;
      loopImg.src = `img/exercises/${slug}-${frame}.jpg`;
    }, 700);
  }

  document.getElementById('yt-play-btn').addEventListener('click', () => {
    const frame = document.getElementById('yt-frame');
    frame.src = frame.dataset.src;
    frame.classList.remove('hidden');
    document.getElementById('yt-thumb').classList.add('hidden');
  });

}

function renderSuggestion(s) {
  if (!s || s.type === 'start') {
    return `<p class="empty-state sm">No history yet — log a session to get suggestions.</p>`;
  }
  if (s.type === 'percentage') {
    return `
      <div class="orm-ref">Based on 1RM: <strong>${s.orm} kg</strong></div>
      <div class="set-chips">
        ${s.sets.map(set => `
          <div class="set-chip">
            <div class="set-weight">${set.weight}kg</div>
            <div class="set-reps">${set.sets}×${set.reps}</div>
            <div class="set-label">${set.label}</div>
          </div>`).join('')}
      </div>`;
  }
  if (s.type === 'increase') {
    return `<div class="suggestion-up">↑ Increase to <strong>${s.weight}kg</strong> — ${s.sets}×${s.reps}</div>`;
  }
  if (s.type === 'hold') {
    return `<div class="suggestion-hold">Hold at <strong>${s.weight}kg</strong> — ${s.sets}×${s.reps} (missed reps)</div>`;
  }
  return `<div>${s.weight}kg — ${s.sets}×${s.reps}</div>`;
}

async function renderSessionForm(pid, date, profile) {
  const btn  = document.getElementById('start-session-btn');
  const form = document.getElementById('session-form');
  btn.classList.add('hidden');

  let entries = [];

  function redraw() {
    form.innerHTML = `
      <div class="card">
        <h3 class="section-title">Session — ${date}</h3>
        ${entries.length === 0 ? '<p class="empty-state">No exercises added yet.</p>' : ''}
        ${entries.map((e, i) => `
          <div class="session-entry">
            <div>
              <div class="entry-name">${e.exercise}</div>
              <div class="entry-meta">${e.sets} × ${e.repsTarget} reps @ ${e.weight}kg
                ${e.repsCompleted < e.repsTarget
                  ? `<span class="text-warn"> (${e.repsCompleted} done)</span>` : ''}
              </div>
            </div>
            <button class="btn-icon danger" data-remove="${i}">✕</button>
          </div>`).join('')}

        <div class="add-exercise-form">
          <div class="form-group">
            <label>Exercise</label>
            <select id="ex-name">
              ${exercises.map(ex => `<option value="${ex.name}">${ex.name} (${ex.equipment})</option>`).join('')}
            </select>
          </div>
          <div class="form-row-3">
            <div class="form-group"><label>Sets</label><input id="ex-sets" type="number" value="3" min="1"/></div>
            <div class="form-group"><label>Reps target</label><input id="ex-reps" type="number" value="8" min="1"/></div>
            <div class="form-group"><label>Weight (kg)</label><input id="ex-weight" type="number" value="0" step="0.5"/></div>
          </div>
          <div class="form-group">
            <label>Reps completed</label>
            <input id="ex-reps-done" type="number" value="8" min="0"/>
          </div>
          <button class="btn-secondary btn-full" id="add-ex-btn">＋ Add exercise</button>
        </div>

        <div class="form-group mt-8">
          <label>Session notes</label>
          <textarea id="session-notes" placeholder="How did it feel?"></textarea>
        </div>
        <div class="form-row">
          <button class="btn-secondary" id="cancel-session-btn">Cancel</button>
          <button class="btn-primary" style="flex:1" id="save-session-btn">Save session</button>
        </div>
      </div>`;

    form.querySelectorAll('[data-remove]').forEach(b => {
      b.onclick = () => { entries.splice(+b.dataset.remove, 1); redraw(); };
    });

    document.getElementById('add-ex-btn').onclick = () => {
      const name   = document.getElementById('ex-name').value;
      const sets   = +document.getElementById('ex-sets').value || 3;
      const reps   = +document.getElementById('ex-reps').value || 8;
      const weight = +document.getElementById('ex-weight').value || 0;
      const done   = +document.getElementById('ex-reps-done').value;
      entries.push({ exercise: name, sets, repsTarget: reps, repsCompleted: done, weight });
      redraw();
    };

    document.getElementById('save-session-btn').onclick = async () => {
      if (!entries.length) { alert('Add at least one exercise.'); return; }
      const notes = document.getElementById('session-notes').value;
      await db.put('sessions', {
        id: crypto.randomUUID(), profileId: pid, date, entries, notes,
        savedAt: new Date().toISOString(),
      });
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

import { getProfile, saveProfile, getLiveMacros, getActiveProfile } from '../profiles.js';
import { get1RMHistory, estimate1RM, save1RM } from '../orm.js';
import { getGistConfig, setGistConfig } from '../sync.js';

const LIFTS = ['Squat', 'Bench Press', 'Deadlift', 'Overhead Press'];

export async function renderProfile(profile, onUpdate) {
  const el  = document.getElementById('view-profile');
  const pid = getActiveProfile();
  const macros = getLiveMacros(profile);
  const gist = getGistConfig();

  // Load 1RM history for all major lifts
  const ormData = {};
  for (const lift of LIFTS) {
    ormData[lift] = await get1RMHistory(pid, lift);
  }

  el.innerHTML = `
    <h2>Profile</h2>

    <div class="card">
      <div class="card-title">Edit profile</div>
      <div class="form-group"><label>Name</label><input id="p-name" value="${profile.name||''}"/></div>
      <div style="display:grid;grid-template-columns:1fr 1fr;gap:8px">
        <div class="form-group"><label>Age</label><input id="p-age" type="number" value="${profile.age||''}"/></div>
        <div class="form-group"><label>Sex</label>
          <select id="p-sex">
            <option value="male" ${profile.sex==='male'?'selected':''}>Male</option>
            <option value="female" ${profile.sex==='female'?'selected':''}>Female</option>
          </select>
        </div>
        <div class="form-group"><label>Height (cm)</label><input id="p-height" type="number" value="${profile.heightCm||''}"/></div>
        <div class="form-group"><label>Weight (kg)</label><input id="p-weight" type="number" step="0.1" value="${profile.weightKg||''}"/></div>
      </div>
      <div class="form-group"><label>Activity level</label>
        <select id="p-activity">
          <option value="sedentary"   ${profile.activityLevel==='sedentary'  ?'selected':''}>Sedentary</option>
          <option value="light"       ${profile.activityLevel==='light'      ?'selected':''}>Light (1-2/week)</option>
          <option value="moderate"    ${profile.activityLevel==='moderate'   ?'selected':''}>Moderate (3-5/week)</option>
          <option value="active"      ${profile.activityLevel==='active'     ?'selected':''}>Active (6-7/week)</option>
          <option value="very_active" ${profile.activityLevel==='very_active'?'selected':''}>Very active</option>
        </select>
      </div>
      <div class="form-group"><label>Goal</label>
        <select id="p-goal">
          <option value="cut"      ${profile.goal==='cut'     ?'selected':''}>Cut</option>
          <option value="maintain" ${profile.goal==='maintain'?'selected':''}>Maintain</option>
          <option value="bulk"     ${profile.goal==='bulk'    ?'selected':''}>Bulk</option>
        </select>
      </div>
      <button class="btn btn-primary btn-full mt-8" id="save-profile-btn">Save changes</button>
    </div>

    ${macros ? `
    <div class="card">
      <div class="card-title">Live macro targets (auto-calculated)</div>
      <div style="display:grid;grid-template-columns:repeat(2,1fr);gap:8px;font-size:0.9rem">
        <div><div class="text-muted">Calories</div><div style="font-weight:700">${macros.calories} kcal</div></div>
        <div><div class="text-muted">Protein</div><div style="font-weight:700">${macros.protein}g</div></div>
        <div><div class="text-muted">Carbs</div><div style="font-weight:700">${macros.carbs}g</div></div>
        <div><div class="text-muted">Fat</div><div style="font-weight:700">${macros.fat}g</div></div>
        <div><div class="text-muted">BMR</div><div>${macros.bmr} kcal</div></div>
        <div><div class="text-muted">TDEE</div><div>${macros.tdee} kcal</div></div>
      </div>
    </div>` : ''}

    <div class="card">
      <div class="card-title">1RM — log / estimate</div>
      <div class="form-group"><label>Lift</label>
        <select id="orm-lift">
          ${LIFTS.map(l=>`<option value="${l}">${l}</option>`).join('')}
        </select>
      </div>
      <div style="display:grid;grid-template-columns:1fr 1fr;gap:8px">
        <div class="form-group"><label>Weight (kg)</label><input id="orm-weight" type="number" step="0.5"/></div>
        <div class="form-group"><label>Reps (1 = actual max)</label><input id="orm-reps" type="number" value="1" min="1" max="10"/></div>
      </div>
      <button class="btn btn-secondary btn-full" id="orm-save-btn">Save 1RM</button>
      <div id="orm-history" style="margin-top:12px"></div>
    </div>

    <div class="card">
      <div class="card-title">Gist sync</div>
      <div class="form-group"><label>Gist ID</label><input id="gist-id" value="${gist.gistId||''}" placeholder="your gist id"/></div>
      <div class="form-group"><label>Personal access token</label><input id="gist-pat" type="password" value="${gist.pat||''}" placeholder="ghp_..."/></div>
      <button class="btn btn-secondary btn-full" id="gist-save-btn">Save Gist config</button>
    </div>
  `;

  // Save profile
  document.getElementById('save-profile-btn').onclick = async () => {
    const updated = {
      ...profile,
      name:          document.getElementById('p-name').value.trim(),
      age:           +document.getElementById('p-age').value,
      sex:           document.getElementById('p-sex').value,
      heightCm:      +document.getElementById('p-height').value,
      weightKg:      +document.getElementById('p-weight').value,
      activityLevel: document.getElementById('p-activity').value,
      goal:          document.getElementById('p-goal').value,
      updatedAt:     new Date().toISOString(),
    };
    await saveProfile(updated);
    onUpdate && onUpdate();
    renderProfile(updated, onUpdate);
  };

  // 1RM
  const liftSel = document.getElementById('orm-lift');
  async function showOrmHistory() {
    const lift = liftSel.value;
    const hist = ormData[lift] || [];
    const div  = document.getElementById('orm-history');
    if (!hist.length) { div.innerHTML = '<p class="text-muted">No history for this lift yet.</p>'; return; }
    div.innerHTML = `<ul class="item-list">${
      hist.sort((a,b)=>b.date.localeCompare(a.date)).slice(0,5).map(h=>`
        <li><div><div style="font-weight:600">${h.value} kg</div><div class="text-muted">${h.method}</div></div><span>${h.date}</span></li>
      `).join('')
    }</ul>`;
  }
  liftSel.addEventListener('change', showOrmHistory);
  showOrmHistory();

  document.getElementById('orm-save-btn').onclick = async () => {
    const lift   = liftSel.value;
    const weight = +document.getElementById('orm-weight').value;
    const reps   = +document.getElementById('orm-reps').value;
    if (!weight) return;
    const value  = reps === 1 ? weight : estimate1RM(weight, reps);
    const method = reps === 1 ? 'Tested 1RM' : `Estimated from ${reps}@${weight}kg (Epley/Brzycki avg)`;
    await save1RM(pid, lift, value, method);
    ormData[lift] = await get1RMHistory(pid, lift);
    showOrmHistory();
  };

  // Gist
  document.getElementById('gist-save-btn').onclick = () => {
    setGistConfig(
      document.getElementById('gist-id').value.trim(),
      document.getElementById('gist-pat').value.trim(),
    );
    alert('Gist config saved.');
  };
}

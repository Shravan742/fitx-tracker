import { saveProfile, getProfile } from '../profiles.js';

const STEPS = ['basics', 'measurements', 'activity', 'goal', 'done'];

export async function renderOnboarding(profileId, onComplete) {
  const el = document.getElementById('view-onboarding');
  const existing = await getProfile(profileId) || { id: profileId };

  let step = 0;
  const data = { ...existing };

  el.innerHTML = `
    <div style="padding-top:24px">
      <h2 style="text-align:center;margin-bottom:4px">Welcome to FitX</h2>
      <p class="text-muted" style="text-align:center;margin-bottom:24px">Let's set up ${profileId === 'user1' ? 'your' : "Gouri's"} profile</p>
      <div class="step-indicator">
        ${STEPS.slice(0,-1).map((_, i) => `<div class="step-dot ${i===0?'active':''}" data-dot="${i}"></div>`).join('')}
      </div>
      <div id="onboard-body"></div>
    </div>
  `;

  render();

  function render() {
    document.querySelectorAll('.step-dot').forEach((d, i) => {
      d.classList.toggle('active', i <= step);
    });
    const body = document.getElementById('onboard-body');

    if (step === 0) {
      body.innerHTML = `
        <div class="card">
          <h3>Basic info</h3>
          <p class="text-muted" style="margin-bottom:14px;font-size:0.8rem">Required for BMR calculation</p>
          <div class="form-group">
            <label>Your name</label>
            <input id="ob-name" type="text" value="${data.name||''}" placeholder="e.g. Shravan" />
          </div>
          <div class="form-group">
            <label>Age</label>
            <input id="ob-age" type="number" value="${data.age||''}" placeholder="years" min="10" max="100"/>
          </div>
          <div class="form-group">
            <label>Biological sex</label>
            <select id="ob-sex">
              <option value="male" ${data.sex==='male'?'selected':''}>Male</option>
              <option value="female" ${data.sex==='female'?'selected':''}>Female</option>
            </select>
          </div>
          <div class="form-group">
            <label>Height (cm)</label>
            <input id="ob-height" type="number" value="${data.heightCm||''}" placeholder="e.g. 175" />
          </div>
          <div class="form-group">
            <label>Current weight (kg)</label>
            <input id="ob-weight" type="number" value="${data.weightKg||''}" placeholder="e.g. 72" step="0.1"/>
          </div>
          <button class="btn btn-primary btn-full mt-16" id="ob-next">Next</button>
        </div>`;

      document.getElementById('ob-next').onclick = () => {
        data.name      = document.getElementById('ob-name').value.trim();
        data.age       = +document.getElementById('ob-age').value;
        data.sex       = document.getElementById('ob-sex').value;
        data.heightCm  = +document.getElementById('ob-height').value;
        data.weightKg  = +document.getElementById('ob-weight').value;
        if (!data.age || !data.heightCm || !data.weightKg) {
          alert('Please fill in age, height, and weight.'); return;
        }
        step++; render();
      };

    } else if (step === 1) {
      const m = data.measurements || {};
      body.innerHTML = `
        <div class="card">
          <h3>Body measurements</h3>
          <p class="text-muted" style="margin-bottom:14px;font-size:0.8rem">Tracked over time — all optional</p>
          ${['waist','chest','hips','bicep','thigh'].map(part => `
          <div class="form-group">
            <label>${part.charAt(0).toUpperCase()+part.slice(1)} (cm)</label>
            <input id="ob-${part}" type="number" value="${m[part]||''}" placeholder="optional" step="0.1"/>
          </div>`).join('')}
          <div class="flex gap-8 mt-16">
            <button class="btn btn-secondary" id="ob-back">Back</button>
            <button class="btn btn-primary" style="flex:1" id="ob-next">Next</button>
          </div>
        </div>`;

      document.getElementById('ob-back').onclick = () => { step--; render(); };
      document.getElementById('ob-next').onclick = () => {
        data.measurements = {};
        ['waist','chest','hips','bicep','thigh'].forEach(p => {
          const v = +document.getElementById(`ob-${p}`).value;
          if (v) data.measurements[p] = v;
        });
        step++; render();
      };

    } else if (step === 2) {
      body.innerHTML = `
        <div class="card">
          <h3>Activity level</h3>
          <div class="form-group" style="margin-top:12px">
            <select id="ob-activity">
              <option value="sedentary"   ${data.activityLevel==='sedentary'  ?'selected':''}>Sedentary (desk job, no gym)</option>
              <option value="light"       ${data.activityLevel==='light'      ?'selected':''}>Light (1-2 days/week)</option>
              <option value="moderate"    ${data.activityLevel==='moderate'   ?'selected':''}>Moderate (3-5 days/week)</option>
              <option value="active"      ${data.activityLevel==='active'     ?'selected':''}>Active (6-7 days/week)</option>
              <option value="very_active" ${data.activityLevel==='very_active'?'selected':''}>Very active (2x/day)</option>
            </select>
          </div>
          <div class="flex gap-8 mt-16">
            <button class="btn btn-secondary" id="ob-back">Back</button>
            <button class="btn btn-primary" style="flex:1" id="ob-next">Next</button>
          </div>
        </div>`;

      document.getElementById('ob-back').onclick = () => { step--; render(); };
      document.getElementById('ob-next').onclick = () => {
        data.activityLevel = document.getElementById('ob-activity').value;
        step++; render();
      };

    } else if (step === 3) {
      body.innerHTML = `
        <div class="card">
          <h3>Your goal</h3>
          <div style="display:flex;flex-direction:column;gap:10px;margin-top:12px">
            ${[['cut','Cut (lose fat)','badge-cut'],['maintain','Maintain','badge-maintain'],['bulk','Bulk (build muscle)','badge-bulk']].map(([v,l,cls]) => `
            <button class="btn ${data.goal===v?'btn-primary':'btn-secondary'} btn-full ob-goal-btn" data-val="${v}">
              <span class="badge ${cls}">${l}</span>
            </button>`).join('')}
          </div>
          <div class="flex gap-8 mt-16">
            <button class="btn btn-secondary" id="ob-back">Back</button>
            <button class="btn btn-primary" style="flex:1" id="ob-next">Save & Start</button>
          </div>
        </div>`;

      document.querySelectorAll('.ob-goal-btn').forEach(b => {
        b.addEventListener('click', () => {
          data.goal = b.dataset.val;
          document.querySelectorAll('.ob-goal-btn').forEach(x => x.classList.replace('btn-primary','btn-secondary'));
          b.classList.replace('btn-secondary','btn-primary');
        });
      });

      document.getElementById('ob-back').onclick = () => { step--; render(); };
      document.getElementById('ob-next').onclick = async () => {
        if (!data.goal) { alert('Pick a goal.'); return; }
        const btn = document.getElementById('ob-next');
        btn.textContent = 'Saving…';
        btn.disabled = true;
        try {
          data.onboardingDone = true;
          data.createdAt = data.createdAt || new Date().toISOString();
          await saveProfile(data);
          onComplete(data);
        } catch(e) {
          btn.textContent = 'Save & Start';
          btn.disabled = false;
          alert('Error saving profile: ' + e.message);
        }
      };
    }
  }
}

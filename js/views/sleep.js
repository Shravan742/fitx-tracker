import { db } from '../db.js';
import { getActiveProfile } from '../profiles.js';

export async function renderSleep(profile) {
  const el  = document.getElementById('view-sleep');
  const pid = getActiveProfile();

  const logs = (await db.getAllFromIndex('sleep', 'by-profile-date',
    IDBKeyRange.bound([pid,'2000-01-01'],[pid,'9999-12-31'])))
    .sort((a,b) => b.date.localeCompare(a.date)).slice(0,14);

  el.innerHTML = `
    <h2>Sleep</h2>
    <div class="card">
      <div class="card-title">Log last night</div>
      <div class="form-group"><label>Date</label><input id="sl-date" type="date" value="${dayjs().format('YYYY-MM-DD')}"/></div>
      <div style="display:grid;grid-template-columns:1fr 1fr;gap:8px">
        <div class="form-group"><label>Bedtime</label><input id="sl-bed" type="time" value="22:30"/></div>
        <div class="form-group"><label>Wake time</label><input id="sl-wake" type="time" value="06:30"/></div>
      </div>
      <div class="form-group">
        <label>Quality (1 = terrible, 5 = great)</label>
        <select id="sl-quality">
          ${[1,2,3,4,5].map(v=>`<option value="${v}">${v}</option>`).join('')}
        </select>
      </div>
      <button class="btn btn-primary btn-full mt-8" id="log-sleep-btn">Save</button>
    </div>

    <div class="card">
      <div class="card-title">Recent sleep (14 days)</div>
      ${logs.length ? `
        <div class="chart-wrap"><canvas id="sleep-chart"></canvas></div>
        <ul class="item-list" style="margin-top:12px">
          ${logs.slice(0,5).map(l=>`
            <li>
              <div><div style="font-weight:600">${l.date}</div>
              <div class="text-muted">${l.bedtime} → ${l.waketime}</div></div>
              <span>${l.durationH}h ${l.durationM}m ${'⭐'.repeat(l.quality)}</span>
            </li>`).join('')}
        </ul>` : '<p class="text-muted">No sleep logged yet.</p>'}
    </div>
  `;

  document.getElementById('log-sleep-btn').onclick = async () => {
    const date     = document.getElementById('sl-date').value;
    const bedtime  = document.getElementById('sl-bed').value;
    const waketime = document.getElementById('sl-wake').value;
    const quality  = +document.getElementById('sl-quality').value;

    const bed  = dayjs(`${date} ${bedtime}`);
    let   wake = dayjs(`${date} ${waketime}`);
    if (wake.isBefore(bed)) wake = wake.add(1,'day');

    const mins = wake.diff(bed,'minute');
    await db.put('sleep', {
      profileId: pid, date, bedtime, waketime, quality,
      durationH: Math.floor(mins/60), durationM: mins%60,
      loggedAt: new Date().toISOString(),
    });
    renderSleep(profile);
  };

  if (logs.length) {
    const ctx = document.getElementById('sleep-chart').getContext('2d');
    new Chart(ctx, {
      type: 'bar',
      data: {
        labels: logs.map(l=>l.date.slice(5)).reverse(),
        datasets: [{
          label: 'Hours',
          data: logs.map(l => +(l.durationH + l.durationM/60).toFixed(1)).reverse(),
          backgroundColor: '#42a5f5aa',
          borderRadius: 4,
        }],
      },
      options: {
        responsive: true, maintainAspectRatio: false,
        plugins: { legend: { display: false } },
        scales: {
          x: { ticks: { color: '#8899aa', font: { size: 10 } }, grid: { display: false } },
          y: { ticks: { color: '#8899aa' }, grid: { color: '#ffffff11' }, min: 0, max: 12 },
        },
      },
    });
  }
}

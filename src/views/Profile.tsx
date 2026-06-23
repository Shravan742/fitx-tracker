import { useEffect, useState } from 'react';
import { useProfile } from '../lib/ProfileContext';
import { calcMacros } from '../lib/macros';
import { getActiveProfileId, logWeight, clearPlanCache } from '../lib/storage';
import { get1RMHistory, estimate1RM, save1RM } from '../lib/orm';
import { getGistConfig, setGistConfig, syncGist } from '../lib/sync';
import type { ActivityLevel, Goal, OneRepMax, Sex, Weekday } from '../types';
import Card from '../components/Card';
import dayjs from 'dayjs';

const LIFTS = ['Squat', 'Bench Press', 'Deadlift', 'Overhead Press'];

const WEEKDAYS: [Weekday, string][] = [
  ['monday', 'Mon'],
  ['tuesday', 'Tue'],
  ['wednesday', 'Wed'],
  ['thursday', 'Thu'],
  ['friday', 'Fri'],
  ['saturday', 'Sat'],
  ['sunday', 'Sun'],
];

export default function Profile() {
  const { profile, saveProfile } = useProfile();
  const pid = getActiveProfileId();
  const [form, setForm] = useState(profile);
  const [saved, setSaved] = useState(false);

  const [lift, setLift] = useState(LIFTS[0]);
  const [ormHistory, setOrmHistory] = useState<OneRepMax[]>([]);
  const [ormWeight, setOrmWeight] = useState('');
  const [ormReps, setOrmReps] = useState(1);

  const [gist, setGist] = useState(getGistConfig());

  useEffect(() => {
    setForm(profile);
  }, [profile]);

  useEffect(() => {
    (async () => {
      if (!profile) return;
      setOrmHistory(await get1RMHistory(pid, lift));
    })();
  }, [profile, pid, lift]);

  if (!profile || !form) return null;

  const macros = calcMacros(form);

  const handleSave = async () => {
    const today = dayjs().format('YYYY-MM-DD');
    const updated = { ...form, updatedAt: new Date().toISOString() };
    await saveProfile(updated);
    clearPlanCache(pid, today);
    if (updated.weightKg !== profile.weightKg) {
      logWeight(pid, today, updated.weightKg);
    }
    setSaved(true);
    setTimeout(() => setSaved(false), 2000);
  };

  const saveOrm = async () => {
    const weight = parseFloat(ormWeight);
    if (!weight) return;
    const value = ormReps === 1 ? weight : estimate1RM(weight, ormReps);
    const method = ormReps === 1 ? 'Tested 1RM' : `Estimated from ${ormReps}@${weight}kg (Epley/Brzycki avg)`;
    await save1RM(pid, lift, value, method);
    setOrmHistory(await get1RMHistory(pid, lift));
    setOrmWeight('');
  };

  const saveGistConfig = () => {
    setGistConfig(gist.gistId, gist.pat);
    alert('Gist config saved.');
  };

  return (
    <div className="space-y-4">
      <h1 className="text-xl font-bold">Profile</h1>

      <Card title="Edit profile">
        <div className="space-y-3">
          <label className="block">
            <span className="mb-1 block text-xs text-text-muted">Name</span>
            <input className="input" value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} />
          </label>
          <div className="grid grid-cols-2 gap-2">
            <label className="block">
              <span className="mb-1 block text-xs text-text-muted">Age</span>
              <input
                type="number"
                className="input"
                value={form.age}
                onChange={(e) => setForm({ ...form, age: +e.target.value })}
              />
            </label>
            <label className="block">
              <span className="mb-1 block text-xs text-text-muted">Sex</span>
              <select className="input" value={form.sex} onChange={(e) => setForm({ ...form, sex: e.target.value as Sex })}>
                <option value="male">Male</option>
                <option value="female">Female</option>
              </select>
            </label>
            <label className="block">
              <span className="mb-1 block text-xs text-text-muted">Height (cm)</span>
              <input
                type="number"
                className="input"
                value={form.heightCm}
                onChange={(e) => setForm({ ...form, heightCm: +e.target.value })}
              />
            </label>
            <label className="block">
              <span className="mb-1 block text-xs text-text-muted">Weight (kg)</span>
              <input
                type="number"
                step={0.1}
                className="input"
                value={form.weightKg}
                onChange={(e) => setForm({ ...form, weightKg: +e.target.value })}
              />
            </label>
          </div>
          <label className="block">
            <span className="mb-1 block text-xs text-text-muted">Activity level</span>
            <select
              className="input"
              value={form.activityLevel}
              onChange={(e) => setForm({ ...form, activityLevel: e.target.value as ActivityLevel })}
            >
              <option value="sedentary">Sedentary</option>
              <option value="light">Light (1-2/week)</option>
              <option value="moderate">Moderate (3-5/week)</option>
              <option value="active">Active (6-7/week)</option>
              <option value="very_active">Very active</option>
            </select>
          </label>
          <label className="block">
            <span className="mb-1 block text-xs text-text-muted">Goal</span>
            <select className="input" value={form.goal} onChange={(e) => setForm({ ...form, goal: e.target.value as Goal })}>
              <option value="cut">Cut</option>
              <option value="maintain">Maintain</option>
              <option value="bulk">Bulk</option>
            </select>
          </label>
          <div>
            <span className="mb-1 block text-xs text-text-muted">Rest / cooling days</span>
            <div className="grid grid-cols-4 gap-1.5">
              {WEEKDAYS.map(([val, label]) => {
                const active = (form.restDays ?? []).includes(val);
                return (
                  <button
                    key={val}
                    type="button"
                    onClick={() => {
                      const current = form.restDays ?? [];
                      const updated = active ? current.filter((d) => d !== val) : [...current, val];
                      setForm({ ...form, restDays: updated });
                    }}
                    className={`rounded-lg border p-2 text-center text-xs font-medium ${
                      active ? 'border-accent bg-accent/10 text-accent' : 'border-border'
                    }`}
                  >
                    {label}
                  </button>
                );
              })}
            </div>
          </div>
          <label className="block">
            <span className="mb-1 block text-xs text-text-muted">Weekly grocery budget (€)</span>
            <input
              type="number"
              min={0}
              step={5}
              className="input"
              value={form.weeklyBudget ?? 0}
              onChange={(e) => setForm({ ...form, weeklyBudget: +e.target.value })}
            />
          </label>
          <button className="btn-primary w-full" onClick={handleSave}>
            Save changes
          </button>
          {saved && <div className="rounded-lg bg-success/10 p-2 text-center text-sm text-success">✓ Saved</div>}
        </div>
      </Card>

      {macros && (
        <Card title="Live macro targets (auto-calculated)">
          <div className="grid grid-cols-2 gap-3 text-sm">
            <MacroStat label="Calories" value={`${macros.calories} kcal`} />
            <MacroStat label="Protein" value={`${macros.protein}g`} />
            <MacroStat label="Carbs" value={`${macros.carbs}g`} />
            <MacroStat label="Fat" value={`${macros.fat}g`} />
            <MacroStat label="BMR" value={`${macros.bmr} kcal`} muted />
            <MacroStat label="TDEE" value={`${macros.tdee} kcal`} muted />
          </div>
        </Card>
      )}

      <Card title="1RM — log / estimate">
        <div className="space-y-3">
          <label className="block">
            <span className="mb-1 block text-xs text-text-muted">Lift</span>
            <select className="input" value={lift} onChange={(e) => setLift(e.target.value)}>
              {LIFTS.map((l) => (
                <option key={l}>{l}</option>
              ))}
            </select>
          </label>
          <div className="grid grid-cols-2 gap-2">
            <label className="block">
              <span className="mb-1 block text-xs text-text-muted">Weight (kg)</span>
              <input
                type="number"
                step={0.5}
                className="input"
                value={ormWeight}
                onChange={(e) => setOrmWeight(e.target.value)}
              />
            </label>
            <label className="block">
              <span className="mb-1 block text-xs text-text-muted">Reps (1 = actual max)</span>
              <input
                type="number"
                min={1}
                max={10}
                className="input"
                value={ormReps}
                onChange={(e) => setOrmReps(+e.target.value)}
              />
            </label>
          </div>
          <button className="btn-secondary w-full" onClick={saveOrm}>
            Save 1RM
          </button>
          {ormHistory.length ? (
            <div className="space-y-2">
              {[...ormHistory]
                .sort((a, b) => b.date.localeCompare(a.date))
                .slice(0, 5)
                .map((h, i) => (
                  <div key={i} className="flex items-center justify-between rounded-lg bg-surface2 px-3 py-2 text-sm">
                    <div>
                      <div className="font-semibold">{h.value} kg</div>
                      <div className="text-xs text-text-muted">{h.method}</div>
                    </div>
                    <span className="text-xs text-text-muted">{h.date}</span>
                  </div>
                ))}
            </div>
          ) : (
            <p className="text-sm text-text-muted">No history for this lift yet.</p>
          )}
        </div>
      </Card>

      <Card title="Gist sync">
        <div className="space-y-3">
          <label className="block">
            <span className="mb-1 block text-xs text-text-muted">Gist ID</span>
            <input
              className="input"
              placeholder="your gist id"
              value={gist.gistId}
              onChange={(e) => setGist({ ...gist, gistId: e.target.value })}
            />
          </label>
          <label className="block">
            <span className="mb-1 block text-xs text-text-muted">Personal access token</span>
            <input
              type="password"
              className="input"
              placeholder="ghp_..."
              value={gist.pat}
              onChange={(e) => setGist({ ...gist, pat: e.target.value })}
            />
          </label>
          <div className="flex gap-2">
            <button className="btn-secondary flex-1" onClick={saveGistConfig}>
              Save Gist config
            </button>
            <button className="btn-secondary flex-1" onClick={() => syncGist()}>
              Sync now
            </button>
          </div>
        </div>
      </Card>
    </div>
  );
}

function MacroStat({ label, value, muted }: { label: string; value: string; muted?: boolean }) {
  return (
    <div>
      <div className="text-text-muted">{label}</div>
      <div className={muted ? '' : 'font-bold'}>{value}</div>
    </div>
  );
}

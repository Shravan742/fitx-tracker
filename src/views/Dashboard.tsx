import { useEffect, useMemo, useState } from 'react';
import dayjs from 'dayjs';
import { useNavigate } from 'react-router-dom';
import { useProfile } from '../lib/ProfileContext';
import { calcMacros } from '../lib/macros';
import { getMealsForDate, getSleepLogs, putProfile } from '../lib/db';
import { getActiveProfileId, getWeightHistory, logWeight, clearPlanCache, clearWeeklyPlanCache } from '../lib/storage';
import { computeWeightTrend } from '../lib/weightTrend';
import type { MealLog, SleepLog, WeightEntry } from '../types';
import Card from '../components/Card';
import WeightChart from '../components/WeightChart';

function greeting() {
  const h = new Date().getHours();
  if (h < 12) return 'morning';
  if (h < 17) return 'afternoon';
  return 'evening';
}

const QUALITY_EMOJI = ['', '😴', '😐', '🙂', '😊', '🤩'];

export default function Dashboard() {
  const { profile, refresh } = useProfile();
  const navigate = useNavigate();
  const [meals, setMeals] = useState<MealLog[]>([]);
  const [lastSleep, setLastSleep] = useState<SleepLog | null>(null);
  const [weights, setWeights] = useState<WeightEntry[]>([]);
  const [weightInput, setWeightInput] = useState('');
  const [inputError, setInputError] = useState(false);

  const today = dayjs().format('YYYY-MM-DD');
  const pid = getActiveProfileId();

  useEffect(() => {
    if (!profile) return;
    (async () => {
      const m = await getMealsForDate(pid, today);
      setMeals(m);
      const sleepLogs = await getSleepLogs(pid);
      const todays = sleepLogs.filter((s) => s.date === today);
      setLastSleep(todays[todays.length - 1] ?? sleepLogs[sleepLogs.length - 1] ?? null);
      setWeights(getWeightHistory(pid).filter((w) => w.date >= dayjs().subtract(60, 'day').format('YYYY-MM-DD')));
    })();
  }, [profile, pid, today]);

  const macros = useMemo(() => calcMacros(profile), [profile]);

  const eaten = useMemo(
    () =>
      meals.reduce(
        (acc, m) => ({
          calories: acc.calories + (m.calories || 0),
          protein: acc.protein + (m.protein || 0),
          carbs: acc.carbs + (m.carbs || 0),
          fat: acc.fat + (m.fat || 0),
        }),
        { calories: 0, protein: 0, carbs: 0, fat: 0 },
      ),
    [meals],
  );

  const remaining = macros
    ? {
        calories: macros.calories - eaten.calories,
        protein: macros.protein - eaten.protein,
      }
    : null;

  const todayWeight = weights.find((w) => w.date === today);
  const trend = profile ? computeWeightTrend(weights, profile.goal) : null;

  const handleLogWeight = async () => {
    const val = parseFloat(weightInput);
    if (!val || val < 30 || val > 300) {
      setInputError(true);
      return;
    }
    setInputError(false);
    const updated = logWeight(pid, today, val);
    setWeights(updated.filter((w) => w.date >= dayjs().subtract(60, 'day').format('YYYY-MM-DD')));
    setWeightInput('');
    if (profile) {
      await putProfile({ ...profile, weightKg: val });
      clearPlanCache(pid, today);
      clearWeeklyPlanCache(pid, today);
      await refresh();
    }
  };

  if (!profile) return null;

  return (
    <div className="space-y-4">
      <h1 className="text-xl font-bold">
        Good {greeting()}, {profile.name}
      </h1>

      {macros && (
        <Card title="Today's macros">
          <div className="mb-2 flex items-baseline justify-between">
            <span className="text-3xl font-bold">{eaten.calories}</span>
            <span className="text-sm text-text-muted">/ {macros.calories} kcal</span>
          </div>
          <div className="h-2 overflow-hidden rounded-full bg-surface2">
            <div
              className="h-full rounded-full bg-accent transition-all"
              style={{ width: `${Math.min(100, (eaten.calories / macros.calories) * 100)}%` }}
            />
          </div>
          <div className="mt-4 grid grid-cols-3 gap-2">
            <MacroPill value={`${eaten.protein}g`} label={`Protein / ${macros.protein}g`} color="text-info" />
            <MacroPill value={`${eaten.carbs}g`} label={`Carbs / ${macros.carbs}g`} color="text-accent2" />
            <MacroPill value={`${eaten.fat}g`} label={`Fat / ${macros.fat}g`} color="text-pink-300" />
          </div>
        </Card>
      )}

      {remaining && (
        <Card title="Remaining today">
          <div className="grid grid-cols-2 gap-2">
            <MacroPill value={String(remaining.calories)} label="kcal left" color="text-accent" big />
            <MacroPill value={`${remaining.protein}g`} label="protein left" color="text-info" big />
          </div>
        </Card>
      )}

      {lastSleep && (
        <Card title="Last night's sleep">
          <div className="flex items-center justify-between">
            <span className="text-2xl font-bold">
              {lastSleep.durationH}h {lastSleep.durationM}m
            </span>
            <span className="text-2xl">{QUALITY_EMOJI[lastSleep.quality] || '😐'}</span>
          </div>
        </Card>
      )}

      <Card title="Quick actions">
        <div className="flex flex-col gap-2">
          <button className="btn-secondary" onClick={() => navigate('/workout')}>
            Log workout
          </button>
          <button className="btn-secondary" onClick={() => navigate('/meals')}>
            Log meal
          </button>
          <button className="btn-secondary" onClick={() => navigate('/sleep')}>
            Log sleep
          </button>
        </div>
      </Card>

      <Card title="Weight tracking">
        <div className="mb-3 flex gap-2">
          <input
            type="number"
            step="0.1"
            className={`input ${inputError ? 'border-red-500' : ''}`}
            placeholder={todayWeight ? `${todayWeight.weightKg} kg (today)` : 'Enter kg…'}
            value={weightInput}
            onChange={(e) => setWeightInput(e.target.value)}
          />
          <button className="btn-primary whitespace-nowrap" onClick={handleLogWeight}>
            Log weight
          </button>
        </div>

        {weights.length >= 1 ? (
          <div className="h-32">
            <WeightChart entries={weights} />
          </div>
        ) : (
          <p className="text-sm text-text-muted">Log your weight daily to see your trend chart.</p>
        )}

        {trend ? (
          <>
            <div className="mt-3 flex items-center justify-between text-sm">
              <span className="text-text-muted">
                Trend: <strong className={trend.onTrack ? 'text-success' : 'text-accent2'}>{trend.trendLabel}</strong>
              </span>
              <span className="text-text-muted">
                {trend.latest} kg now · started {trend.first} kg
              </span>
            </div>
            {!trend.onTrack && (
              <p className="mt-1 text-xs text-accent2">
                Your trend doesn't match your {profile.goal} goal — your meal plan targets have been adjusted.
              </p>
            )}
          </>
        ) : weights.length === 1 ? (
          <p className="mt-2 text-sm text-text-muted">Keep logging daily — trend will appear after 2+ entries.</p>
        ) : null}
      </Card>

      <Card
        title={
          <span>
            Profile — <span className="rounded-full bg-accent/20 px-2 py-0.5 text-accent">{profile.goal}</span>
          </span>
        }
      >
        <div className="grid grid-cols-3 gap-2 text-sm">
          <div>
            <div className="text-text-muted">Weight</div>
            <div>{profile.weightKg} kg</div>
          </div>
          <div>
            <div className="text-text-muted">Height</div>
            <div>{profile.heightCm} cm</div>
          </div>
          <div>
            <div className="text-text-muted">BMR</div>
            <div>{macros?.bmr ?? '—'} kcal</div>
          </div>
        </div>
      </Card>
    </div>
  );
}

function MacroPill({
  value,
  label,
  color,
  big,
}: {
  value: string;
  label: string;
  color: string;
  big?: boolean;
}) {
  return (
    <div className="rounded-xl bg-surface2 p-2.5 text-center">
      <div className={`font-bold ${color} ${big ? 'text-2xl' : 'text-lg'}`}>{value}</div>
      <div className="text-[0.68rem] text-text-muted">{label}</div>
    </div>
  );
}

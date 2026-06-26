import { useEffect, useMemo, useState } from 'react';
import dayjs from 'dayjs';
import { useNavigate } from 'react-router-dom';
import { useProfile } from '../lib/ProfileContext';
import { calcMacros } from '../lib/macros';
import { getMealsForDate, getSleepLogs, putProfile } from '../lib/firestoreDb';
import { getActiveProfileId, getWeightHistory, logWeight, clearPlanCache, clearWeeklyPlanCache } from '../lib/storage';
import { computeWeightTrend } from '../lib/weightTrend';
import type { MealLog, SleepLog, WeightEntry } from '../types';
import { useAuth } from '../lib/AuthContext';
import Card from '../components/Card';
import WeightChart from '../components/WeightChart';
import ImportLocalData from '../components/ImportLocalData';
import IncomingInviteBanner from '../components/IncomingInviteBanner';
import { AnimatedNumber, ProgressBar, StaggerList, StaggerItem } from '../components/motion';

function greeting() {
  const h = new Date().getHours();
  if (h < 12) return 'morning';
  if (h < 17) return 'afternoon';
  return 'evening';
}

const QUALITY_EMOJI = ['', '😴', '😐', '🙂', '😊', '🤩'];

export default function Dashboard() {
  const { profile, refresh } = useProfile();
  const { user } = useAuth();
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
    <div className="space-y-5">
      <div>
        <p className="text-xs font-semibold uppercase tracking-widest text-accent">Good {greeting()}</p>
        <h1 className="text-2xl font-black tracking-tight">{profile.name}</h1>
      </div>

      <ImportLocalData uid={pid} />
      {user?.email && <IncomingInviteBanner uid={pid} email={user.email} />}

      {macros && (
        <Card variant="glow" delay={0.05} className="!p-5">
          <div className="mb-1 text-xs font-semibold uppercase tracking-wide text-text-muted">Today's calories</div>
          <div className="mb-3 flex items-baseline gap-2">
            <AnimatedNumber value={eaten.calories} className="text-4xl font-black tracking-tight text-text" />
            <span className="text-sm font-medium text-text-muted">/ {macros.calories} kcal</span>
          </div>
          <ProgressBar
            pct={(eaten.calories / macros.calories) * 100}
            className="h-2.5"
            gradient="linear-gradient(135deg, var(--color-accent), var(--color-accent2))"
          />
          <div className="mt-4 grid grid-cols-3 gap-2">
            <MacroPill value={`${eaten.protein}g`} label={`Protein / ${macros.protein}g`} color="text-info" />
            <MacroPill value={`${eaten.carbs}g`} label={`Carbs / ${macros.carbs}g`} color="text-accent2" />
            <MacroPill value={`${eaten.fat}g`} label={`Fat / ${macros.fat}g`} color="text-pink" />
          </div>
        </Card>
      )}

      <div className="grid grid-cols-2 gap-3">
        {remaining && (
          <Card variant="stat" delay={0.1} className="!p-3.5">
            <div className="text-[0.68rem] font-semibold uppercase tracking-wide text-text-muted">Kcal left</div>
            <AnimatedNumber value={remaining.calories} className="text-2xl font-black text-accent" />
          </Card>
        )}
        {lastSleep && (
          <Card variant="stat" delay={0.15} className="!p-3.5">
            <div className="text-[0.68rem] font-semibold uppercase tracking-wide text-text-muted">Last sleep</div>
            <div className="flex items-baseline gap-1.5">
              <span className="text-2xl font-black text-text">
                {lastSleep.durationH}h{lastSleep.durationM}m
              </span>
              <span className="text-lg">{QUALITY_EMOJI[lastSleep.quality] || '😐'}</span>
            </div>
          </Card>
        )}
      </div>

      <Card title="Quick actions" delay={0.2}>
        <StaggerList className="flex flex-col gap-2">
          <StaggerItem>
            <button className="btn-secondary w-full" onClick={() => navigate('/workout')}>
              Log workout
            </button>
          </StaggerItem>
          <StaggerItem>
            <button className="btn-secondary w-full" onClick={() => navigate('/meals')}>
              Log meal
            </button>
          </StaggerItem>
          <StaggerItem>
            <button className="btn-secondary w-full" onClick={() => navigate('/sleep')}>
              Log sleep
            </button>
          </StaggerItem>
        </StaggerList>
      </Card>

      <Card title="Weight tracking" delay={0.25}>
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
        delay={0.3}
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
  suffix = '',
}: {
  value: string | number;
  label: string;
  color: string;
  big?: boolean;
  suffix?: string;
}) {
  return (
    <div className="rounded-xl bg-surface2 p-2.5 text-center transition-colors">
      <div className={`font-bold ${color} ${big ? 'text-2xl' : 'text-lg'}`}>
        {typeof value === 'number' ? <AnimatedNumber value={value} suffix={suffix} /> : value}
      </div>
      <div className="text-[0.68rem] text-text-muted">{label}</div>
    </div>
  );
}

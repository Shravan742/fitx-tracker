import { useEffect, useMemo, useState } from 'react';
import dayjs from 'dayjs';
import exercises from '../data/exercises';
import type { Exercise, MuscleGroup, WorkoutSession } from '../types';
import { getActiveProfileId } from '../lib/storage';
import { getSessions } from '../lib/firestoreDb';
import { estimate1RM, save1RM } from '../lib/orm';
import { getTodaysFocus, SPLIT_LABEL } from '../lib/workoutSplit';
import { useProfile } from '../lib/ProfileContext';
import Card from '../components/Card';
import SessionForm from '../components/SessionForm';
import ExerciseDetail from '../components/ExerciseDetail';
import { StaggerList, StaggerItem } from '../components/motion';
import { motion, AnimatePresence } from 'framer-motion';

const MAJOR_LIFTS = ['Squat', 'Bench Press', 'Deadlift', 'Overhead Press'];
const MUSCLE_GROUPS: MuscleGroup[] = ['Chest', 'Back', 'Shoulders', 'Legs', 'Biceps', 'Triceps', 'Core'];
const MUSCLE_ICON: Record<MuscleGroup, string> = {
  Chest: '🏋️',
  Back: '🔙',
  Shoulders: '💪',
  Legs: '🦵',
  Biceps: '💪',
  Triceps: '💪',
  Core: '⚡',
};
const EQUIPMENT_ICON: Record<string, string> = {
  Barbell: '🏋️',
  Dumbbell: '🔵',
  Cable: '🔗',
  Machine: '⚙️',
  Bodyweight: '🤸',
};
const RECOMMENDED_PER_MUSCLE = 2;

export default function Workout() {
  const { profile } = useProfile();
  const pid = getActiveProfileId();
  const today = dayjs().format('YYYY-MM-DD');

  const [sessions, setSessions] = useState<WorkoutSession[]>([]);
  const [search, setSearch] = useState('');
  const [activeMuscle, setActiveMuscle] = useState<MuscleGroup | null>(null);
  const [selectedExercise, setSelectedExercise] = useState<Exercise | null>(null);
  const [showSessionForm, setShowSessionForm] = useState(false);
  const [showLibrary, setShowLibrary] = useState(false);

  // Quick 1RM form
  const [ormLift, setOrmLift] = useState(MAJOR_LIFTS[0]);
  const [ormWeight, setOrmWeight] = useState('');
  const [ormReps, setOrmReps] = useState(1);
  const [ormResult, setOrmResult] = useState<string | null>(null);
  const [ormSaving, setOrmSaving] = useState(false);

  const reloadData = async () => {
    const all = await getSessions(pid);
    setSessions(all.sort((a, b) => b.date.localeCompare(a.date)));
  };

  useEffect(() => {
    reloadData();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [pid]);

  const focus = useMemo(
    () => (profile ? getTodaysFocus(profile.goal, profile.restDays ?? [], today) : null),
    [profile, today],
  );

  const recommended = useMemo(() => {
    if (!focus || focus.isRest || !focus.muscles) return {};
    const byMuscle: Record<string, Exercise[]> = {};
    focus.muscles.forEach((m) => {
      byMuscle[m] = exercises.filter((ex) => ex.muscle === m).slice(0, RECOMMENDED_PER_MUSCLE);
    });
    return byMuscle;
  }, [focus]);

  const filtered = useMemo(() => {
    return exercises.filter((ex) => {
      if (activeMuscle && ex.muscle !== activeMuscle) return false;
      if (search && !ex.name.toLowerCase().includes(search.toLowerCase())) return false;
      return true;
    });
  }, [search, activeMuscle]);

  const grouped = useMemo(() => {
    const byMuscle: Record<string, Exercise[]> = {};
    filtered.forEach((ex) => {
      (byMuscle[ex.muscle] ??= []).push(ex);
    });
    return byMuscle;
  }, [filtered]);

  const recent = sessions.slice(0, 5);

  const saveOrm = async () => {
    const weight = parseFloat(ormWeight);
    if (!weight) {
      alert('Enter a weight.');
      return;
    }
    setOrmSaving(true);
    try {
      const value = ormReps === 1 ? weight : estimate1RM(weight, ormReps);
      const method = ormReps === 1 ? 'Tested 1RM' : `Estimated from ${ormReps} reps @ ${weight}kg`;
      await save1RM(pid, ormLift, value, method);
      setOrmResult(`✓ ${ormLift} 1RM saved: ${value} kg${ormReps > 1 ? ` (${method})` : ''}`);
      setOrmWeight('');
      await reloadData();
    } finally {
      setOrmSaving(false);
    }
  };

  if (selectedExercise) {
    return (
      <ExerciseDetail
        exercise={selectedExercise}
        onClose={() => {
          setSelectedExercise(null);
          reloadData();
        }}
      />
    );
  }

  return (
    <div className="space-y-4">
      <h1 className="text-xl font-bold">Workout</h1>

      {focus?.isRest ? (
        <Card className="card-glow text-center">
          <div className="mb-1 text-3xl">😌</div>
          <div className="text-lg font-bold">Rest day</div>
          <p className="mt-1 text-sm text-text-muted">
            Recovery is part of the plan — no recommended exercises today. Stretch, walk, or just relax.
          </p>
        </Card>
      ) : (
        focus && (
          <Card className="card-glow">
            <div className="flex items-center justify-between">
              <div>
                <div className="text-xs uppercase tracking-wide text-text-muted">Today's Focus</div>
                <div className="gradient-text text-xl font-extrabold">{focus.dayType}</div>
              </div>
              <span className="rounded-full bg-surface2 px-2.5 py-1 text-xs font-medium text-text-muted">
                {SPLIT_LABEL[focus.splitType!]} split
              </span>
            </div>
          </Card>
        )
      )}

      {!focus?.isRest && Object.keys(recommended).length > 0 && (
        <Card title="Recommended Exercises" delay={0.05}>
          <p className="mb-3 text-xs text-text-muted">Tap an exercise to log your sets — the logger opens right at the top, no scrolling needed.</p>
          <div className="space-y-4">
            {Object.entries(recommended).map(([muscle, exs]) => (
              <div key={muscle}>
                <div className="mb-2 text-sm font-semibold text-accent2">
                  {MUSCLE_ICON[muscle as MuscleGroup]} {muscle}
                </div>
                <StaggerList className="flex flex-wrap gap-1.5">
                  {exs.map((ex) => (
                    <StaggerItem key={ex.name} className="inline-block">
                      <motion.button
                        whileHover={{ scale: 1.05 }}
                        whileTap={{ scale: 0.93 }}
                        onClick={() => setSelectedExercise(ex)}
                        className="flex items-center gap-1.5 rounded-full bg-surface2 px-3 py-1.5 text-xs font-medium transition-colors hover:bg-border"
                      >
                        {EQUIPMENT_ICON[ex.equipment]} {ex.name}
                        <span className="rounded-full bg-accent px-1.5 py-0.5 text-[0.62rem] font-bold text-bg">+ Log</span>
                      </motion.button>
                    </StaggerItem>
                  ))}
                </StaggerList>
              </div>
            ))}
          </div>
        </Card>
      )}

      <Card title="Log / Estimate 1RM">
        <div className="grid grid-cols-3 gap-2">
          <label className="block">
            <span className="mb-1 block text-xs text-text-muted">Lift</span>
            <select className="input" value={ormLift} onChange={(e) => setOrmLift(e.target.value)}>
              {MAJOR_LIFTS.map((l) => (
                <option key={l}>{l}</option>
              ))}
            </select>
          </label>
          <label className="block">
            <span className="mb-1 block text-xs text-text-muted">Weight (kg)</span>
            <input
              type="number"
              step={0.5}
              className="input"
              placeholder="100"
              value={ormWeight}
              onChange={(e) => setOrmWeight(e.target.value)}
            />
          </label>
          <label className="block">
            <span className="mb-1 block text-xs text-text-muted">Reps (1 = actual)</span>
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
        <button className="btn-secondary mt-3 w-full disabled:cursor-not-allowed" onClick={saveOrm} disabled={ormSaving}>
          {ormSaving ? <InlineSpinner /> : 'Save 1RM'}
        </button>
        <AnimatePresence>
          {ormResult && (
            <motion.div
              initial={{ opacity: 0, y: -6, height: 0 }}
              animate={{ opacity: 1, y: 0, height: 'auto' }}
              exit={{ opacity: 0, height: 0 }}
              className="mt-2 overflow-hidden rounded-lg bg-success/10 p-2 text-sm text-success"
            >
              {ormResult}
            </motion.div>
          )}
        </AnimatePresence>
      </Card>

      {showSessionForm ? (
        <SessionForm
          pid={pid}
          date={today}
          onDone={() => {
            setShowSessionForm(false);
            reloadData();
          }}
          onCancel={() => setShowSessionForm(false)}
        />
      ) : (
        <button className="btn-primary w-full" onClick={() => setShowSessionForm(true)}>
          ＋ Log session
        </button>
      )}

      <button
        className="btn-secondary w-full"
        onClick={() => setShowLibrary((v) => !v)}
      >
        {showLibrary ? '▲ Hide' : '▼ Browse'} full exercise library ({exercises.length})
      </button>

      {showLibrary && (
        <Card>
          <input
            className="input mb-3"
            placeholder="🔍 Search for exercises"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
          <div className="mb-4 flex flex-wrap gap-1.5">
            <button
              onClick={() => setActiveMuscle(null)}
              className={`rounded-full px-3 py-1.5 text-xs font-medium ${
                !activeMuscle ? 'bg-accent text-bg' : 'bg-surface2 text-text-muted'
              }`}
            >
              🍽️ All
            </button>
            {MUSCLE_GROUPS.map((m) => (
              <button
                key={m}
                onClick={() => setActiveMuscle(m)}
                className={`rounded-full px-3 py-1.5 text-xs font-medium ${
                  activeMuscle === m ? 'bg-accent text-bg' : 'bg-surface2 text-text-muted'
                }`}
              >
                {MUSCLE_ICON[m]} {m}
              </button>
            ))}
          </div>

          <div className="space-y-4">
            {Object.entries(grouped).map(([muscle, exs]) => (
              <div key={muscle}>
                <div className="mb-2 text-sm font-semibold text-accent2">
                  {MUSCLE_ICON[muscle as MuscleGroup]} {muscle}
                </div>
                <StaggerList className="flex flex-wrap gap-1.5">
                  {exs.map((ex) => (
                    <StaggerItem key={ex.name} className="inline-block">
                      <motion.button
                        whileHover={{ scale: 1.05 }}
                        whileTap={{ scale: 0.93 }}
                        onClick={() => setSelectedExercise(ex)}
                        className="rounded-full bg-surface2 px-3 py-1.5 text-xs font-medium transition-colors hover:bg-border"
                      >
                        {EQUIPMENT_ICON[ex.equipment]} {ex.name}
                      </motion.button>
                    </StaggerItem>
                  ))}
                </StaggerList>
              </div>
            ))}
          </div>
        </Card>
      )}

      <Card title="Recent Sessions">
        {recent.length ? (
          <StaggerList className="space-y-2">
            {recent.map((s, i) => (
              <StaggerItem key={i}>
                <div className="flex items-center justify-between rounded-lg bg-surface2 px-3 py-2 transition-colors hover:bg-border/50">
                  <div>
                    <div className="text-sm font-semibold">{s.date}</div>
                    <div className="text-xs text-text-muted">
                      {(s.entries || []).map((e) => e.exercise).join(', ').slice(0, 60) || 'No exercises'}
                    </div>
                  </div>
                  <span className="text-xs font-semibold text-accent">
                    {(s.entries || []).reduce((a, e) => a + (e.sets || 0), 0)} sets
                  </span>
                </div>
              </StaggerItem>
            ))}
          </StaggerList>
        ) : (
          <p className="text-sm text-text-muted">No sessions yet — log your first one above.</p>
        )}
      </Card>
    </div>
  );
}

function InlineSpinner() {
  return (
    <span className="inline-flex items-center justify-center">
      <motion.span
        className="h-3.5 w-3.5 rounded-full border-2 border-text-muted/40 border-t-text"
        animate={{ rotate: 360 }}
        transition={{ duration: 0.7, repeat: Infinity, ease: 'linear' }}
      />
    </span>
  );
}

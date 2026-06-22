import { useEffect, useMemo, useState } from 'react';
import dayjs from 'dayjs';
import exercises from '../data/exercises';
import type { Exercise, MuscleGroup, WorkoutSession } from '../types';
import { getActiveProfileId } from '../lib/storage';
import { getSessions } from '../lib/db';
import { getSuggestion, type Suggestion } from '../lib/orm';
import { estimate1RM, save1RM } from '../lib/orm';
import Card from '../components/Card';
import SuggestionCard from '../components/SuggestionCard';
import SessionForm from '../components/SessionForm';
import ExerciseDetail from '../components/ExerciseDetail';

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

export default function Workout() {
  const pid = getActiveProfileId();
  const today = dayjs().format('YYYY-MM-DD');

  const [sessions, setSessions] = useState<WorkoutSession[]>([]);
  const [suggestions, setSuggestions] = useState<Record<string, Suggestion>>({});
  const [search, setSearch] = useState('');
  const [activeMuscle, setActiveMuscle] = useState<MuscleGroup | null>(null);
  const [selectedExercise, setSelectedExercise] = useState<Exercise | null>(null);
  const [showSessionForm, setShowSessionForm] = useState(false);

  // Quick 1RM form
  const [ormLift, setOrmLift] = useState(MAJOR_LIFTS[0]);
  const [ormWeight, setOrmWeight] = useState('');
  const [ormReps, setOrmReps] = useState(1);
  const [ormResult, setOrmResult] = useState<string | null>(null);

  const reloadData = async () => {
    const all = await getSessions(pid);
    setSessions(all.sort((a, b) => b.date.localeCompare(a.date)));
    const sugg: Record<string, Suggestion> = {};
    for (const lift of MAJOR_LIFTS) {
      sugg[lift] = await getSuggestion(pid, lift);
    }
    setSuggestions(sugg);
  };

  useEffect(() => {
    reloadData();
  }, [pid]);

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
    const value = ormReps === 1 ? weight : estimate1RM(weight, ormReps);
    const method = ormReps === 1 ? 'Tested 1RM' : `Estimated from ${ormReps} reps @ ${weight}kg`;
    await save1RM(pid, ormLift, value, method);
    setOrmResult(`✓ ${ormLift} 1RM saved: ${value} kg${ormReps > 1 ? ` (${method})` : ''}`);
    setOrmWeight('');
    reloadData();
  };

  if (selectedExercise) {
    return <ExerciseDetail exercise={selectedExercise} onClose={() => setSelectedExercise(null)} />;
  }

  return (
    <div className="space-y-4">
      <h1 className="text-xl font-bold">Workout</h1>

      <Card title="Today's Suggestions">
        <div className="grid grid-cols-2 gap-2">
          {MAJOR_LIFTS.map((lift) => (
            <SuggestionCard key={lift} lift={lift} suggestion={suggestions[lift] ?? null} />
          ))}
        </div>
      </Card>

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
        <button className="btn-secondary mt-3 w-full" onClick={saveOrm}>
          Save 1RM
        </button>
        {ormResult && <div className="mt-2 rounded-lg bg-success/10 p-2 text-sm text-success">{ormResult}</div>}
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

      <Card
        title={
          <span>
            Exercise Library <span className="ml-1 rounded-full bg-surface2 px-2 py-0.5 text-text">{exercises.length}</span>
          </span>
        }
      >
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
              !activeMuscle ? 'bg-accent text-white' : 'bg-surface2 text-text-muted'
            }`}
          >
            🍽️ All
          </button>
          {MUSCLE_GROUPS.map((m) => (
            <button
              key={m}
              onClick={() => setActiveMuscle(m)}
              className={`rounded-full px-3 py-1.5 text-xs font-medium ${
                activeMuscle === m ? 'bg-accent text-white' : 'bg-surface2 text-text-muted'
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
              <div className="flex flex-wrap gap-1.5">
                {exs.map((ex) => (
                  <button
                    key={ex.name}
                    onClick={() => setSelectedExercise(ex)}
                    className="rounded-full bg-surface2 px-3 py-1.5 text-xs font-medium hover:bg-border"
                  >
                    {EQUIPMENT_ICON[ex.equipment]} {ex.name}
                  </button>
                ))}
              </div>
            </div>
          ))}
        </div>
      </Card>

      <Card title="Recent Sessions">
        {recent.length ? (
          <div className="space-y-2">
            {recent.map((s, i) => (
              <div key={i} className="flex items-center justify-between rounded-lg bg-surface2 px-3 py-2">
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
            ))}
          </div>
        ) : (
          <p className="text-sm text-text-muted">No sessions yet — log your first one above.</p>
        )}
      </Card>
    </div>
  );
}

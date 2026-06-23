import { useState } from 'react';
import dayjs from 'dayjs';
import type { Exercise } from '../types';
import { getActiveProfileId } from '../lib/storage';
import { logExerciseToTodaysSession } from '../lib/db';
import ExerciseDemoLoop from './ExerciseDemoLoop';
import YouTubeEmbed from './YouTubeEmbed';
import BodyMap from './BodyMap';

const EQUIPMENT_ICON: Record<string, string> = {
  Barbell: '🏋️',
  Dumbbell: '🔵',
  Cable: '🔗',
  Machine: '⚙️',
  Bodyweight: '🤸',
};

export default function ExerciseDetail({ exercise, onClose }: { exercise: Exercise; onClose: () => void }) {
  const [sets, setSets] = useState(exercise.defaultSets);
  const [reps, setReps] = useState(exercise.defaultReps);
  const [weight, setWeight] = useState('');
  const [logged, setLogged] = useState(false);

  const handleLog = async () => {
    const pid = getActiveProfileId();
    const today = dayjs().format('YYYY-MM-DD');
    await logExerciseToTodaysSession(pid, today, {
      exercise: exercise.name,
      sets,
      reps,
      weight: parseFloat(weight) || 0,
    });
    setLogged(true);
    setTimeout(() => setLogged(false), 2500);
  };

  return (
    <div className="space-y-4">
      <button className="btn-secondary btn-sm" onClick={onClose}>
        ← Back to library
      </button>

      <div>
        <h2 className="text-xl font-bold">{exercise.name}</h2>
        <div className="mt-2 flex flex-wrap gap-1.5">
          <span className="rounded-full bg-surface2 px-2.5 py-1 text-xs font-medium text-text">
            {EQUIPMENT_ICON[exercise.equipment]} {exercise.equipment}
          </span>
          {exercise.musclesPrimary.map((m) => (
            <span key={m} className="rounded-full bg-accent/15 px-2.5 py-1 text-xs font-medium text-accent">
              {m}
            </span>
          ))}
          {(exercise.musclesSecondary ?? []).map((m) => (
            <span key={m} className="rounded-full bg-surface2 px-2.5 py-1 text-xs font-medium text-text-muted">
              {m}
            </span>
          ))}
        </div>
      </div>

      <ExerciseDemoLoop name={exercise.name} />
      <YouTubeEmbed ytId={exercise.ytId} />

      <div className="rounded-xl bg-surface2 p-4">
        <h4 className="mb-3 text-sm font-semibold">🫀 Exercise Details</h4>
        <BodyMap muscle={exercise.muscle} exerciseName={exercise.name} />
        <div className="mt-4 space-y-2 text-sm">
          <DetailRow label="Body Part" value={exercise.muscle} />
          <DetailRow label="Equipment" value={exercise.equipment} />
          <DetailRow label="Primary Muscles" value={exercise.musclesPrimary.join(', ')} />
          {exercise.musclesSecondary?.length ? (
            <DetailRow label="Secondary Muscles" value={exercise.musclesSecondary.join(', ')} />
          ) : null}
        </div>
      </div>

      <Section title="🔧 Equipment Setup">
        <p>{exercise.setup}</p>
      </Section>

      <Section title="📋 How To Perform">
        <ol className="list-decimal space-y-1.5 pl-5">
          {exercise.steps.map((s, i) => (
            <li key={i}>{s}</li>
          ))}
        </ol>
      </Section>

      <Section title="💡 Pro Tip" className="bg-accent2/10">
        <p>{exercise.tips}</p>
      </Section>

      <Section title="⚠️ Common Mistake" className="bg-accent/10">
        <p>{exercise.mistakes}</p>
      </Section>

      <div className="rounded-xl border border-accent/30 bg-surface2 p-4 card-glow">
        <h4 className="mb-1 text-sm font-semibold">📝 Log Your Sets</h4>
        <p className="mb-3 text-xs text-text-muted">
          Recommended: <strong>{exercise.defaultSets} sets × {exercise.defaultReps} reps</strong> — adjust below and log
          straight to today's session.
        </p>
        <div className="grid grid-cols-3 gap-2">
          <label className="block">
            <span className="mb-1 block text-xs text-text-muted">Sets</span>
            <input type="number" min={1} className="input" value={sets} onChange={(e) => setSets(+e.target.value)} />
          </label>
          <label className="block">
            <span className="mb-1 block text-xs text-text-muted">Reps</span>
            <input type="number" min={1} className="input" value={reps} onChange={(e) => setReps(+e.target.value)} />
          </label>
          <label className="block">
            <span className="mb-1 block text-xs text-text-muted">Weight (kg)</span>
            <input
              type="number"
              min={0}
              step={0.5}
              className="input"
              placeholder="0"
              value={weight}
              onChange={(e) => setWeight(e.target.value)}
            />
          </label>
        </div>
        <button className="btn-primary mt-3 w-full" onClick={handleLog}>
          + Log this exercise
        </button>
        {logged && (
          <div className="mt-2 rounded-lg bg-success/10 p-2 text-center text-sm text-success">
            ✓ Logged {sets} × {reps} {weight ? `@ ${weight}kg` : ''} to today's session
          </div>
        )}
      </div>
    </div>
  );
}

function DetailRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex justify-between gap-3 border-b border-border pb-1.5">
      <span className="text-text-muted">{label}</span>
      <span className="text-right font-semibold">{value}</span>
    </div>
  );
}

function Section({ title, children, className = '' }: { title: string; children: React.ReactNode; className?: string }) {
  return (
    <div className={`rounded-xl p-3 ${className}`}>
      <h4 className="mb-2 text-sm font-semibold">{title}</h4>
      <div className="text-sm text-text-muted leading-relaxed">{children}</div>
    </div>
  );
}

import { useEffect, useState } from 'react';
import dayjs from 'dayjs';
import { motion, AnimatePresence, useReducedMotion } from 'framer-motion';
import type { Exercise } from '../types';
import { getActiveProfileId } from '../lib/storage';
import { logExerciseToTodaysSession } from '../lib/db';
import { getSuggestion, type Suggestion } from '../lib/orm';
import ExerciseDemoLoop from './ExerciseDemoLoop';
import BodyMap from './BodyMap';

const EQUIPMENT_ICON: Record<string, string> = {
  Barbell: '🏋️',
  Dumbbell: '🔵',
  Cable: '🔗',
  Machine: '⚙️',
  Bodyweight: '🤸',
};

type SetRow = { reps: number; weight: string };

function defaultRows(exercise: Exercise): SetRow[] {
  return Array.from({ length: exercise.defaultSets }, () => ({ reps: exercise.defaultReps, weight: '' }));
}

export default function ExerciseDetail({ exercise, onClose }: { exercise: Exercise; onClose: () => void }) {
  const [rows, setRows] = useState<SetRow[]>(defaultRows(exercise));
  const [suggestion, setSuggestion] = useState<Suggestion | null>(null);
  const [logged, setLogged] = useState(false);
  const [logging, setLogging] = useState(false);
  const reduceMotion = useReducedMotion();

  useEffect(() => {
    let cancelled = false;
    const pid = getActiveProfileId();
    getSuggestion(pid, exercise.name).then((s) => {
      if (cancelled) return;
      setSuggestion(s);
      if (s.type === 'percentage') {
        setRows(s.sets.flatMap((phase) => Array.from({ length: phase.sets }, () => ({ reps: phase.reps, weight: String(phase.weight) }))));
      }
    });
    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [exercise.name]);

  const updateRow = (i: number, patch: Partial<SetRow>) => {
    setRows((r) => r.map((row, idx) => (idx === i ? { ...row, ...patch } : row)));
  };
  const addRow = () => setRows((r) => [...r, { reps: r[r.length - 1]?.reps ?? exercise.defaultReps, weight: r[r.length - 1]?.weight ?? '' }]);
  const removeRow = (i: number) => setRows((r) => (r.length > 1 ? r.filter((_, idx) => idx !== i) : r));

  const handleLog = async () => {
    setLogging(true);
    try {
      const pid = getActiveProfileId();
      const today = dayjs().format('YYYY-MM-DD');
      const perSet = rows.map((r) => ({ reps: r.reps, weight: parseFloat(r.weight) || 0 }));
      const heaviest = perSet.reduce((max, s) => (s.weight > max.weight ? s : max), perSet[0]);
      await logExerciseToTodaysSession(pid, today, {
        exercise: exercise.name,
        sets: perSet.length,
        reps: heaviest.reps,
        weight: heaviest.weight,
        perSet,
      });
      setLogged(true);
      setTimeout(() => setLogged(false), 2500);
    } finally {
      setLogging(false);
    }
  };

  return (
    <motion.div
      className="space-y-4"
      initial={reduceMotion ? undefined : { opacity: 0, x: 16 }}
      animate={{ opacity: 1, x: 0 }}
      transition={{ duration: 0.3, ease: [0.16, 1, 0.3, 1] }}
    >
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

      <div className="rounded-xl border border-accent/30 bg-surface2 p-4 card-glow">
        <h4 className="mb-1 text-sm font-semibold">📝 Log Your Sets</h4>
        {suggestion?.type === 'percentage' ? (
          <p className="mb-3 text-xs text-text-muted">
            Pre-filled from your 1RM (<strong className="text-text">{suggestion.orm}kg</strong>) — each set ramps up in
            weight. Edit any row, or add/remove sets.
          </p>
        ) : (
          <p className="mb-3 text-xs text-text-muted">
            Recommended: <strong>{exercise.defaultSets} sets × {exercise.defaultReps} reps</strong> — give each set its
            own weight (e.g. ramp up: 10kg, 30kg, 50kg), or add a set with the same numbers.
          </p>
        )}
        <div className="space-y-2">
          <div className="grid grid-cols-[2rem_1fr_1fr_2rem] gap-2 px-1 text-[0.65rem] uppercase tracking-wide text-text-muted">
            <span>Set</span>
            <span>Reps</span>
            <span>Weight (kg)</span>
            <span />
          </div>
          {rows.map((row, i) => (
            <div key={i} className="grid grid-cols-[2rem_1fr_1fr_2rem] items-center gap-2">
              <span className="text-center text-sm font-semibold text-text-muted">{i + 1}</span>
              <input
                type="number"
                min={1}
                className="input"
                value={row.reps}
                onChange={(e) => updateRow(i, { reps: +e.target.value })}
              />
              <input
                type="number"
                min={0}
                step={0.5}
                className="input"
                placeholder="0"
                value={row.weight}
                onChange={(e) => updateRow(i, { weight: e.target.value })}
              />
              <button
                type="button"
                aria-label="Remove set"
                className="text-text-muted transition-colors hover:text-danger disabled:opacity-30"
                onClick={() => removeRow(i)}
                disabled={rows.length <= 1}
              >
                ✕
              </button>
            </div>
          ))}
        </div>
        <button type="button" className="btn-secondary btn-sm mt-3" onClick={addRow}>
          + Add set
        </button>
        <button className="btn-primary mt-3 w-full disabled:cursor-not-allowed" onClick={handleLog} disabled={logging}>
          {logging ? (
            <motion.span
              className="mx-auto inline-block h-3.5 w-3.5 rounded-full border-2 border-bg/40 border-t-bg"
              animate={{ rotate: 360 }}
              transition={{ duration: 0.7, repeat: Infinity, ease: 'linear' }}
            />
          ) : (
            `+ Log ${rows.length} set${rows.length === 1 ? '' : 's'}`
          )}
        </button>
        <AnimatePresence>
          {logged && (
            <motion.div
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: 'auto' }}
              exit={{ opacity: 0, height: 0 }}
              className="mt-2 overflow-hidden rounded-lg bg-success/10 p-2 text-center text-sm text-success"
            >
              ✓ Logged {rows.length} set{rows.length === 1 ? '' : 's'} to today's session
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      <ExerciseDemoLoop name={exercise.name} />

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
    </motion.div>
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

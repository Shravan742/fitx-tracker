import { useState } from 'react';
import exercises from '../data/exercises';
import { addSession, getSessionForDate, updateSession } from '../lib/db';
import type { WorkoutSet } from '../types';

interface DraftEntry extends WorkoutSet {
  repsCompleted: number;
}

export default function SessionForm({
  pid,
  date,
  onDone,
  onCancel,
}: {
  pid: string;
  date: string;
  onDone: () => void;
  onCancel: () => void;
}) {
  const [entries, setEntries] = useState<DraftEntry[]>([]);
  const [exName, setExName] = useState(exercises[0]?.name ?? '');
  const [sets, setSets] = useState(3);
  const [reps, setReps] = useState(8);
  const [weight, setWeight] = useState(0);
  const [repsDone, setRepsDone] = useState(8);
  const [notes, setNotes] = useState('');

  const addEntry = () => {
    setEntries((e) => [...e, { exercise: exName, sets, reps, weight, repsCompleted: repsDone }]);
  };

  const removeEntry = (i: number) => {
    setEntries((e) => e.filter((_, idx) => idx !== i));
  };

  const save = async () => {
    if (!entries.length) {
      alert('Add at least one exercise.');
      return;
    }
    const newEntries: WorkoutSet[] = entries.map((e) => ({
      exercise: e.exercise,
      sets: e.sets,
      reps: e.reps,
      weight: e.weight,
    }));

    // Merge into today's existing session (e.g. one started by quick-logging an
    // exercise from its detail view) instead of creating a second row for the
    // same day, which would fragment Recent Sessions and the 1RM suggestions.
    const existing = await getSessionForDate(pid, date);
    if (existing) {
      await updateSession({
        ...existing,
        entries: [...existing.entries, ...newEntries],
        notes: notes || existing.notes,
      });
    } else {
      await addSession({ profileId: pid, date, entries: newEntries, notes });
    }
    onDone();
  };

  return (
    <div className="rounded-2xl border border-border bg-card p-4">
      <h3 className="mb-3 text-sm font-semibold uppercase tracking-wide text-text-muted">Session — {date}</h3>

      {entries.length === 0 && <p className="mb-3 text-sm text-text-muted">No exercises added yet.</p>}

      <div className="mb-3 space-y-2">
        {entries.map((e, i) => (
          <div key={i} className="flex items-center justify-between rounded-lg bg-surface2 px-3 py-2">
            <div>
              <div className="text-sm font-semibold">{e.exercise}</div>
              <div className="text-xs text-text-muted">
                {e.sets} × {e.reps} reps @ {e.weight}kg
                {e.repsCompleted < e.reps && <span className="text-accent2"> ({e.repsCompleted} done)</span>}
              </div>
            </div>
            <button onClick={() => removeEntry(i)} className="text-accent">
              ✕
            </button>
          </div>
        ))}
      </div>

      <div className="space-y-3 rounded-xl bg-surface2 p-3">
        <label className="block">
          <span className="mb-1 block text-xs text-text-muted">Exercise</span>
          <select className="input" value={exName} onChange={(e) => setExName(e.target.value)}>
            {exercises.map((ex) => (
              <option key={ex.name} value={ex.name}>
                {ex.name} ({ex.equipment})
              </option>
            ))}
          </select>
        </label>
        <div className="grid grid-cols-3 gap-2">
          <NumField label="Sets" value={sets} onChange={setSets} />
          <NumField label="Reps target" value={reps} onChange={setReps} />
          <NumField label="Weight (kg)" value={weight} onChange={setWeight} step={0.5} />
        </div>
        <NumField label="Reps completed" value={repsDone} onChange={setRepsDone} />
        <button className="btn-secondary w-full" onClick={addEntry}>
          ＋ Add exercise
        </button>
      </div>

      <label className="mt-3 block">
        <span className="mb-1 block text-xs text-text-muted">Session notes</span>
        <textarea
          className="input"
          rows={2}
          placeholder="How did it feel?"
          value={notes}
          onChange={(e) => setNotes(e.target.value)}
        />
      </label>

      <div className="mt-3 flex gap-2">
        <button className="btn-secondary" onClick={onCancel}>
          Cancel
        </button>
        <button className="btn-primary flex-1" onClick={save}>
          Save session
        </button>
      </div>
    </div>
  );
}

function NumField({
  label,
  value,
  onChange,
  step,
}: {
  label: string;
  value: number;
  onChange: (v: number) => void;
  step?: number;
}) {
  return (
    <label className="block">
      <span className="mb-1 block text-xs text-text-muted">{label}</span>
      <input
        type="number"
        className="input"
        value={value}
        step={step}
        onChange={(e) => onChange(+e.target.value)}
      />
    </label>
  );
}

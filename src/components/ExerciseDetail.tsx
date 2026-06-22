import type { Exercise } from '../types';
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

      <div className="rounded-xl bg-surface2 p-3 text-center text-sm">
        Recommended: <strong>{exercise.defaultSets} sets × {exercise.defaultReps} reps</strong>
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

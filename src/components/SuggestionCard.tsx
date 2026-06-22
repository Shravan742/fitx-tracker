import type { Suggestion } from '../lib/orm';

export default function SuggestionCard({ lift, suggestion }: { lift: string; suggestion: Suggestion | null }) {
  return (
    <div className="rounded-xl bg-surface2 p-3">
      <div className="mb-2 text-sm font-semibold">{lift}</div>
      {(!suggestion || suggestion.type === 'start') && (
        <p className="text-xs text-text-muted">No history yet — log a session to get suggestions.</p>
      )}
      {suggestion?.type === 'percentage' && (
        <>
          <div className="mb-2 text-xs text-text-muted">
            Based on 1RM: <strong className="text-text">{suggestion.orm} kg</strong>
          </div>
          <div className="flex flex-wrap gap-1.5">
            {suggestion.sets.map((set) => (
              <div key={set.label} className="rounded-lg bg-surface px-2 py-1.5 text-center">
                <div className="text-sm font-bold text-accent">{set.weight}kg</div>
                <div className="text-[0.65rem] text-text-muted">
                  {set.sets}×{set.reps}
                </div>
                <div className="text-[0.6rem] text-text-muted">{set.label}</div>
              </div>
            ))}
          </div>
        </>
      )}
      {suggestion?.type === 'increase' && (
        <div className="text-sm text-success">
          ↑ Increase to <strong>{suggestion.weight}kg</strong> — {suggestion.sets}×{suggestion.reps}
        </div>
      )}
      {suggestion?.type === 'hold' && (
        <div className="text-sm text-accent2">
          Hold at <strong>{suggestion.weight}kg</strong> — {suggestion.sets}×{suggestion.reps} (missed reps)
        </div>
      )}
      {suggestion?.type === 'same' && (
        <div className="text-sm">
          {suggestion.weight}kg — {suggestion.sets}×{suggestion.reps}
        </div>
      )}
    </div>
  );
}

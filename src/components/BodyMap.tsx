import Model from 'react-body-highlighter';
import type { MuscleGroup } from '../types';
import { MUSCLE_TO_HIGHLIGHTER } from '../lib/muscleMap';

export default function BodyMap({ muscle, exerciseName }: { muscle: MuscleGroup; exerciseName: string }) {
  const data = [{ name: exerciseName, muscles: MUSCLE_TO_HIGHLIGHTER[muscle] }];

  return (
    <div className="flex justify-center gap-6">
      <div className="flex flex-col items-center gap-1">
        <Model
          data={data}
          type="anterior"
          bodyColor="#2a3152"
          highlightedColors={['#ff4d6d']}
          style={{ width: '7rem' }}
        />
        <span className="text-[0.65rem] uppercase tracking-wide text-text-muted">Front</span>
      </div>
      <div className="flex flex-col items-center gap-1">
        <Model
          data={data}
          type="posterior"
          bodyColor="#2a3152"
          highlightedColors={['#ff4d6d']}
          style={{ width: '7rem' }}
        />
        <span className="text-[0.65rem] uppercase tracking-wide text-text-muted">Back</span>
      </div>
    </div>
  );
}

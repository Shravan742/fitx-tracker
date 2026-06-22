import { MuscleType, type Muscle } from 'react-body-highlighter';
import type { MuscleGroup } from '../types';

export const MUSCLE_TO_HIGHLIGHTER: Record<MuscleGroup, Muscle[]> = {
  Chest: [MuscleType.CHEST],
  Back: [MuscleType.UPPER_BACK, MuscleType.LOWER_BACK],
  Shoulders: [MuscleType.FRONT_DELTOIDS, MuscleType.BACK_DELTOIDS],
  Legs: [MuscleType.QUADRICEPS, MuscleType.HAMSTRING, MuscleType.CALVES, MuscleType.GLUTEAL],
  Biceps: [MuscleType.BICEPS],
  Triceps: [MuscleType.TRICEPS],
  Core: [MuscleType.ABS],
};

export function slugify(name: string): string {
  return name.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');
}

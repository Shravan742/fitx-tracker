import dayjs from 'dayjs';
import type { Goal, MuscleGroup, Weekday } from '../types';

export const WEEKDAY_ORDER: Weekday[] = [
  'monday',
  'tuesday',
  'wednesday',
  'thursday',
  'friday',
  'saturday',
  'sunday',
];

export type SplitType = 'full-body' | 'upper-lower' | 'ppl';
export type DayType = 'Full Body' | 'Upper' | 'Lower' | 'Push' | 'Pull' | 'Legs';

const SPLIT_CYCLES: Record<SplitType, DayType[]> = {
  'full-body': ['Full Body'],
  'upper-lower': ['Upper', 'Lower'],
  ppl: ['Push', 'Pull', 'Legs'],
};

const TYPE_MUSCLES: Record<DayType, MuscleGroup[]> = {
  'Full Body': ['Chest', 'Back', 'Legs', 'Shoulders', 'Biceps', 'Triceps', 'Core'],
  Upper: ['Chest', 'Back', 'Shoulders', 'Biceps', 'Triceps'],
  Lower: ['Legs', 'Core'],
  Push: ['Chest', 'Shoulders', 'Triceps'],
  Pull: ['Back', 'Biceps'],
  Legs: ['Legs', 'Core'],
};

/**
 * Picks a split based on how many training days are available and the user's goal.
 * Bulk goals favor higher per-muscle volume (PPL) once there's enough training days
 * to support it; cut/maintain favor full-body / upper-lower for shorter, frequent sessions.
 */
export function determineSplit(goal: Goal, trainingDays: number): SplitType {
  if (trainingDays <= 2) return 'full-body';
  if (trainingDays === 3) return goal === 'bulk' ? 'ppl' : 'full-body';
  if (trainingDays === 4) return goal === 'bulk' ? 'ppl' : 'upper-lower';
  return 'ppl';
}

export interface TodaysFocus {
  isRest: boolean;
  dayName: Weekday;
  splitType?: SplitType;
  dayType?: DayType;
  muscles?: MuscleGroup[];
}

function dayjsToWeekday(dateStr: string): Weekday {
  const d = dayjs(dateStr).day(); // 0 = Sunday
  return WEEKDAY_ORDER[d === 0 ? 6 : d - 1];
}

export function getTodaysFocus(goal: Goal, restDays: Weekday[], dateStr: string): TodaysFocus {
  const dayName = dayjsToWeekday(dateStr);
  if (restDays.includes(dayName)) {
    return { isRest: true, dayName };
  }

  const trainingDays = WEEKDAY_ORDER.filter((d) => !restDays.includes(d));
  if (!trainingDays.length) {
    return { isRest: true, dayName };
  }

  const splitType = determineSplit(goal, trainingDays.length);
  const cycle = SPLIT_CYCLES[splitType];
  const idxInTrainingDays = trainingDays.indexOf(dayName);
  const dayType = cycle[idxInTrainingDays % cycle.length];

  return { isRest: false, dayName, splitType, dayType, muscles: TYPE_MUSCLES[dayType] };
}

export const SPLIT_LABEL: Record<SplitType, string> = {
  'full-body': 'Full Body',
  'upper-lower': 'Upper / Lower',
  ppl: 'Push / Pull / Legs',
};

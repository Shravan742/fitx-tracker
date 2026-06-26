export type Sex = 'male' | 'female';
export type ActivityLevel = 'sedentary' | 'light' | 'moderate' | 'active' | 'very_active';
export type Goal = 'cut' | 'maintain' | 'bulk';
export type Diet = 'chicken' | 'beef' | 'pork' | 'fish' | 'vegetarian' | 'vegan';
export type MealType = 'breakfast' | 'lunch' | 'snack' | 'dinner' | 'any';
export type Weekday = 'monday' | 'tuesday' | 'wednesday' | 'thursday' | 'friday' | 'saturday' | 'sunday';

export interface Profile {
  id: string;
  name: string;
  age: number;
  sex: Sex;
  heightCm: number;
  weightKg: number;
  activityLevel: ActivityLevel;
  goal: Goal;
  dietPreferences: Diet[];
  onboardingDone: boolean;
  restDays: Weekday[];
  weeklyBudget: number;
  updatedAt?: string;
}

export interface Macros {
  calories: number;
  protein: number;
  carbs: number;
  fat: number;
  bmr: number;
  tdee: number;
}

export interface MealLog {
  id?: number;
  profileId: string;
  date: string;
  name: string;
  calories: number;
  protein: number;
  carbs: number;
  fat: number;
  loggedAt: string;
}

export interface SleepLog {
  id?: number;
  profileId: string;
  date: string;
  bedtime: string;
  waketime: string;
  quality: number;
  durationH: number;
  durationM: number;
  loggedAt: string;
}

export interface WorkoutSet {
  exercise: string;
  sets: number;
  reps: number;
  weight: number;
  perSet?: { reps: number; weight: number }[];
}

export interface WorkoutSession {
  id?: number;
  profileId: string;
  date: string;
  entries: WorkoutSet[];
  notes?: string;
}

export interface OneRepMax {
  id?: number;
  profileId: string;
  lift: string;
  value: number;
  method: string;
  date: string;
}

export interface WeightEntry {
  date: string;
  weightKg: number;
}

export interface Ingredient {
  item: string;
  grams?: number;
  ml?: number;
}

export interface RecipeMacros {
  calories: number;
  protein: number;
  carbs: number;
  fat: number;
}

export interface Recipe {
  name: string;
  cuisine: string;
  diet: Diet;
  mealType: MealType;
  photo: string;
  servings: number;
  ingredients: Ingredient[];
  macros: RecipeMacros;
  instructions: string[];
}

export interface PlanEntry {
  slotKey: string;
  recipeIdx: number;
  scale: number;
}

export interface Household {
  memberIds: [string, string];
  dietPreferences: Diet[];
}

export type EquipmentType = 'Barbell' | 'Dumbbell' | 'Cable' | 'Machine' | 'Bodyweight';
export type MuscleGroup = 'Chest' | 'Back' | 'Shoulders' | 'Legs' | 'Biceps' | 'Triceps' | 'Core';

export interface Exercise {
  name: string;
  equipment: EquipmentType;
  muscle: MuscleGroup;
  musclesPrimary: string[];
  musclesSecondary?: string[];
  defaultSets: number;
  defaultReps: number;
  ytId: string;
  setup: string;
  steps: string[];
  tips: string;
  mistakes: string;
  imageSlug?: string;
}

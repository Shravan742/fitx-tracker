// FitX Magdeburg equipment list — exercises mapped to available machines/free weights
const exercises = [
  // Chest
  { name: 'Bench Press',          equipment: 'Barbell',  muscle: 'Chest',     defaultSets: 4, defaultReps: 8  },
  { name: 'Incline Bench Press',  equipment: 'Barbell',  muscle: 'Chest',     defaultSets: 3, defaultReps: 10 },
  { name: 'Dumbbell Fly',         equipment: 'Dumbbell', muscle: 'Chest',     defaultSets: 3, defaultReps: 12 },
  { name: 'Cable Crossover',      equipment: 'Cable',    muscle: 'Chest',     defaultSets: 3, defaultReps: 12 },
  { name: 'Chest Press Machine',  equipment: 'Machine',  muscle: 'Chest',     defaultSets: 3, defaultReps: 10 },
  { name: 'Pec Deck',             equipment: 'Machine',  muscle: 'Chest',     defaultSets: 3, defaultReps: 12 },

  // Back
  { name: 'Deadlift',             equipment: 'Barbell',  muscle: 'Back',      defaultSets: 4, defaultReps: 5  },
  { name: 'Barbell Row',          equipment: 'Barbell',  muscle: 'Back',      defaultSets: 4, defaultReps: 8  },
  { name: 'Lat Pulldown',         equipment: 'Cable',    muscle: 'Back',      defaultSets: 4, defaultReps: 10 },
  { name: 'Seated Cable Row',     equipment: 'Cable',    muscle: 'Back',      defaultSets: 3, defaultReps: 10 },
  { name: 'T-Bar Row',            equipment: 'Machine',  muscle: 'Back',      defaultSets: 3, defaultReps: 10 },
  { name: 'Pull-up',              equipment: 'Bodyweight',muscle: 'Back',     defaultSets: 3, defaultReps: 8  },
  { name: 'Dumbbell Row',         equipment: 'Dumbbell', muscle: 'Back',      defaultSets: 3, defaultReps: 10 },

  // Shoulders
  { name: 'Overhead Press',       equipment: 'Barbell',  muscle: 'Shoulders', defaultSets: 4, defaultReps: 6  },
  { name: 'Dumbbell Shoulder Press',equipment:'Dumbbell',muscle: 'Shoulders', defaultSets: 3, defaultReps: 10 },
  { name: 'Lateral Raise',        equipment: 'Dumbbell', muscle: 'Shoulders', defaultSets: 3, defaultReps: 15 },
  { name: 'Cable Lateral Raise',  equipment: 'Cable',    muscle: 'Shoulders', defaultSets: 3, defaultReps: 15 },
  { name: 'Face Pull',            equipment: 'Cable',    muscle: 'Shoulders', defaultSets: 3, defaultReps: 15 },
  { name: 'Rear Delt Fly',        equipment: 'Machine',  muscle: 'Shoulders', defaultSets: 3, defaultReps: 12 },

  // Legs
  { name: 'Squat',                equipment: 'Barbell',  muscle: 'Legs',      defaultSets: 4, defaultReps: 5  },
  { name: 'Romanian Deadlift',    equipment: 'Barbell',  muscle: 'Legs',      defaultSets: 3, defaultReps: 8  },
  { name: 'Leg Press',            equipment: 'Machine',  muscle: 'Legs',      defaultSets: 4, defaultReps: 10 },
  { name: 'Leg Extension',        equipment: 'Machine',  muscle: 'Legs',      defaultSets: 3, defaultReps: 12 },
  { name: 'Leg Curl',             equipment: 'Machine',  muscle: 'Legs',      defaultSets: 3, defaultReps: 12 },
  { name: 'Calf Raise',           equipment: 'Machine',  muscle: 'Legs',      defaultSets: 4, defaultReps: 15 },
  { name: 'Dumbbell Lunge',       equipment: 'Dumbbell', muscle: 'Legs',      defaultSets: 3, defaultReps: 12 },
  { name: 'Hip Thrust',           equipment: 'Barbell',  muscle: 'Legs',      defaultSets: 3, defaultReps: 10 },

  // Arms
  { name: 'Barbell Curl',         equipment: 'Barbell',  muscle: 'Biceps',    defaultSets: 3, defaultReps: 10 },
  { name: 'Dumbbell Curl',        equipment: 'Dumbbell', muscle: 'Biceps',    defaultSets: 3, defaultReps: 12 },
  { name: 'Cable Curl',           equipment: 'Cable',    muscle: 'Biceps',    defaultSets: 3, defaultReps: 12 },
  { name: 'Tricep Pushdown',      equipment: 'Cable',    muscle: 'Triceps',   defaultSets: 3, defaultReps: 12 },
  { name: 'Overhead Tricep Ext',  equipment: 'Cable',    muscle: 'Triceps',   defaultSets: 3, defaultReps: 12 },
  { name: 'Skullcrusher',         equipment: 'Barbell',  muscle: 'Triceps',   defaultSets: 3, defaultReps: 10 },
  { name: 'Dip',                  equipment: 'Bodyweight',muscle: 'Triceps',  defaultSets: 3, defaultReps: 10 },

  // Core
  { name: 'Plank',                equipment: 'Bodyweight',muscle: 'Core',     defaultSets: 3, defaultReps: 1  },
  { name: 'Cable Crunch',         equipment: 'Cable',    muscle: 'Core',      defaultSets: 3, defaultReps: 15 },
  { name: 'Ab Machine',           equipment: 'Machine',  muscle: 'Core',      defaultSets: 3, defaultReps: 15 },
];

export default exercises;

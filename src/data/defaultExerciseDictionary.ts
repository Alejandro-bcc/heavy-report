import { db } from '@/db/database';
import type {
  DetailedMuscle,
  ExerciseCategory,
  ExerciseMapping,
  WorkoutSet,
} from '@/types/workout';

export interface DefaultExerciseEntry {
  primaryMuscle: DetailedMuscle | null;
  secondaryMuscles: DetailedMuscle[];
  category: ExerciseCategory;
}

/**
 * Built-in Heavy exercise dictionary covering standard Heavy exercises
 * and all exercises commonly exported in Heavy CSVs.
 * Users can override or add any exercise in the Exercise Mapping modal.
 */
export const DEFAULT_EXERCISE_DICTIONARY: Record<string, DefaultExerciseEntry> = {
  // --- CHEST ---
  'Bench Press (Barbell)': { primaryMuscle: 'Chest', secondaryMuscles: ['Triceps', 'Shoulders'], category: 'weighted' },
  'Bench Press (Dumbbell)': { primaryMuscle: 'Chest', secondaryMuscles: ['Triceps', 'Shoulders'], category: 'weighted' },
  'Bench Press (Smith Machine)': { primaryMuscle: 'Chest', secondaryMuscles: ['Triceps', 'Shoulders'], category: 'weighted' },
  'Incline Bench Press (Barbell)': { primaryMuscle: 'Chest', secondaryMuscles: ['Shoulders', 'Triceps'], category: 'weighted' },
  'Incline Bench Press (Dumbbell)': { primaryMuscle: 'Chest', secondaryMuscles: ['Shoulders', 'Triceps'], category: 'weighted' },
  'Incline Bench Press (Smith Machine)': { primaryMuscle: 'Chest', secondaryMuscles: ['Shoulders', 'Triceps'], category: 'weighted' },
  'Decline Bench Press (Barbell)': { primaryMuscle: 'Chest', secondaryMuscles: ['Triceps', 'Shoulders'], category: 'weighted' },
  'Decline Bench Press (Dumbbell)': { primaryMuscle: 'Chest', secondaryMuscles: ['Triceps', 'Shoulders'], category: 'weighted' },
  'Chest Press (Machine)': { primaryMuscle: 'Chest', secondaryMuscles: ['Triceps', 'Shoulders'], category: 'weighted' },
  'Incline Chest Press (Machine)': { primaryMuscle: 'Chest', secondaryMuscles: ['Shoulders', 'Triceps'], category: 'weighted' },
  'Butterfly (Pec Deck)': { primaryMuscle: 'Chest', secondaryMuscles: [], category: 'weighted' },
  'Chest Fly (Dumbbell)': { primaryMuscle: 'Chest', secondaryMuscles: [], category: 'weighted' },
  'Chest Fly (Machine)': { primaryMuscle: 'Chest', secondaryMuscles: [], category: 'weighted' },
  'Cable Fly Crossovers': { primaryMuscle: 'Chest', secondaryMuscles: [], category: 'weighted' },
  'Low Cable Fly Crossovers': { primaryMuscle: 'Chest', secondaryMuscles: ['Shoulders'], category: 'weighted' },
  'Push Up': { primaryMuscle: 'Chest', secondaryMuscles: ['Triceps', 'Shoulders'], category: 'bodyweight' },
  'Push Up - Close Grip': { primaryMuscle: 'Chest', secondaryMuscles: ['Triceps', 'Shoulders'], category: 'bodyweight' },
  'Diamond Push Up': { primaryMuscle: 'Triceps', secondaryMuscles: ['Chest', 'Shoulders'], category: 'bodyweight' },
  'Incline Push Ups': { primaryMuscle: 'Chest', secondaryMuscles: ['Triceps', 'Shoulders'], category: 'bodyweight' },
  'Chest Dip': { primaryMuscle: 'Chest', secondaryMuscles: ['Triceps', 'Shoulders'], category: 'bodyweight' },
  'Chest Dip (Assisted)': { primaryMuscle: 'Chest', secondaryMuscles: ['Triceps', 'Shoulders'], category: 'assisted' },
  'Chest Dip (Weighted)': { primaryMuscle: 'Chest', secondaryMuscles: ['Triceps', 'Shoulders'], category: 'weighted' },
  'Pullover (Dumbbell)': { primaryMuscle: 'Chest', secondaryMuscles: ['Lats'], category: 'weighted' },

  // --- BACK (Lats, Upper Back, Lower Back, Traps) ---
  'Pull Up': { primaryMuscle: 'Lats', secondaryMuscles: ['Upper Back', 'Biceps'], category: 'bodyweight' },
  'Pull Up (Assisted)': { primaryMuscle: 'Lats', secondaryMuscles: ['Upper Back', 'Biceps'], category: 'assisted' },
  'Pull Up (Weighted)': { primaryMuscle: 'Lats', secondaryMuscles: ['Upper Back', 'Biceps'], category: 'weighted' },
  'Chin Up': { primaryMuscle: 'Lats', secondaryMuscles: ['Biceps', 'Upper Back'], category: 'bodyweight' },
  'Chin Up (Assisted)': { primaryMuscle: 'Lats', secondaryMuscles: ['Biceps', 'Upper Back'], category: 'assisted' },
  'Lat Pulldown (Cable)': { primaryMuscle: 'Lats', secondaryMuscles: ['Upper Back', 'Biceps'], category: 'weighted' },
  'Lat Pulldown (Machine)': { primaryMuscle: 'Lats', secondaryMuscles: ['Upper Back', 'Biceps'], category: 'weighted' },
  'Lat Pulldown - Close Grip (Cable)': { primaryMuscle: 'Lats', secondaryMuscles: ['Upper Back', 'Biceps'], category: 'weighted' },
  'Single Arm Lat Pulldown': { primaryMuscle: 'Lats', secondaryMuscles: ['Biceps', 'Upper Back'], category: 'weighted' },
  'Straight Arm Lat Pulldown (Cable)': { primaryMuscle: 'Lats', secondaryMuscles: [], category: 'weighted' },
  'Seated Cable Row - Bar Wide Grip': { primaryMuscle: 'Upper Back', secondaryMuscles: ['Lats', 'Biceps'], category: 'weighted' },
  'Seated Cable Row - V Grip (cable)': { primaryMuscle: 'Upper Back', secondaryMuscles: ['Lats', 'Biceps'], category: 'weighted' },
  'Seated Cable Row - Bar Grip': { primaryMuscle: 'Upper Back', secondaryMuscles: ['Lats', 'Biceps'], category: 'weighted' },
  'Seated Row (Machine)': { primaryMuscle: 'Upper Back', secondaryMuscles: ['Lats', 'Biceps'], category: 'weighted' },
  'Iso-Lateral Row (Machine)': { primaryMuscle: 'Upper Back', secondaryMuscles: ['Lats', 'Biceps'], category: 'weighted' },
  'Iso-Lateral High Row (Machine)': { primaryMuscle: 'Lats', secondaryMuscles: ['Upper Back', 'Biceps'], category: 'weighted' },
  'Bent Over Row (Barbell)': { primaryMuscle: 'Upper Back', secondaryMuscles: ['Lats', 'Biceps', 'Lower Back'], category: 'weighted' },
  'Bent Over Row (Dumbbell)': { primaryMuscle: 'Upper Back', secondaryMuscles: ['Lats', 'Biceps'], category: 'weighted' },
  'Dumbbell Row': { primaryMuscle: 'Lats', secondaryMuscles: ['Upper Back', 'Biceps'], category: 'weighted' },
  'T Bar Row': { primaryMuscle: 'Upper Back', secondaryMuscles: ['Lats', 'Biceps'], category: 'weighted' },
  'Chest Supported Incline Row (Dumbbell)': { primaryMuscle: 'Upper Back', secondaryMuscles: ['Lats', 'Biceps'], category: 'weighted' },
  'Pendlay Row (Barbell)': { primaryMuscle: 'Upper Back', secondaryMuscles: ['Lats', 'Biceps', 'Lower Back'], category: 'weighted' },
  'Deadlift (Barbell)': { primaryMuscle: 'Lower Back', secondaryMuscles: ['Glutes', 'Hamstrings', 'Upper Back', 'Traps'], category: 'weighted' },
  'Back Extension (Hyperextension)': { primaryMuscle: 'Lower Back', secondaryMuscles: ['Glutes', 'Hamstrings'], category: 'bodyweight' },
  'Back Extension (Weighted Hyperextension)': { primaryMuscle: 'Lower Back', secondaryMuscles: ['Glutes', 'Hamstrings'], category: 'weighted' },
  'Good Morning (Barbell)': { primaryMuscle: 'Lower Back', secondaryMuscles: ['Hamstrings', 'Glutes'], category: 'weighted' },
  'Superman': { primaryMuscle: 'Lower Back', secondaryMuscles: ['Glutes'], category: 'bodyweight' },
  'Bird Dog': { primaryMuscle: 'Lower Back', secondaryMuscles: ['Abdominals', 'Glutes'], category: 'bodyweight' },
  'Shrug (Barbell)': { primaryMuscle: 'Traps', secondaryMuscles: ['Upper Back', 'Forearms'], category: 'weighted' },
  'Shrug (Dumbbell)': { primaryMuscle: 'Traps', secondaryMuscles: ['Upper Back', 'Forearms'], category: 'weighted' },
  'Shrug (Machine)': { primaryMuscle: 'Traps', secondaryMuscles: ['Upper Back'], category: 'weighted' },
  'Shrug (Smith Machine)': { primaryMuscle: 'Traps', secondaryMuscles: ['Upper Back'], category: 'weighted' },
  'Face Pull': { primaryMuscle: 'Shoulders', secondaryMuscles: ['Upper Back', 'Traps'], category: 'weighted' },

  // --- SHOULDERS ---
  'Overhead Press (Barbell)': { primaryMuscle: 'Shoulders', secondaryMuscles: ['Triceps'], category: 'weighted' },
  'Overhead Press (Dumbbell)': { primaryMuscle: 'Shoulders', secondaryMuscles: ['Triceps'], category: 'weighted' },
  'Shoulder Press (Dumbbell)': { primaryMuscle: 'Shoulders', secondaryMuscles: ['Triceps'], category: 'weighted' },
  'Seated Shoulder Press (Machine)': { primaryMuscle: 'Shoulders', secondaryMuscles: ['Triceps'], category: 'weighted' },
  'Seated Overhead Press (Barbell)': { primaryMuscle: 'Shoulders', secondaryMuscles: ['Triceps'], category: 'weighted' },
  'Arnold Press (Dumbbell)': { primaryMuscle: 'Shoulders', secondaryMuscles: ['Triceps'], category: 'weighted' },
  'Pike Pushup': { primaryMuscle: 'Shoulders', secondaryMuscles: ['Triceps', 'Chest'], category: 'bodyweight' },
  'Lateral Raise (Dumbbell)': { primaryMuscle: 'Shoulders', secondaryMuscles: [], category: 'weighted' },
  'Lateral Raise (Cable)': { primaryMuscle: 'Shoulders', secondaryMuscles: [], category: 'weighted' },
  'Lateral Raise (Machine)': { primaryMuscle: 'Shoulders', secondaryMuscles: [], category: 'weighted' },
  'Single Arm Lateral Raise (Cable)': { primaryMuscle: 'Shoulders', secondaryMuscles: [], category: 'weighted' },
  'Front Raise (Dumbbell)': { primaryMuscle: 'Shoulders', secondaryMuscles: [], category: 'weighted' },
  'Rear Delt Reverse Fly (Dumbbell)': { primaryMuscle: 'Shoulders', secondaryMuscles: ['Upper Back'], category: 'weighted' },
  'Rear Delt Reverse Fly (Machine)': { primaryMuscle: 'Shoulders', secondaryMuscles: ['Upper Back'], category: 'weighted' },
  'Rear Delt Reverse Fly (Cable)': { primaryMuscle: 'Shoulders', secondaryMuscles: ['Upper Back'], category: 'weighted' },
  'Reverse Fly Single Arm (Cable)': { primaryMuscle: 'Shoulders', secondaryMuscles: ['Upper Back'], category: 'weighted' },
  'Upright Row (Barbell)': { primaryMuscle: 'Shoulders', secondaryMuscles: ['Traps', 'Biceps'], category: 'weighted' },

  // --- ARMS (Biceps, Triceps, Forearms) ---
  'Bicep Curl (Barbell)': { primaryMuscle: 'Biceps', secondaryMuscles: ['Forearms'], category: 'weighted' },
  'Bicep Curl (Dumbbell)': { primaryMuscle: 'Biceps', secondaryMuscles: ['Forearms'], category: 'weighted' },
  'Bicep Curl (Cable)': { primaryMuscle: 'Biceps', secondaryMuscles: ['Forearms'], category: 'weighted' },
  'Bicep Curl (Machine)': { primaryMuscle: 'Biceps', secondaryMuscles: ['Forearms'], category: 'weighted' },
  'EZ Bar Biceps Curl': { primaryMuscle: 'Biceps', secondaryMuscles: ['Forearms'], category: 'weighted' },
  'Hammer Curl (Dumbbell)': { primaryMuscle: 'Biceps', secondaryMuscles: ['Forearms'], category: 'weighted' },
  'Hammer Curl (Cable)': { primaryMuscle: 'Biceps', secondaryMuscles: ['Forearms'], category: 'weighted' },
  'Seated Incline Hammer Curl (Dumbbell)': { primaryMuscle: 'Biceps', secondaryMuscles: ['Forearms'], category: 'weighted' },
  'Seated Incline Curl (Dumbbell)': { primaryMuscle: 'Biceps', secondaryMuscles: ['Forearms'], category: 'weighted' },
  'Preacher Curl (Barbell)': { primaryMuscle: 'Biceps', secondaryMuscles: ['Forearms'], category: 'weighted' },
  'Preacher Curl (Dumbbell)': { primaryMuscle: 'Biceps', secondaryMuscles: ['Forearms'], category: 'weighted' },
  'Preacher Curl (Machine)': { primaryMuscle: 'Biceps', secondaryMuscles: ['Forearms'], category: 'weighted' },
  'Spider Curl (Dumbbell)': { primaryMuscle: 'Biceps', secondaryMuscles: ['Forearms'], category: 'weighted' },
  'Spider Curl (Barbell)': { primaryMuscle: 'Biceps', secondaryMuscles: ['Forearms'], category: 'weighted' },
  'Concentration Curl': { primaryMuscle: 'Biceps', secondaryMuscles: ['Forearms'], category: 'weighted' },
  'Bayesian Curl (Cable)': { primaryMuscle: 'Biceps', secondaryMuscles: ['Forearms'], category: 'weighted' },

  'Triceps Pushdown': { primaryMuscle: 'Triceps', secondaryMuscles: [], category: 'weighted' },
  'Triceps Rope Pushdown': { primaryMuscle: 'Triceps', secondaryMuscles: [], category: 'weighted' },
  'Single Arm Triceps Pushdown (Cable)': { primaryMuscle: 'Triceps', secondaryMuscles: [], category: 'weighted' },
  'Triceps Extension (Cable)': { primaryMuscle: 'Triceps', secondaryMuscles: [], category: 'weighted' },
  'Triceps Extension (Dumbbell)': { primaryMuscle: 'Triceps', secondaryMuscles: [], category: 'weighted' },
  'Triceps Extension (Machine)': { primaryMuscle: 'Triceps', secondaryMuscles: [], category: 'weighted' },
  'Overhead Triceps Extension (Cable)': { primaryMuscle: 'Triceps', secondaryMuscles: [], category: 'weighted' },
  'Skullcrusher (Barbell)': { primaryMuscle: 'Triceps', secondaryMuscles: [], category: 'weighted' },
  'Skullcrusher (Dumbbell)': { primaryMuscle: 'Triceps', secondaryMuscles: [], category: 'weighted' },
  'Carter Extension': { primaryMuscle: 'Triceps', secondaryMuscles: [], category: 'weighted' },
  'Triceps Dip': { primaryMuscle: 'Triceps', secondaryMuscles: ['Chest', 'Shoulders'], category: 'bodyweight' },
  'Triceps Dip (Assisted)': { primaryMuscle: 'Triceps', secondaryMuscles: ['Chest', 'Shoulders'], category: 'assisted' },
  'Close Grip Bench Press (Barbell)': { primaryMuscle: 'Triceps', secondaryMuscles: ['Chest', 'Shoulders'], category: 'weighted' },

  'Wrist Curl (cable)': { primaryMuscle: 'Forearms', secondaryMuscles: [], category: 'weighted' },
  'Behind Back Wrist Curl (cable)': { primaryMuscle: 'Forearms', secondaryMuscles: [], category: 'weighted' },
  'Behind The Back Bicep Wrist Curl (Barbell)': { primaryMuscle: 'Forearms', secondaryMuscles: [], category: 'weighted' },
  'Seated Palms Up Wrist Curl': { primaryMuscle: 'Forearms', secondaryMuscles: [], category: 'weighted' },
  'Wrist Roller': { primaryMuscle: 'Forearms', secondaryMuscles: [], category: 'weighted' },
  'Reverse Curl (Barbell)': { primaryMuscle: 'Forearms', secondaryMuscles: ['Biceps'], category: 'weighted' },
  'Reverse Curl (Cable)': { primaryMuscle: 'Forearms', secondaryMuscles: ['Biceps'], category: 'weighted' },
  'Reverse Curl (Dumbbell)': { primaryMuscle: 'Forearms', secondaryMuscles: ['Biceps'], category: 'weighted' },
  'Farmers Walk': { primaryMuscle: 'Forearms', secondaryMuscles: ['Traps', 'Abdominals'], category: 'weighted' },

  // --- LEGS (Quadriceps, Hamstrings, Glutes, Calves, Abductors, Adductors) ---
  'Squat (Barbell)': { primaryMuscle: 'Quadriceps', secondaryMuscles: ['Glutes', 'Hamstrings'], category: 'weighted' },
  'Squat (Dumbbell)': { primaryMuscle: 'Quadriceps', secondaryMuscles: ['Glutes', 'Hamstrings'], category: 'weighted' },
  'Squat (Smith Machine)': { primaryMuscle: 'Quadriceps', secondaryMuscles: ['Glutes', 'Hamstrings'], category: 'weighted' },
  'Squat (Bodyweight)': { primaryMuscle: 'Quadriceps', secondaryMuscles: ['Glutes'], category: 'bodyweight' },
  'Front Squat': { primaryMuscle: 'Quadriceps', secondaryMuscles: ['Glutes', 'Abdominals'], category: 'weighted' },
  'Goblet Squat': { primaryMuscle: 'Quadriceps', secondaryMuscles: ['Glutes'], category: 'weighted' },
  'Hack Squat (Machine)': { primaryMuscle: 'Quadriceps', secondaryMuscles: ['Glutes'], category: 'weighted' },
  'Pendulum Squat (Machine)': { primaryMuscle: 'Quadriceps', secondaryMuscles: ['Glutes'], category: 'weighted' },
  'Bulgarian Split Squat': { primaryMuscle: 'Quadriceps', secondaryMuscles: ['Glutes', 'Hamstrings'], category: 'weighted' },
  'Lunge (Dumbbell)': { primaryMuscle: 'Quadriceps', secondaryMuscles: ['Glutes', 'Hamstrings'], category: 'weighted' },
  'Walking Lunge (Dumbbell)': { primaryMuscle: 'Quadriceps', secondaryMuscles: ['Glutes', 'Hamstrings'], category: 'weighted' },
  'Leg Press (Machine)': { primaryMuscle: 'Quadriceps', secondaryMuscles: ['Glutes', 'Hamstrings'], category: 'weighted' },
  'Leg Press Horizontal (Machine)': { primaryMuscle: 'Quadriceps', secondaryMuscles: ['Glutes', 'Hamstrings'], category: 'weighted' },
  'Single Leg Press (Machine)': { primaryMuscle: 'Quadriceps', secondaryMuscles: ['Glutes', 'Hamstrings'], category: 'weighted' },
  'Leg Extension (Machine)': { primaryMuscle: 'Quadriceps', secondaryMuscles: [], category: 'weighted' },
  'Single Leg Extensions': { primaryMuscle: 'Quadriceps', secondaryMuscles: [], category: 'weighted' },

  'Romanian Deadlift (Barbell)': { primaryMuscle: 'Hamstrings', secondaryMuscles: ['Glutes', 'Lower Back'], category: 'weighted' },
  'Romanian Deadlift (Dumbbell)': { primaryMuscle: 'Hamstrings', secondaryMuscles: ['Glutes', 'Lower Back'], category: 'weighted' },
  'Seated Leg Curl (Machine)': { primaryMuscle: 'Hamstrings', secondaryMuscles: [], category: 'weighted' },
  'Lying Leg Curl (Machine)': { primaryMuscle: 'Hamstrings', secondaryMuscles: [], category: 'weighted' },
  'Standing Leg Curls': { primaryMuscle: 'Hamstrings', secondaryMuscles: [], category: 'weighted' },
  'Nordic Hamstrings Curls': { primaryMuscle: 'Hamstrings', secondaryMuscles: ['Glutes'], category: 'bodyweight' },

  'Hip Thrust (Barbell)': { primaryMuscle: 'Glutes', secondaryMuscles: ['Hamstrings'], category: 'weighted' },
  'Hip Thrust (Machine)': { primaryMuscle: 'Glutes', secondaryMuscles: ['Hamstrings'], category: 'weighted' },
  'Hip Thrust (Smith Machine)': { primaryMuscle: 'Glutes', secondaryMuscles: ['Hamstrings'], category: 'weighted' },
  'Glute Bridge': { primaryMuscle: 'Glutes', secondaryMuscles: ['Hamstrings'], category: 'bodyweight' },
  'Glute Kickback (Machine)': { primaryMuscle: 'Glutes', secondaryMuscles: ['Hamstrings'], category: 'weighted' },
  'Glute Kickback on Floor': { primaryMuscle: 'Glutes', secondaryMuscles: [], category: 'bodyweight' },

  'Hip Abduction (Machine)': { primaryMuscle: 'Abductors', secondaryMuscles: ['Glutes'], category: 'weighted' },
  'Side Lying Hip Abduction': { primaryMuscle: 'Abductors', secondaryMuscles: ['Glutes'], category: 'bodyweight' },
  'Hip Adduction (Machine)': { primaryMuscle: 'Adductors', secondaryMuscles: [], category: 'weighted' },
  'Side Lying Hip Adduction': { primaryMuscle: 'Adductors', secondaryMuscles: [], category: 'bodyweight' },

  'Standing Calf Raise (Machine)': { primaryMuscle: 'Calves', secondaryMuscles: [], category: 'weighted' },
  'Standing Calf Raise (Smith)': { primaryMuscle: 'Calves', secondaryMuscles: [], category: 'weighted' },
  'Standing Calf Raise (Barbell)': { primaryMuscle: 'Calves', secondaryMuscles: [], category: 'weighted' },
  'Seated Calf Raise': { primaryMuscle: 'Calves', secondaryMuscles: [], category: 'weighted' },
  'Calf Press (Machine)': { primaryMuscle: 'Calves', secondaryMuscles: [], category: 'weighted' },
  'Calf Extension (Machine)': { primaryMuscle: 'Calves', secondaryMuscles: [], category: 'weighted' },

  // --- CORE (Abdominals) ---
  'Crunch': { primaryMuscle: 'Abdominals', secondaryMuscles: [], category: 'bodyweight' },
  'Crunch (Machine)': { primaryMuscle: 'Abdominals', secondaryMuscles: [], category: 'weighted' },
  'Cable Crunch': { primaryMuscle: 'Abdominals', secondaryMuscles: [], category: 'weighted' },
  'Reverse Crunch': { primaryMuscle: 'Abdominals', secondaryMuscles: [], category: 'bodyweight' },
  'Bicycle Crunch': { primaryMuscle: 'Abdominals', secondaryMuscles: [], category: 'bodyweight' },
  'Leg Raise Parallel Bars': { primaryMuscle: 'Abdominals', secondaryMuscles: [], category: 'bodyweight' },
  'Hanging Leg Raise': { primaryMuscle: 'Abdominals', secondaryMuscles: ['Forearms'], category: 'bodyweight' },
  'Hanging Knee Raise': { primaryMuscle: 'Abdominals', secondaryMuscles: [], category: 'bodyweight' },
  'Lying Leg Raise': { primaryMuscle: 'Abdominals', secondaryMuscles: [], category: 'bodyweight' },
  'Plank': { primaryMuscle: 'Abdominals', secondaryMuscles: ['Lower Back'], category: 'duration' },
  'Side Plank': { primaryMuscle: 'Abdominals', secondaryMuscles: [], category: 'duration' },
  'Dead Bug': { primaryMuscle: 'Abdominals', secondaryMuscles: [], category: 'bodyweight' },
  'Ab Wheel': { primaryMuscle: 'Abdominals', secondaryMuscles: ['Lats'], category: 'bodyweight' },
  'Russian Twist (Bodyweight)': { primaryMuscle: 'Abdominals', secondaryMuscles: [], category: 'bodyweight' },
  'Russian Twist (Weighted)': { primaryMuscle: 'Abdominals', secondaryMuscles: [], category: 'weighted' },
  'Decline Crunch': { primaryMuscle: 'Abdominals', secondaryMuscles: [], category: 'bodyweight' },
  'Sit Up': { primaryMuscle: 'Abdominals', secondaryMuscles: [], category: 'bodyweight' },
  'Pallof Press': { primaryMuscle: 'Abdominals', secondaryMuscles: [], category: 'weighted' },

  // --- CARDIO / WARMUP ---
  'Treadmill': { primaryMuscle: null, secondaryMuscles: [], category: 'cardio' },
  'Spinning': { primaryMuscle: null, secondaryMuscles: [], category: 'cardio' },
  'Stair Machine (Floors)': { primaryMuscle: null, secondaryMuscles: [], category: 'cardio' },
  'Elliptical Trainer': { primaryMuscle: null, secondaryMuscles: [], category: 'cardio' },
  'Rowing Machine': { primaryMuscle: null, secondaryMuscles: [], category: 'cardio' },
  'Running': { primaryMuscle: null, secondaryMuscles: [], category: 'cardio' },
  'Cycling': { primaryMuscle: null, secondaryMuscles: [], category: 'cardio' },
  'Jump Rope': { primaryMuscle: null, secondaryMuscles: [], category: 'cardio' },
  'Warm Up': { primaryMuscle: null, secondaryMuscles: [], category: 'duration' },
  'Stretching': { primaryMuscle: null, secondaryMuscles: [], category: 'duration' },
};

// Build a case-insensitive lookup index for forgiving default matching.
const LOWERCASE_INDEX = new Map<string, DefaultExerciseEntry>();
for (const [title, entry] of Object.entries(DEFAULT_EXERCISE_DICTIONARY)) {
  LOWERCASE_INDEX.set(title.toLowerCase(), entry);
}

export function lookupDefaultExercise(
  exerciseTitle: string,
): DefaultExerciseEntry | undefined {
  return (
    DEFAULT_EXERCISE_DICTIONARY[exerciseTitle] ??
    LOWERCASE_INDEX.get(exerciseTitle.trim().toLowerCase())
  );
}

export function inferCategoryFromSets(
  exerciseTitle: string,
  sets: WorkoutSet[],
): ExerciseCategory {
  if (/\(assisted\)/i.test(exerciseTitle)) return 'assisted';
  if (/treadmill|spinning|stair|elliptical|running|cycling|cardio/i.test(exerciseTitle)) {
    return 'cardio';
  }
  const hasWeight = sets.some((s) => s.weightKg !== null && s.weightKg > 0);
  const hasReps = sets.some((s) => s.reps !== null && s.reps > 0);
  const hasDuration = sets.some((s) => s.durationSeconds !== null && s.durationSeconds > 0);
  if (hasWeight) return 'weighted';
  if (hasReps) return 'bodyweight';
  if (hasDuration) return 'duration';
  return 'weighted';
}

/**
 * Ensures all built-in exercises are seeded into IndexedDB without ever
 * overwriting user-customized mappings.
 */
export async function ensureExerciseDictionarySeeded(): Promise<void> {
  const existingKeys = new Set(await db.exerciseMappings.toCollection().primaryKeys());
  const now = Date.now();
  const toInsert: ExerciseMapping[] = [];

  for (const [exerciseTitle, entry] of Object.entries(DEFAULT_EXERCISE_DICTIONARY)) {
    if (!existingKeys.has(exerciseTitle)) {
      toInsert.push({
        exerciseTitle,
        primaryMuscle: entry.primaryMuscle,
        secondaryMuscles: [...entry.secondaryMuscles],
        category: entry.category,
        isCustom: false,
        updatedAt: now,
      });
    }
  }

  if (toInsert.length > 0) {
    await db.exerciseMappings.bulkPut(toInsert);
  }
}

export type DetailedMuscle =
  | 'Abdominals'
  | 'Abductors'
  | 'Adductors'
  | 'Biceps'
  | 'Calves'
  | 'Chest'
  | 'Forearms'
  | 'Glutes'
  | 'Hamstrings'
  | 'Lats'
  | 'Lower Back'
  | 'Quadriceps'
  | 'Shoulders'
  | 'Traps'
  | 'Triceps'
  | 'Upper Back';

export type MacroMuscle =
  | 'Back'
  | 'Chest'
  | 'Core'
  | 'Shoulders'
  | 'Arms'
  | 'Legs';

export type SetType = 'normal' | 'warmup' | 'dropset' | 'failure';

export type ExerciseCategory =
  | 'weighted'
  | 'bodyweight'
  | 'assisted'
  | 'duration'
  | 'cardio';

export type PeriodFilter = '30d' | '3m' | '1y' | 'all';

export type AppTab =
  | 'overview'
  | 'distribution'
  | 'body'
  | 'exercises'
  | 'calendar'
  | 'settings';

export interface WorkoutSet {
  /** Zero-based sequential order within the workout (never collides on repeated exercises). */
  rowIndex: number;
  exerciseTitle: string;
  /** Disambiguates repeated occurrences of the same exercise within a workout. */
  blockIndex: number;
  /** Original set_index from Heavy CSV. */
  setIndex: number;
  setType: SetType;
  weightKg: number | null;
  reps: number | null;
  distanceKm: number | null;
  durationSeconds: number | null;
  rpe: number | null;
  supersetId: string | null;
  exerciseNotes: string | null;
}

export interface Workout {
  /** Deterministic session key derived from startTime (disambiguated if needed). */
  id: string;
  /** Deterministic content hash of title, endTime, description, and canonical sets. */
  contentHash: string;
  title: string;
  description: string | null;
  /** Epoch ms parsed from Heavy timestamp "DD Mon YYYY, HH:MM". */
  startTime: number;
  endTime: number;
  durationSeconds: number;
  /** YYYY-MM-DD (local wall-clock date from CSV). */
  dateKey: string;
  /** YYYY-MM for incremental cache invalidation. */
  monthKey: string;
  year: number;
  sets: WorkoutSet[];
  importedAt: number;
  updatedAt: number;
}

export interface ExerciseMapping {
  /** Exact exercise_title from Heavy CSV (primary key). */
  exerciseTitle: string;
  /** Primary detailed muscle, or null for pure cardio/untargeted. */
  primaryMuscle: DetailedMuscle | null;
  secondaryMuscles: DetailedMuscle[];
  category: ExerciseCategory;
  /** True when explicitly edited or created by the user. */
  isCustom: boolean;
  updatedAt: number;
}

export interface MonthlyCache {
  /** YYYY-MM primary key */
  monthKey: string;
  workoutCount: number;
  totalDurationSeconds: number;
  workingSets: number;
  warmupSets: number;
  /** Raw weighted volume (weight_kg * reps for weighted exercises, excluding warmup). */
  rawWeightedVolumeKg: number;
  workoutIds: string[];
  computedAt: number;
}

export interface ImportSummary {
  fileName: string;
  added: number;
  skipped: number;
  updated: number;
  unmappedExercises: string[];
  timestamp: number;
}

export interface UserSettings {
  id: 'default';
  includeWarmup: boolean;
  secondaryMuscleWeight: number;
  /** Optional body weight in kg used to estimate volume for bodyweight & assisted exercises. */
  bodyWeightKg: number | null;
  /** 1 = Monday (Heavy default), 0 = Sunday */
  weekStartsOn: 1 | 0;
  lastImportSummary: ImportSummary | null;
}

export interface WorkoutDiffResult {
  newWorkouts: Workout[];
  unchangedCount: number;
  modifiedWorkouts: Array<{
    existing: Workout;
    incoming: Workout;
  }>;
  unmappedExercises: string[];
}

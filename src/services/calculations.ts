import {
  createEmptyMacroCounts,
  createEmptyMuscleCounts,
  DETAILED_TO_MACRO,
} from '@/constants/muscles';
import type {
  DetailedMuscle,
  ExerciseMapping,
  MacroMuscle,
  UserSettings,
  Workout,
  WorkoutSet,
} from '@/types/workout';

export type CalcSettings = Pick<
  UserSettings,
  'includeWarmup' | 'secondaryMuscleWeight' | 'bodyWeightKg'
>;

export function isSetCounted(
  set: WorkoutSet,
  settings: Pick<UserSettings, 'includeWarmup'>,
): boolean {
  if (set.setType === 'warmup' && !settings.includeWarmup) {
    return false;
  }
  return true;
}

export function isAssistedExercise(
  exerciseTitle: string,
  mapping?: ExerciseMapping,
): boolean {
  if (mapping?.category === 'assisted') return true;
  return /\(assisted\)/i.test(exerciseTitle);
}

/**
 * Calculates volume in kg for a single set based on user rules:
 * - Weighted: weight_kg * reps
 * - Assisted: max(0, bodyWeightKg - weight_kg) * reps when bodyWeightKg > 0, else 0
 * - Bodyweight (no weight_kg, reps > 0): bodyWeightKg * reps when bodyWeightKg > 0, else 0
 * - Duration / Cardio (no reps): 0
 */
export function calculateSetVolumeKg(
  set: WorkoutSet,
  mapping: ExerciseMapping | undefined,
  settings: Pick<UserSettings, 'bodyWeightKg'>,
): number {
  const reps = set.reps ?? 0;
  if (reps <= 0) return 0;

  const bw = settings.bodyWeightKg && settings.bodyWeightKg > 0 ? settings.bodyWeightKg : 0;

  if (isAssistedExercise(set.exerciseTitle, mapping)) {
    if (bw <= 0) return 0;
    const assistance = set.weightKg ?? 0;
    return Math.max(0, bw - assistance) * reps;
  }

  if (set.weightKg !== null && set.weightKg > 0) {
    return set.weightKg * reps;
  }

  // Bodyweight set (reps present, weight empty or 0)
  if (bw > 0 && mapping?.category !== 'cardio' && mapping?.category !== 'duration') {
    return bw * reps;
  }

  return 0;
}

/**
 * Epley estimated 1RM for weighted sets (returns null for assisted, bodyweight-without-weight, or invalid reps).
 */
export function calculateEstimated1RM(
  weightKg: number | null,
  reps: number | null,
  assisted = false,
): number | null {
  if (assisted || weightKg === null || weightKg <= 0 || reps === null || reps <= 0) {
    return null;
  }
  if (reps === 1) return weightKg;
  return Math.round(weightKg * (1 + reps / 30) * 10) / 10;
}

export interface MuscleSetTotals {
  detailed: Record<DetailedMuscle, number>;
  macro: Record<MacroMuscle, number>;
  totalWeightedSets: number;
}

export function accumulateMuscleSets(
  workouts: Workout[],
  mappingsByTitle: Map<string, ExerciseMapping>,
  settings: CalcSettings,
): MuscleSetTotals {
  const detailed = createEmptyMuscleCounts();
  const macro = createEmptyMacroCounts();

  for (const workout of workouts) {
    for (const set of workout.sets) {
      if (!isSetCounted(set, settings)) continue;
      const mapping = mappingsByTitle.get(set.exerciseTitle);
      if (!mapping) continue;

      if (mapping.primaryMuscle) {
        detailed[mapping.primaryMuscle] += 1;
        macro[DETAILED_TO_MACRO[mapping.primaryMuscle]] += 1;
      }

      const secWeight = settings.secondaryMuscleWeight;
      if (secWeight > 0 && mapping.secondaryMuscles.length > 0) {
        for (const sec of mapping.secondaryMuscles) {
          if (sec === mapping.primaryMuscle) continue;
          detailed[sec] += secWeight;
          macro[DETAILED_TO_MACRO[sec]] += secWeight;
        }
      }
    }
  }

  // Round floating point noise to 2 decimals
  let totalWeightedSets = 0;
  for (const muscle of Object.keys(detailed) as DetailedMuscle[]) {
    detailed[muscle] = Math.round(detailed[muscle] * 100) / 100;
    totalWeightedSets += detailed[muscle];
  }
  for (const m of Object.keys(macro) as MacroMuscle[]) {
    macro[m] = Math.round(macro[m] * 100) / 100;
  }

  return {
    detailed,
    macro,
    totalWeightedSets: Math.round(totalWeightedSets * 100) / 100,
  };
}

export interface PeriodKpis {
  workouts: number;
  durationSeconds: number;
  volumeKg: number;
  sets: number;
}

export function calculatePeriodKpis(
  workouts: Workout[],
  mappingsByTitle: Map<string, ExerciseMapping>,
  settings: CalcSettings,
): PeriodKpis {
  let durationSeconds = 0;
  let volumeKg = 0;
  let sets = 0;

  for (const workout of workouts) {
    durationSeconds += workout.durationSeconds;
    for (const set of workout.sets) {
      if (!isSetCounted(set, settings)) continue;
      sets += 1;
      const mapping = mappingsByTitle.get(set.exerciseTitle);
      volumeKg += calculateSetVolumeKg(set, mapping, settings);
    }
  }

  return {
    workouts: workouts.length,
    durationSeconds,
    volumeKg: Math.round(volumeKg * 10) / 10,
    sets,
  };
}

export function formatDuration(seconds: number): string {
  const totalMinutes = Math.round(seconds / 60);
  const hours = Math.floor(totalMinutes / 60);
  const minutes = totalMinutes % 60;
  if (hours === 0) return `${minutes}min`;
  return `${hours}h ${minutes}min`;
}

export function formatVolume(volumeKg: number): string {
  if (volumeKg >= 1_000_000) {
    return `${(volumeKg / 1_000_000).toFixed(2)}M kg`;
  }
  if (volumeKg >= 10_000) {
    return `${Math.round(volumeKg / 1000)}k kg`;
  }
  if (volumeKg >= 1_000) {
    return `${(volumeKg / 1000).toFixed(1).replace(/\.0$/, '')}k kg`;
  }
  return `${Math.round(volumeKg)} kg`;
}

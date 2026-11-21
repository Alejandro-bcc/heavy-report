import { ensureExerciseDictionarySeeded } from '@/data/defaultExerciseDictionary';
import { db, updateUserSettings } from '@/db/database';
import type {
  ImportSummary,
  MonthlyCache,
  Workout,
  WorkoutDiffResult,
} from '@/types/workout';

/**
 * Pure diff helper comparing incoming parsed workouts against existing stored workouts
 * and known exercise titles. Exported for direct unit testing.
 */
export function diffWorkouts(
  incomingWorkouts: Workout[],
  existingById: Map<string, Workout>,
  knownExerciseTitles: Set<string>,
): WorkoutDiffResult {
  const newWorkouts: Workout[] = [];
  const modifiedWorkouts: Array<{ existing: Workout; incoming: Workout }> = [];
  let unchangedCount = 0;
  const unmappedSet = new Set<string>();

  for (const incoming of incomingWorkouts) {
    for (const set of incoming.sets) {
      if (!knownExerciseTitles.has(set.exerciseTitle)) {
        unmappedSet.add(set.exerciseTitle);
      }
    }

    const existing = existingById.get(incoming.id);
    if (!existing) {
      newWorkouts.push(incoming);
    } else if (existing.contentHash === incoming.contentHash) {
      unchangedCount++;
    } else {
      modifiedWorkouts.push({ existing, incoming });
    }
  }

  return {
    newWorkouts,
    unchangedCount,
    modifiedWorkouts,
    unmappedExercises: [...unmappedSet].sort((a, b) => a.localeCompare(b)),
  };
}

/**
 * Analyzes an incoming list of parsed workouts against IndexedDB without mutating anything.
 */
export async function analyzeImportDiff(
  incomingWorkouts: Workout[],
): Promise<WorkoutDiffResult> {
  await ensureExerciseDictionarySeeded();

  const [existingWorkouts, knownExerciseKeys] = await Promise.all([
    db.workouts.toArray(),
    db.exerciseMappings.toCollection().primaryKeys(),
  ]);

  const existingById = new Map<string, Workout>();
  for (const w of existingWorkouts) {
    existingById.set(w.id, w);
  }

  return diffWorkouts(incomingWorkouts, existingById, new Set(knownExerciseKeys));
}

function buildMonthlyCacheEntry(monthKey: string, workouts: Workout[]): MonthlyCache {
  let totalDurationSeconds = 0;
  let workingSets = 0;
  let warmupSets = 0;
  let rawWeightedVolumeKg = 0;
  const workoutIds: string[] = [];

  for (const w of workouts) {
    workoutIds.push(w.id);
    totalDurationSeconds += w.durationSeconds;
    for (const s of w.sets) {
      if (s.setType === 'warmup') {
        warmupSets++;
      } else {
        workingSets++;
        if (
          s.weightKg !== null &&
          s.weightKg > 0 &&
          s.reps !== null &&
          s.reps > 0 &&
          !/\(assisted\)/i.test(s.exerciseTitle)
        ) {
          rawWeightedVolumeKg += s.weightKg * s.reps;
        }
      }
    }
  }

  return {
    monthKey,
    workoutCount: workouts.length,
    totalDurationSeconds,
    workingSets,
    warmupSets,
    rawWeightedVolumeKg: Math.round(rawWeightedVolumeKg * 10) / 10,
    workoutIds,
    computedAt: Date.now(),
  };
}

/**
 * Rebuilds monthlyCache entries ONLY for the specified monthKeys.
 */
export async function rebuildMonthlyCacheForMonths(
  monthKeys: Iterable<string>,
): Promise<void> {
  const uniqueMonths = [...new Set(monthKeys)];
  for (const monthKey of uniqueMonths) {
    const workoutsInMonth = await db.workouts
      .where('monthKey')
      .equals(monthKey)
      .toArray();
    if (workoutsInMonth.length === 0) {
      await db.monthlyCache.delete(monthKey);
    } else {
      await db.monthlyCache.put(buildMonthlyCacheEntry(monthKey, workoutsInMonth));
    }
  }
}

export interface CommitImportParams {
  fileName: string;
  newWorkouts: Workout[];
  acceptedModifiedWorkouts: Array<{ existing: Workout; incoming: Workout }>;
  unchangedCount: number;
  unmappedExercises: string[];
}

/**
 * Persists only new & accepted-modified workouts and incrementally updates
 * only the affected monthKey caches in a single IndexedDB transaction.
 */
export async function commitIncrementalImport(
  params: CommitImportParams,
): Promise<ImportSummary> {
  const {
    fileName,
    newWorkouts,
    acceptedModifiedWorkouts,
    unchangedCount,
    unmappedExercises,
  } = params;

  const now = Date.now();
  const toPut: Workout[] = [
    ...newWorkouts,
    ...acceptedModifiedWorkouts.map(({ existing, incoming }) => ({
      ...incoming,
      importedAt: existing.importedAt,
      updatedAt: now,
    })),
  ];

  const affectedMonths = new Set<string>();
  for (const w of newWorkouts) {
    affectedMonths.add(w.monthKey);
  }
  for (const { existing, incoming } of acceptedModifiedWorkouts) {
    affectedMonths.add(existing.monthKey);
    affectedMonths.add(incoming.monthKey);
  }

  const summary: ImportSummary = {
    fileName,
    added: newWorkouts.length,
    skipped: unchangedCount,
    updated: acceptedModifiedWorkouts.length,
    unmappedExercises,
    timestamp: now,
  };

  await db.transaction(
    'rw',
    db.workouts,
    db.monthlyCache,
    db.settings,
    async () => {
      if (toPut.length > 0) {
        await db.workouts.bulkPut(toPut);
      }
      if (affectedMonths.size > 0) {
        await rebuildMonthlyCacheForMonths(affectedMonths);
      }
      await updateUserSettings({ lastImportSummary: summary });
    },
  );

  return summary;
}

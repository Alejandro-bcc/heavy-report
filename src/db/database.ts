import Dexie, { type EntityTable } from 'dexie';
import type {
  ExerciseMapping,
  MonthlyCache,
  UserSettings,
  Workout,
} from '@/types/workout';

export const DEFAULT_USER_SETTINGS: UserSettings = {
  id: 'default',
  includeWarmup: false,
  secondaryMuscleWeight: 0.5,
  bodyWeightKg: null,
  weekStartsOn: 1,
  lastImportSummary: null,
};

class HeavyReportDatabase extends Dexie {
  workouts!: EntityTable<Workout, 'id'>;
  exerciseMappings!: EntityTable<ExerciseMapping, 'exerciseTitle'>;
  monthlyCache!: EntityTable<MonthlyCache, 'monthKey'>;
  settings!: EntityTable<UserSettings, 'id'>;

  constructor() {
    super('HeavyReportDB');
    this.version(1).stores({
      workouts: 'id, startTime, dateKey, monthKey, year, contentHash',
      exerciseMappings: 'exerciseTitle, primaryMuscle, category, isCustom',
      monthlyCache: 'monthKey, computedAt',
      settings: 'id',
    });
  }
}

export const db = new HeavyReportDatabase();

export async function getOrInitSettings(): Promise<UserSettings> {
  const existing = await db.settings.get('default');
  if (existing) return existing;
  await db.settings.put(DEFAULT_USER_SETTINGS);
  return DEFAULT_USER_SETTINGS;
}

export async function updateUserSettings(
  patch: Partial<Omit<UserSettings, 'id'>>,
): Promise<UserSettings> {
  const current = await getOrInitSettings();
  const next: UserSettings = {
    ...current,
    ...patch,
    id: 'default',
  };
  await db.settings.put(next);
  return next;
}

export async function clearWorkoutDatabase(options?: {
  clearCustomMappings?: boolean;
}): Promise<void> {
  await db.transaction(
    'rw',
    db.workouts,
    db.monthlyCache,
    db.exerciseMappings,
    db.settings,
    async () => {
      await db.workouts.clear();
      await db.monthlyCache.clear();
      if (options?.clearCustomMappings) {
        await db.exerciseMappings.clear();
      }
      await updateUserSettings({ lastImportSummary: null });
    },
  );
}

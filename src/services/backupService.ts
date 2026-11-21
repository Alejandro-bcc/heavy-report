import { db, DEFAULT_USER_SETTINGS, getOrInitSettings } from '@/db/database';
import { ensureExerciseDictionarySeeded } from '@/data/defaultExerciseDictionary';
import { rebuildMonthlyCacheForMonths } from '@/services/importService';
import type { ExerciseMapping, UserSettings, Workout } from '@/types/workout';

export interface HeavyReportBackupPayload {
  app: 'heavy-report';
  version: 1;
  exportedAt: string;
  workouts: Workout[];
  customMappings: ExerciseMapping[];
  settings: UserSettings;
}

export function serializeBackupPayload(data: {
  workouts: Workout[];
  customMappings: ExerciseMapping[];
  settings: UserSettings;
}): string {
  const payload: HeavyReportBackupPayload = {
    app: 'heavy-report',
    version: 1,
    exportedAt: new Date().toISOString(),
    workouts: data.workouts,
    customMappings: data.customMappings,
    settings: data.settings,
  };
  return JSON.stringify(payload, null, 2);
}

export function parseAndValidateBackup(jsonText: string): HeavyReportBackupPayload {
  let raw: unknown;
  try {
    raw = JSON.parse(jsonText);
  } catch {
    throw new Error('Invalid JSON file. Could not parse backup contents.');
  }

  if (!raw || typeof raw !== 'object') {
    throw new Error('Invalid backup format: expected a JSON object.');
  }

  const obj = raw as Record<string, unknown>;
  if (obj.app !== 'heavy-report' || obj.version !== 1) {
    throw new Error('Unsupported backup file. Expected a Heavy Report v1 backup.');
  }

  if (!Array.isArray(obj.workouts)) {
    throw new Error('Invalid backup: missing workouts array.');
  }

  for (const w of obj.workouts) {
    if (
      !w ||
      typeof w !== 'object' ||
      typeof (w as Workout).id !== 'string' ||
      typeof (w as Workout).dateKey !== 'string' ||
      !Array.isArray((w as Workout).sets)
    ) {
      throw new Error('Invalid backup: one or more workouts have malformed structure.');
    }
  }

  const customMappings = Array.isArray(obj.customMappings)
    ? (obj.customMappings as ExerciseMapping[]).filter(
        (m) => m && typeof m.exerciseTitle === 'string',
      )
    : [];

  const rawSettings =
    obj.settings && typeof obj.settings === 'object'
      ? (obj.settings as Partial<UserSettings>)
      : {};

  const settings: UserSettings = {
    ...DEFAULT_USER_SETTINGS,
    ...rawSettings,
    id: 'default',
  };

  return {
    app: 'heavy-report',
    version: 1,
    exportedAt:
      typeof obj.exportedAt === 'string' ? obj.exportedAt : new Date().toISOString(),
    workouts: obj.workouts as Workout[],
    customMappings,
    settings,
  };
}

export async function createBackupJsonFromDb(): Promise<{
  json: string;
  fileName: string;
  workoutCount: number;
  customMappingCount: number;
}> {
  const [workouts, allMappings, settings] = await Promise.all([
    db.workouts.orderBy('startTime').reverse().toArray(),
    db.exerciseMappings.toArray(),
    getOrInitSettings(),
  ]);

  const customMappings = allMappings.filter((m) => m.isCustom);
  const json = serializeBackupPayload({ workouts, customMappings, settings });
  const dateStamp = new Date().toISOString().slice(0, 10);

  return {
    json,
    fileName: `heavy-report-backup-${dateStamp}.json`,
    workoutCount: workouts.length,
    customMappingCount: customMappings.length,
  };
}

export async function restoreBackupToDb(
  payload: HeavyReportBackupPayload,
  mode: 'merge' | 'replace',
): Promise<{ workoutsRestored: number; mappingsRestored: number }> {
  await db.transaction(
    'rw',
    db.workouts,
    db.exerciseMappings,
    db.monthlyCache,
    db.settings,
    async () => {
      if (mode === 'replace') {
        await db.workouts.clear();
        await db.monthlyCache.clear();
      }

      if (payload.workouts.length > 0) {
        await db.workouts.bulkPut(payload.workouts);
      }

      if (payload.customMappings.length > 0) {
        await db.exerciseMappings.bulkPut(
          payload.customMappings.map((m) => ({ ...m, isCustom: true })),
        );
      }

      await db.settings.put({ ...payload.settings, id: 'default' });

      const affectedMonths = new Set<string>(payload.workouts.map((w) => w.monthKey));
      if (affectedMonths.size > 0) {
        await rebuildMonthlyCacheForMonths(affectedMonths);
      }
    },
  );

  await ensureExerciseDictionarySeeded();

  return {
    workoutsRestored: payload.workouts.length,
    mappingsRestored: payload.customMappings.length,
  };
}

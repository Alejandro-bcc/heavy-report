import { describe, expect, it } from 'vitest';
import { DEFAULT_USER_SETTINGS } from '@/db/database';
import {
  parseAndValidateBackup,
  serializeBackupPayload,
} from '@/services/backupService';
import { parseHeavyCsv } from '@/services/csvParser';

const MINI_CSV = [
  '"title","start_time","end_time","description","exercise_title","superset_id","exercise_notes","set_index","set_type","weight_kg","reps","distance_km","duration_seconds","rpe"',
  '"A","20 Nov 2026, 09:59","20 Nov 2026, 11:00","","Chest Press (Machine)",,"",0,"normal",50,10,,,9',
].join('\n');

describe('backupService', () => {
  it('serializes and validates a complete v1 backup payload', () => {
    const { workouts } = parseHeavyCsv(MINI_CSV);
    const json = serializeBackupPayload({
      workouts,
      customMappings: [
        {
          exerciseTitle: 'Custom Lift',
          primaryMuscle: 'Chest',
          secondaryMuscles: ['Triceps'],
          category: 'weighted',
          isCustom: true,
          updatedAt: 123456,
        },
      ],
      settings: {
        ...DEFAULT_USER_SETTINGS,
        includeWarmup: true,
        bodyWeightKg: 80,
      },
    });

    const parsed = parseAndValidateBackup(json);
    expect(parsed.app).toBe('heavy-report');
    expect(parsed.version).toBe(1);
    expect(parsed.workouts).toHaveLength(1);
    expect(parsed.workouts[0].title).toBe('A');
    expect(parsed.customMappings).toHaveLength(1);
    expect(parsed.settings.includeWarmup).toBe(true);
    expect(parsed.settings.bodyWeightKg).toBe(80);
  });

  it('rejects invalid JSON or unsupported backup formats', () => {
    expect(() => parseAndValidateBackup('not-json')).toThrow(/Invalid JSON/i);
    expect(() =>
      parseAndValidateBackup(JSON.stringify({ app: 'other', version: 1 })),
    ).toThrow(/Unsupported backup/i);
    expect(() =>
      parseAndValidateBackup(
        JSON.stringify({ app: 'heavy-report', version: 1, workouts: [{ bad: true }] }),
      ),
    ).toThrow(/malformed/i);
  });
});

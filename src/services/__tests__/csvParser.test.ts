import fs from 'node:fs';
import path from 'node:path';
import { describe, expect, it } from 'vitest';
import { DEFAULT_EXERCISE_DICTIONARY } from '@/data/defaultExerciseDictionary';
import { parseHeavyCsv, parseHeavyTimestamp } from '@/services/csvParser';
import { SYNTHETIC_WORKOUT_CSV } from '@/services/__tests__/sampleCsvFixture';

describe('parseHeavyTimestamp', () => {
  it('parses single-digit and double-digit days in English format', () => {
    const t1 = parseHeavyTimestamp('19 Nov 2026, 20:52');
    expect(t1).not.toBeNull();
    expect(t1?.dateKey).toBe('2026-11-19');
    expect(t1?.monthKey).toBe('2026-11');
    expect(t1?.year).toBe(2026);
    expect(t1?.isoKey).toBe('2026-11-19T20:52');

    const t2 = parseHeavyTimestamp('9 Jul 2025, 15:30');
    expect(t2).not.toBeNull();
    expect(t2?.dateKey).toBe('2025-07-09');
    expect(t2?.monthKey).toBe('2025-07');
    expect(t2?.isoKey).toBe('2025-07-09T15:30');
  });

  it('returns null for invalid timestamps', () => {
    expect(parseHeavyTimestamp('not a date')).toBeNull();
  });
});

describe('parseHeavyCsv', () => {
  it('handles mixed CRLF/LF, emojis, repeated exercise blocks, and all set types cleanly', () => {
    const result = parseHeavyCsv(SYNTHETIC_WORKOUT_CSV);
    expect(result.warnings).toHaveLength(0);
    expect(result.skippedRows).toBe(0);
    expect(result.workouts).toHaveLength(8);
    expect(result.workouts[0].dateKey).toBe('2026-11-20');
    expect(result.workouts[0].durationSeconds).toBe(87 * 60);

    const emojiTitles = result.workouts
      .map((w) => w.title)
      .filter((t) => /💪|🌙/.test(t));
    expect(emojiTitles).toHaveLength(2);

    // Repeated exercise block must preserve all sets without overwriting set_index 0
    const legWorkout = result.workouts.find((w) => w.id === '2026-01-17T14:36');
    expect(legWorkout).toBeDefined();
    const hipAbductionSets =
      legWorkout?.sets.filter((s) => s.exerciseTitle === 'Hip Abduction (Machine)') ?? [];
    expect(hipAbductionSets).toHaveLength(3);
    expect(hipAbductionSets.filter((s) => s.setIndex === 0)).toHaveLength(2);
    expect(new Set(hipAbductionSets.map((s) => s.blockIndex)).size).toBe(2);
  });

  it('parses local test_data/workout_data.csv when present with 0 errors and full dictionary coverage', () => {
    const csvPath = path.resolve(process.cwd(), 'test_data/workout_data.csv');
    if (!fs.existsSync(csvPath)) {
      return;
    }

    const raw = fs.readFileSync(csvPath, 'utf8');
    const result = parseHeavyCsv(raw);

    expect(result.warnings).toHaveLength(0);
    expect(result.skippedRows).toBe(0);
    expect(result.totalRows).toBe(2227);
    expect(result.workouts).toHaveLength(117);

    const totalSets = result.workouts.reduce((sum, w) => sum + w.sets.length, 0);
    expect(totalSets).toBe(2227);

    const allExercises = new Set<string>();
    for (const w of result.workouts) {
      for (const s of w.sets) allExercises.add(s.exerciseTitle);
    }
    const missingFromDict = [...allExercises].filter(
      (ex) => !(ex in DEFAULT_EXERCISE_DICTIONARY),
    );
    expect(missingFromDict).toEqual([]);
  });

  it('throws a clear error when required CSV columns are missing', () => {
    expect(() => parseHeavyCsv('foo,bar\n1,2')).toThrow(/Missing required columns/i);
  });
});

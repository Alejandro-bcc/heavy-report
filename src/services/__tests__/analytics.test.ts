import fs from 'node:fs';
import path from 'node:path';
import { describe, expect, it } from 'vitest';
import { DEFAULT_EXERCISE_DICTIONARY } from '@/data/defaultExerciseDictionary';
import {
  buildMuscleHistorySeries,
  computePeriodComparison,
  getLast7DaysData,
  getWeekWindow,
  parseDateKey,
} from '@/services/analytics';
import { parseHeavyCsv } from '@/services/csvParser';
import { SYNTHETIC_WORKOUT_CSV } from '@/services/__tests__/sampleCsvFixture';
import type { ExerciseMapping } from '@/types/workout';

function buildMappingsMap(): Map<string, ExerciseMapping> {
  const map = new Map<string, ExerciseMapping>();
  for (const [exerciseTitle, entry] of Object.entries(DEFAULT_EXERCISE_DICTIONARY)) {
    map.set(exerciseTitle, {
      exerciseTitle,
      primaryMuscle: entry.primaryMuscle,
      secondaryMuscles: entry.secondaryMuscles,
      category: entry.category,
      isCustom: false,
      updatedAt: 0,
    });
  }
  return map;
}

function loadTestCsv(): string {
  const csvPath = path.resolve(process.cwd(), 'test_data/workout_data.csv');
  return fs.existsSync(csvPath) ? fs.readFileSync(csvPath, 'utf8') : SYNTHETIC_WORKOUT_CSV;
}

describe('analytics', () => {
  const { workouts } = parseHeavyCsv(loadTestCsv());
  const mappings = buildMappingsMap();
  const settings = {
    includeWarmup: false,
    secondaryMuscleWeight: 0.5,
    bodyWeightKg: null,
  };
  const refDate = parseDateKey('2026-11-20');

  it('computes last 7 days strip and weekly Mon-Sun window accurately', () => {
    const last7 = getLast7DaysData(workouts, refDate);
    expect(last7.days).toHaveLength(7);
    expect(last7.days[0].dateKey).toBe('2026-11-14');
    expect(last7.days[6].dateKey).toBe('2026-11-20');
    expect(last7.days[6].hasWorkout).toBe(true);
    expect(last7.workoutsInWindow.length).toBeGreaterThan(0);

    const week = getWeekWindow(workouts, 0, 1, refDate);
    expect(week.startKey).toBe('2026-11-16');
    expect(week.endKey).toBe('2026-11-22');
    expect(week.label).toBe('16–22 November 2026');
    expect(week.days).toHaveLength(7);
    expect(week.days[0].dayShort).toBe('Mon');
    expect(week.days[6].dayShort).toBe('Sun');
  });

  it('computes 30d comparison with previous period and All time without previous period', () => {
    const comp30 = computePeriodComparison(workouts, '30d', mappings, settings, refDate);
    expect(comp30.currentKpis.workouts).toBeGreaterThan(0);
    expect(comp30.previousKpis).not.toBeNull();
    expect(comp30.previousMuscles).not.toBeNull();
    expect(comp30.currentMuscles.totalWeightedSets).toBeGreaterThan(0);

    const compAll = computePeriodComparison(workouts, 'all', mappings, settings, refDate);
    expect(compAll.currentKpis.workouts).toBe(workouts.length);
    expect(compAll.previousKpis).toBeNull();
    expect(compAll.previousMuscles).toBeNull();
  });

  it('builds chronological monthly & weekly history series for a selected muscle', () => {
    const chestMonthly = buildMuscleHistorySeries(
      workouts,
      'Chest',
      mappings,
      settings,
      'month',
    );
    expect(chestMonthly.length).toBeGreaterThanOrEqual(3);
    expect(chestMonthly.some((p) => p.sets > 0 && p.volumeKg > 0)).toBe(true);

    const totalWeekly = buildMuscleHistorySeries(
      workouts,
      'Total',
      mappings,
      settings,
      'week',
    );
    expect(totalWeekly.length).toBeGreaterThanOrEqual(5);
  });
});

import fs from 'node:fs';
import path from 'node:path';
import { describe, expect, it } from 'vitest';
import { DEFAULT_EXERCISE_DICTIONARY } from '@/data/defaultExerciseDictionary';
import { parseDateKey } from '@/services/analytics';
import { parseHeavyCsv } from '@/services/csvParser';
import {
  buildContinuousMonths,
  buildMultiYearHeatmaps,
  buildYearMiniCalendars,
  calculateStreakAndRestDays,
  getExerciseDetailHistory,
  getMainExercisesRanking,
} from '@/services/exerciseCalendarAnalytics';
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

describe('exercise & calendar analytics', () => {
  const { workouts } = parseHeavyCsv(loadTestCsv());
  const mappings = buildMappingsMap();
  const settings = {
    includeWarmup: false,
    secondaryMuscleWeight: 0.5,
    bodyWeightKg: 80,
  };
  const refDate = parseDateKey('2026-11-20');

  it('ranks main exercises by session frequency for 30d and All time', () => {
    const allRank = getMainExercisesRanking(workouts, 'all', mappings, settings, refDate);
    expect(allRank.length).toBeGreaterThanOrEqual(5);
    expect(allRank[0].timesPerformed).toBeGreaterThanOrEqual(allRank[1].timesPerformed);

    const last30Rank = getMainExercisesRanking(workouts, '30d', mappings, settings, refDate);
    expect(last30Rank.length).toBeGreaterThan(0);
    expect(last30Rank[0].timesPerformed).toBeLessThanOrEqual(allRank[0].timesPerformed);
  });

  it('computes detailed exercise history for weighted, assisted, and duration exercises', () => {
    const chestPress = getExerciseDetailHistory(
      workouts,
      'Chest Press (Machine)',
      mappings.get('Chest Press (Machine)'),
      settings,
      'all',
      refDate,
    );
    expect(chestPress.totalSessions).toBeGreaterThanOrEqual(5);
    expect(chestPress.prMaxWeightKg).toBeGreaterThan(0);
    expect(chestPress.prBest1RM).toBeGreaterThan(0);
    expect(chestPress.overallAvgRpe).not.toBeNull();

    const assistedPullUp = getExerciseDetailHistory(
      workouts,
      'Pull Up (Assisted)',
      mappings.get('Pull Up (Assisted)'),
      settings,
      'all',
      refDate,
    );
    expect(assistedPullUp.isAssisted).toBe(true);
    expect(assistedPullUp.prLowestAssistanceKg).toBeGreaterThan(0);
    expect(assistedPullUp.prBest1RM).toBeNull();
    expect(assistedPullUp.prBestVolumeKg).toBeGreaterThan(0);

    const plank = getExerciseDetailHistory(
      workouts,
      'Plank',
      mappings.get('Plank'),
      settings,
      'all',
      refDate,
    );
    expect(plank.prMaxDurationSeconds).toBeGreaterThan(0);
  });

  it('calculates weekly streak, rest days, continuous months, year grid, and multi-year heatmap', () => {
    const streak = calculateStreakAndRestDays(workouts, 1, refDate);
    expect(streak.restDays).toBe(0);
    expect(streak.weekStreak).toBeGreaterThanOrEqual(1);
    expect(streak.longestWeekStreak).toBeGreaterThanOrEqual(streak.weekStreak);

    const months = buildContinuousMonths(workouts, 1, refDate);
    expect(months[0].monthKey).toBe('2026-11');
    expect(months[months.length - 1].monthKey).toBe('2025-07');

    const year2026 = buildYearMiniCalendars(2026, workouts, 1, refDate);
    expect(year2026).toHaveLength(12);

    const heatmaps = buildMultiYearHeatmaps(workouts, 1);
    expect(heatmaps.map((h) => h.year)).toEqual([2026, 2025]);
    const totalHeatmapWorkouts = heatmaps.reduce((s, h) => s + h.totalWorkouts, 0);
    expect(totalHeatmapWorkouts).toBe(workouts.length);
  });
});

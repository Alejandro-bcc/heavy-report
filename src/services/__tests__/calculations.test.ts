import { describe, expect, it } from 'vitest';
import {
  accumulateMuscleSets,
  calculateEstimated1RM,
  calculatePeriodKpis,
  calculateSetVolumeKg,
  formatDuration,
  formatVolume,
} from '@/services/calculations';
import type { ExerciseMapping, Workout, WorkoutSet } from '@/types/workout';

function makeSet(overrides: Partial<WorkoutSet>): WorkoutSet {
  return {
    rowIndex: 0,
    exerciseTitle: 'Chest Press (Machine)',
    blockIndex: 0,
    setIndex: 0,
    setType: 'normal',
    weightKg: 50,
    reps: 10,
    distanceKm: null,
    durationSeconds: null,
    rpe: null,
    supersetId: null,
    exerciseNotes: null,
    ...overrides,
  };
}

const MAPPINGS = new Map<string, ExerciseMapping>([
  [
    'Chest Press (Machine)',
    {
      exerciseTitle: 'Chest Press (Machine)',
      primaryMuscle: 'Chest',
      secondaryMuscles: ['Triceps', 'Shoulders'],
      category: 'weighted',
      isCustom: false,
      updatedAt: 0,
    },
  ],
  [
    'Pull Up (Assisted)',
    {
      exerciseTitle: 'Pull Up (Assisted)',
      primaryMuscle: 'Lats',
      secondaryMuscles: ['Upper Back', 'Biceps'],
      category: 'assisted',
      isCustom: false,
      updatedAt: 0,
    },
  ],
  [
    'Push Up',
    {
      exerciseTitle: 'Push Up',
      primaryMuscle: 'Chest',
      secondaryMuscles: ['Triceps'],
      category: 'bodyweight',
      isCustom: false,
      updatedAt: 0,
    },
  ],
  [
    'Plank',
    {
      exerciseTitle: 'Plank',
      primaryMuscle: 'Abdominals',
      secondaryMuscles: ['Lower Back'],
      category: 'duration',
      isCustom: false,
      updatedAt: 0,
    },
  ],
]);

describe('calculations', () => {
  it('handles weighted, bodyweight, assisted, and duration volume rules', () => {
    const weighted = makeSet({ weightKg: 47.5, reps: 10 });
    const assisted = makeSet({
      exerciseTitle: 'Pull Up (Assisted)',
      weightKg: 25,
      reps: 10,
    });
    const bodyweight = makeSet({
      exerciseTitle: 'Push Up',
      weightKg: null,
      reps: 15,
    });
    const plank = makeSet({
      exerciseTitle: 'Plank',
      weightKg: null,
      reps: null,
      durationSeconds: 60,
    });

    // Without bodyWeightKg configured
    expect(calculateSetVolumeKg(weighted, MAPPINGS.get('Chest Press (Machine)'), { bodyWeightKg: null })).toBe(475);
    expect(calculateSetVolumeKg(assisted, MAPPINGS.get('Pull Up (Assisted)'), { bodyWeightKg: null })).toBe(0);
    expect(calculateSetVolumeKg(bodyweight, MAPPINGS.get('Push Up'), { bodyWeightKg: null })).toBe(0);
    expect(calculateSetVolumeKg(plank, MAPPINGS.get('Plank'), { bodyWeightKg: null })).toBe(0);

    // With bodyWeightKg = 80 kg configured
    expect(calculateSetVolumeKg(assisted, MAPPINGS.get('Pull Up (Assisted)'), { bodyWeightKg: 80 })).toBe(550);
    expect(calculateSetVolumeKg(bodyweight, MAPPINGS.get('Push Up'), { bodyWeightKg: 80 })).toBe(1200);
    expect(calculateSetVolumeKg(plank, MAPPINGS.get('Plank'), { bodyWeightKg: 80 })).toBe(0);
  });

  it('excludes warmup sets by default and counts primary 1.0 + secondary 0.5', () => {
    const workout: Workout = {
      id: '2026-11-20T09:59',
      contentHash: 'abc',
      title: 'A',
      description: null,
      startTime: 1000,
      endTime: 4600_000,
      durationSeconds: 4599,
      dateKey: '2026-11-20',
      monthKey: '2026-11',
      year: 2026,
      importedAt: 0,
      updatedAt: 0,
      sets: [
        makeSet({ rowIndex: 0, setType: 'warmup', weightKg: 25, reps: 12 }),
        makeSet({ rowIndex: 1, setType: 'normal', weightKg: 50, reps: 10 }),
        makeSet({ rowIndex: 2, setType: 'failure', weightKg: 50, reps: 8 }),
        makeSet({
          rowIndex: 3,
          exerciseTitle: 'Plank',
          setType: 'normal',
          weightKg: null,
          reps: null,
          durationSeconds: 60,
        }),
      ],
    };

    const excludedWarmup = accumulateMuscleSets([workout], MAPPINGS, {
      includeWarmup: false,
      secondaryMuscleWeight: 0.5,
      bodyWeightKg: null,
    });

    expect(excludedWarmup.detailed.Chest).toBe(2);
    expect(excludedWarmup.detailed.Triceps).toBe(1);
    expect(excludedWarmup.detailed.Shoulders).toBe(1);
    expect(excludedWarmup.detailed.Abdominals).toBe(1);
    expect(excludedWarmup.detailed['Lower Back']).toBe(0.5);
    expect(excludedWarmup.macro.Chest).toBe(2);
    expect(excludedWarmup.macro.Arms).toBe(1);
    expect(excludedWarmup.macro.Core).toBe(1);
    expect(excludedWarmup.macro.Back).toBe(0.5);

    const kpisNoWarmup = calculatePeriodKpis([workout], MAPPINGS, {
      includeWarmup: false,
      secondaryMuscleWeight: 0.5,
      bodyWeightKg: null,
    });
    expect(kpisNoWarmup.sets).toBe(3);
    expect(kpisNoWarmup.volumeKg).toBe(900);

    const kpisWithWarmup = calculatePeriodKpis([workout], MAPPINGS, {
      includeWarmup: true,
      secondaryMuscleWeight: 0.5,
      bodyWeightKg: null,
    });
    expect(kpisWithWarmup.sets).toBe(4);
    expect(kpisWithWarmup.volumeKg).toBe(1200);
  });

  it('calculates Epley estimated 1RM and formats KPI values', () => {
    expect(calculateEstimated1RM(100, 1)).toBe(100);
    expect(calculateEstimated1RM(100, 10)).toBe(133.3);
    expect(calculateEstimated1RM(25, 10, true)).toBeNull();
    expect(formatDuration(87 * 60)).toBe('1h 27min');
    expect(formatVolume(25400)).toBe('25k kg');
    expect(formatVolume(3450)).toBe('3.5k kg');
  });
});

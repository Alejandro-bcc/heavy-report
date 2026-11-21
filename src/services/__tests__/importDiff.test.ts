import { describe, expect, it } from 'vitest';
import { parseHeavyCsv } from '@/services/csvParser';
import { diffWorkouts } from '@/services/importService';
import type { Workout } from '@/types/workout';

const SAMPLE_CSV = [
  '"title","start_time","end_time","description","exercise_title","superset_id","exercise_notes","set_index","set_type","weight_kg","reps","distance_km","duration_seconds","rpe"',
  '"A","18 Nov 2026, 10:00","18 Nov 2026, 11:00","","Chest Press (Machine)",,"",0,"normal",50,10,,,9',
  '"B","19 Nov 2026, 10:00","19 Nov 2026, 11:00","","Unknown Custom Lift",,"",0,"normal",20,12,,,8.5',
].join('\n');

describe('diffWorkouts (incremental deduplication)', () => {
  it('classifies new, unchanged, modified workouts and unmapped exercises', () => {
    const initial = parseHeavyCsv(SAMPLE_CSV).workouts;
    const existingMap = new Map<string, Workout>();
    const knownExercises = new Set<string>(['Chest Press (Machine)']);

    // First upload: all new + 1 unmapped exercise
    const firstDiff = diffWorkouts(initial, existingMap, knownExercises);
    expect(firstDiff.newWorkouts).toHaveLength(2);
    expect(firstDiff.unchangedCount).toBe(0);
    expect(firstDiff.modifiedWorkouts).toHaveLength(0);
    expect(firstDiff.unmappedExercises).toEqual(['Unknown Custom Lift']);

    // Persist first upload into map
    for (const w of initial) existingMap.set(w.id, w);

    // Second upload of identical CSV: 0 new, 2 skipped, 0 modified
    const secondDiff = diffWorkouts(initial, existingMap, knownExercises);
    expect(secondDiff.newWorkouts).toHaveLength(0);
    expect(secondDiff.unchangedCount).toBe(2);
    expect(secondDiff.modifiedWorkouts).toHaveLength(0);

    // Third upload: workout A edited (weight 50 -> 55), workout B unchanged, workout C added
    const updatedCsv = [
      '"title","start_time","end_time","description","exercise_title","superset_id","exercise_notes","set_index","set_type","weight_kg","reps","distance_km","duration_seconds","rpe"',
      '"A","18 Nov 2026, 10:00","18 Nov 2026, 11:00","","Chest Press (Machine)",,"",0,"normal",55,10,,,9.5',
      '"B","19 Nov 2026, 10:00","19 Nov 2026, 11:00","","Unknown Custom Lift",,"",0,"normal",20,12,,,8.5',
      '"C","20 Nov 2026, 10:00","20 Nov 2026, 11:00","","Chest Press (Machine)",,"",0,"normal",60,8,,,10',
    ].join('\n');

    const incomingThird = parseHeavyCsv(updatedCsv).workouts;
    const thirdDiff = diffWorkouts(incomingThird, existingMap, knownExercises);

    expect(thirdDiff.newWorkouts.map((w) => w.title)).toEqual(['C']);
    expect(thirdDiff.unchangedCount).toBe(1);
    expect(thirdDiff.modifiedWorkouts).toHaveLength(1);
    expect(thirdDiff.modifiedWorkouts[0].incoming.title).toBe('A');
    expect(thirdDiff.modifiedWorkouts[0].existing.sets[0].weightKg).toBe(50);
    expect(thirdDiff.modifiedWorkouts[0].incoming.sets[0].weightKg).toBe(55);
  });
});

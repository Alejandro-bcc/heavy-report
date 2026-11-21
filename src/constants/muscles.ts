import type { DetailedMuscle, MacroMuscle } from '@/types/workout';

export const DETAILED_MUSCLES: readonly DetailedMuscle[] = [
  'Abdominals',
  'Abductors',
  'Adductors',
  'Biceps',
  'Calves',
  'Chest',
  'Forearms',
  'Glutes',
  'Hamstrings',
  'Lats',
  'Lower Back',
  'Quadriceps',
  'Shoulders',
  'Traps',
  'Triceps',
  'Upper Back',
] as const;

export const MACRO_MUSCLES: readonly MacroMuscle[] = [
  'Back',
  'Chest',
  'Core',
  'Shoulders',
  'Arms',
  'Legs',
] as const;

export const DETAILED_TO_MACRO: Record<DetailedMuscle, MacroMuscle> = {
  Abdominals: 'Core',
  Abductors: 'Legs',
  Adductors: 'Legs',
  Biceps: 'Arms',
  Calves: 'Legs',
  Chest: 'Chest',
  Forearms: 'Arms',
  Glutes: 'Legs',
  Hamstrings: 'Legs',
  Lats: 'Back',
  'Lower Back': 'Back',
  Quadriceps: 'Legs',
  Shoulders: 'Shoulders',
  Traps: 'Back',
  Triceps: 'Arms',
  'Upper Back': 'Back',
};

export const MACRO_TO_DETAILED: Record<MacroMuscle, readonly DetailedMuscle[]> = {
  Back: ['Lats', 'Upper Back', 'Lower Back', 'Traps'],
  Chest: ['Chest'],
  Core: ['Abdominals'],
  Shoulders: ['Shoulders'],
  Arms: ['Biceps', 'Triceps', 'Forearms'],
  Legs: ['Quadriceps', 'Hamstrings', 'Glutes', 'Calves', 'Abductors', 'Adductors'],
};

export function createEmptyMuscleCounts(): Record<DetailedMuscle, number> {
  return {
    Abdominals: 0,
    Abductors: 0,
    Adductors: 0,
    Biceps: 0,
    Calves: 0,
    Chest: 0,
    Forearms: 0,
    Glutes: 0,
    Hamstrings: 0,
    Lats: 0,
    'Lower Back': 0,
    Quadriceps: 0,
    Shoulders: 0,
    Traps: 0,
    Triceps: 0,
    'Upper Back': 0,
  };
}

export function createEmptyMacroCounts(): Record<MacroMuscle, number> {
  return {
    Back: 0,
    Chest: 0,
    Core: 0,
    Shoulders: 0,
    Arms: 0,
    Legs: 0,
  };
}

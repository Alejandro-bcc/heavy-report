import { DETAILED_MUSCLES } from '@/constants/muscles';
import {
  accumulateMuscleSets,
  calculatePeriodKpis,
  calculateSetVolumeKg,
  isSetCounted,
  type CalcSettings,
  type MuscleSetTotals,
  type PeriodKpis,
} from '@/services/calculations';
import type {
  DetailedMuscle,
  ExerciseMapping,
  PeriodFilter,
  Workout,
} from '@/types/workout';

const MONTH_SHORT = [
  'Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun',
  'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec',
];

const MONTH_LONG = [
  'January', 'February', 'March', 'April', 'May', 'June',
  'July', 'August', 'September', 'October', 'November', 'December',
];

const DAY_SHORT = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
const DAY_INITIAL = ['S', 'M', 'T', 'W', 'T', 'F', 'S'];

function pad2(n: number): string {
  return String(n).padStart(2, '0');
}

export function toDateKey(date: Date): string {
  return `${date.getFullYear()}-${pad2(date.getMonth() + 1)}-${pad2(date.getDate())}`;
}

export function parseDateKey(dateKey: string): Date {
  const [y, m, d] = dateKey.split('-').map(Number);
  return new Date(y, (m ?? 1) - 1, d ?? 1, 12, 0, 0, 0);
}

export function addDays(date: Date, deltaDays: number): Date {
  const next = new Date(date.getFullYear(), date.getMonth(), date.getDate() + deltaDays, 12, 0, 0, 0);
  return next;
}

export function addMonths(date: Date, deltaMonths: number): Date {
  const next = new Date(date.getFullYear(), date.getMonth() + deltaMonths, date.getDate(), 12, 0, 0, 0);
  return next;
}

/**
 * Anchors relative ranges ("Last 7 days", "Last 30 days", etc.) on today's local date,
 * or on the newest workout date if the imported CSV contains newer dates.
 */
export function getReferenceDate(workouts: Workout[]): Date {
  const now = new Date();
  const todayNoon = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 12, 0, 0, 0);
  if (workouts.length === 0) return todayNoon;
  let newestKey = workouts[0].dateKey;
  for (const w of workouts) {
    if (w.dateKey > newestKey) newestKey = w.dateKey;
  }
  const newestDate = parseDateKey(newestKey);
  return newestDate.getTime() > todayNoon.getTime() ? newestDate : todayNoon;
}

export interface DayPill {
  dateKey: string;
  dayShort: string;
  dayInitial: string;
  dayNumber: number;
  hasWorkout: boolean;
  workoutCount: number;
  titles: string[];
}

export function getLast7DaysData(workouts: Workout[], referenceDate?: Date): {
  days: DayPill[];
  workoutsInWindow: Workout[];
} {
  const ref = referenceDate ?? getReferenceDate(workouts);
  const start = addDays(ref, -6);
  const startKey = toDateKey(start);
  const endKey = toDateKey(ref);

  const byDate = new Map<string, Workout[]>();
  const workoutsInWindow: Workout[] = [];
  for (const w of workouts) {
    if (w.dateKey >= startKey && w.dateKey <= endKey) {
      workoutsInWindow.push(w);
      const list = byDate.get(w.dateKey) ?? [];
      list.push(w);
      byDate.set(w.dateKey, list);
    }
  }

  const days: DayPill[] = [];
  for (let i = 0; i < 7; i++) {
    const d = addDays(start, i);
    const key = toDateKey(d);
    const list = byDate.get(key) ?? [];
    days.push({
      dateKey: key,
      dayShort: DAY_SHORT[d.getDay()],
      dayInitial: DAY_INITIAL[d.getDay()],
      dayNumber: d.getDate(),
      hasWorkout: list.length > 0,
      workoutCount: list.length,
      titles: list.map((w) => w.title),
    });
  }

  return { days, workoutsInWindow };
}

export function getStartOfWeek(date: Date, weekStartsOn: 0 | 1 = 1): Date {
  const day = date.getDay();
  const diff = (day - weekStartsOn + 7) % 7;
  return addDays(date, -diff);
}

export function formatWeekRangeLabel(start: Date, end: Date): string {
  const sameYear = start.getFullYear() === end.getFullYear();
  const sameMonth = sameYear && start.getMonth() === end.getMonth();

  if (sameMonth) {
    return `${start.getDate()}–${end.getDate()} ${MONTH_LONG[start.getMonth()]} ${start.getFullYear()}`;
  }
  if (sameYear) {
    return `${start.getDate()} ${MONTH_SHORT[start.getMonth()]} – ${end.getDate()} ${MONTH_SHORT[end.getMonth()]} ${start.getFullYear()}`;
  }
  return `${start.getDate()} ${MONTH_SHORT[start.getMonth()]} ${start.getFullYear()} – ${end.getDate()} ${MONTH_SHORT[end.getMonth()]} ${end.getFullYear()}`;
}

export interface WeekWindowResult {
  startKey: string;
  endKey: string;
  label: string;
  days: DayPill[];
  workouts: Workout[];
}

export function getWeekWindow(
  workouts: Workout[],
  weekOffset: number,
  weekStartsOn: 0 | 1 = 1,
  referenceDate?: Date,
): WeekWindowResult {
  const ref = referenceDate ?? getReferenceDate(workouts);
  const currentWeekStart = getStartOfWeek(ref, weekStartsOn);
  const start = addDays(currentWeekStart, weekOffset * 7);
  const end = addDays(start, 6);
  const startKey = toDateKey(start);
  const endKey = toDateKey(end);

  const byDate = new Map<string, Workout[]>();
  const matched: Workout[] = [];
  for (const w of workouts) {
    if (w.dateKey >= startKey && w.dateKey <= endKey) {
      matched.push(w);
      const list = byDate.get(w.dateKey) ?? [];
      list.push(w);
      byDate.set(w.dateKey, list);
    }
  }

  const days: DayPill[] = [];
  for (let i = 0; i < 7; i++) {
    const d = addDays(start, i);
    const key = toDateKey(d);
    const list = byDate.get(key) ?? [];
    days.push({
      dateKey: key,
      dayShort: DAY_SHORT[d.getDay()],
      dayInitial: DAY_INITIAL[d.getDay()],
      dayNumber: d.getDate(),
      hasWorkout: list.length > 0,
      workoutCount: list.length,
      titles: list.map((w) => w.title),
    });
  }

  return {
    startKey,
    endKey,
    label: formatWeekRangeLabel(start, end),
    days,
    workouts: matched,
  };
}

export interface PeriodComparison {
  period: PeriodFilter;
  currentRangeLabel: string;
  previousRangeLabel: string | null;
  currentWorkouts: Workout[];
  previousWorkouts: Workout[] | null;
  currentKpis: PeriodKpis;
  previousKpis: PeriodKpis | null;
  currentMuscles: MuscleSetTotals;
  previousMuscles: MuscleSetTotals | null;
}

export function getPeriodBounds(
  period: PeriodFilter,
  referenceDate: Date,
): {
  currentStartKey: string | null;
  currentEndKey: string;
  previousStartKey: string | null;
  previousEndKey: string | null;
  currentLabel: string;
  previousLabel: string | null;
} {
  const endKey = toDateKey(referenceDate);

  if (period === 'all') {
    return {
      currentStartKey: null,
      currentEndKey: endKey,
      previousStartKey: null,
      previousEndKey: null,
      currentLabel: 'All time',
      previousLabel: null,
    };
  }

  let currentStart: Date;
  let previousStart: Date;
  let previousEnd: Date;

  if (period === '30d') {
    currentStart = addDays(referenceDate, -29);
    previousEnd = addDays(currentStart, -1);
    previousStart = addDays(previousEnd, -29);
  } else if (period === '3m') {
    currentStart = addMonths(referenceDate, -3);
    previousEnd = addDays(currentStart, -1);
    previousStart = addMonths(currentStart, -3);
  } else {
    // 1y
    currentStart = addMonths(referenceDate, -12);
    previousEnd = addDays(currentStart, -1);
    previousStart = addMonths(currentStart, -12);
  }

  const fmt = (d: Date) => `${d.getDate()} ${MONTH_SHORT[d.getMonth()]} ${d.getFullYear()}`;
  return {
    currentStartKey: toDateKey(currentStart),
    currentEndKey: endKey,
    previousStartKey: toDateKey(previousStart),
    previousEndKey: toDateKey(previousEnd),
    currentLabel: `${fmt(currentStart)} – ${fmt(referenceDate)}`,
    previousLabel: `${fmt(previousStart)} – ${fmt(previousEnd)}`,
  };
}

export function computePeriodComparison(
  workouts: Workout[],
  period: PeriodFilter,
  mappingsByTitle: Map<string, ExerciseMapping>,
  settings: CalcSettings,
  referenceDate?: Date,
): PeriodComparison {
  const ref = referenceDate ?? getReferenceDate(workouts);
  const bounds = getPeriodBounds(period, ref);

  const currentWorkouts =
    bounds.currentStartKey === null
      ? workouts
      : workouts.filter(
          (w) =>
            w.dateKey >= bounds.currentStartKey! && w.dateKey <= bounds.currentEndKey,
        );

  const previousWorkouts =
    bounds.previousStartKey === null || bounds.previousEndKey === null
      ? null
      : workouts.filter(
          (w) =>
            w.dateKey >= bounds.previousStartKey! && w.dateKey <= bounds.previousEndKey!,
        );

  return {
    period,
    currentRangeLabel: bounds.currentLabel,
    previousRangeLabel: bounds.previousLabel,
    currentWorkouts,
    previousWorkouts,
    currentKpis: calculatePeriodKpis(currentWorkouts, mappingsByTitle, settings),
    previousKpis: previousWorkouts
      ? calculatePeriodKpis(previousWorkouts, mappingsByTitle, settings)
      : null,
    currentMuscles: accumulateMuscleSets(currentWorkouts, mappingsByTitle, settings),
    previousMuscles: previousWorkouts
      ? accumulateMuscleSets(previousWorkouts, mappingsByTitle, settings)
      : null,
  };
}

export interface MuscleHistoryPoint {
  bucketKey: string;
  label: string;
  sets: number;
  volumeKg: number;
}

/**
 * Builds a weekly or monthly historical time-series of sets & volume for either a single
 * DetailedMuscle or 'Total' across all muscles.
 */
export function buildMuscleHistorySeries(
  workouts: Workout[],
  muscle: DetailedMuscle | 'Total',
  mappingsByTitle: Map<string, ExerciseMapping>,
  settings: CalcSettings,
  granularity: 'week' | 'month',
): MuscleHistoryPoint[] {
  if (workouts.length === 0) return [];

  const buckets = new Map<string, { label: string; sets: number; volumeKg: number }>();

  // Walk chronologically from oldest to newest
  const chronological = [...workouts].sort((a, b) => a.startTime - b.startTime);

  for (const w of chronological) {
    let bucketKey: string;
    let label: string;

    if (granularity === 'month') {
      bucketKey = w.monthKey;
      const [y, m] = w.monthKey.split('-').map(Number);
      label = `${MONTH_SHORT[(m ?? 1) - 1]} ${String(y).slice(2)}`;
    } else {
      const weekStart = getStartOfWeek(parseDateKey(w.dateKey), 1);
      bucketKey = toDateKey(weekStart);
      label = `${weekStart.getDate()} ${MONTH_SHORT[weekStart.getMonth()]}`;
    }

    let entry = buckets.get(bucketKey);
    if (!entry) {
      entry = { label, sets: 0, volumeKg: 0 };
      buckets.set(bucketKey, entry);
    }

    for (const set of w.sets) {
      if (!isSetCounted(set, settings)) continue;
      const mapping = mappingsByTitle.get(set.exerciseTitle);
      if (!mapping) continue;

      const vol = calculateSetVolumeKg(set, mapping, settings);

      if (muscle === 'Total') {
        let totalContribution = 0;
        if (mapping.primaryMuscle) totalContribution += 1;
        for (const sec of mapping.secondaryMuscles) {
          if (sec !== mapping.primaryMuscle) {
            totalContribution += settings.secondaryMuscleWeight;
          }
        }
        entry.sets += totalContribution;
        entry.volumeKg += vol;
      } else {
        if (mapping.primaryMuscle === muscle) {
          entry.sets += 1;
          entry.volumeKg += vol;
        } else if (mapping.secondaryMuscles.includes(muscle)) {
          entry.sets += settings.secondaryMuscleWeight;
          entry.volumeKg += vol * settings.secondaryMuscleWeight;
        }
      }
    }
  }

  return [...buckets.entries()]
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([bucketKey, v]) => ({
      bucketKey,
      label: v.label,
      sets: Math.round(v.sets * 100) / 100,
      volumeKg: Math.round(v.volumeKg),
    }));
}

export function formatFractionalSets(value: number): string {
  const rounded = Math.round(value * 10) / 10;
  return Number.isInteger(rounded) ? String(rounded) : rounded.toFixed(1);
}

export function getSortedMusclesBySets(
  detailed: Record<DetailedMuscle, number>,
): Array<{ muscle: DetailedMuscle; sets: number }> {
  return DETAILED_MUSCLES.map((muscle) => ({
    muscle,
    sets: detailed[muscle],
  })).sort((a, b) => {
    if (b.sets !== a.sets) return b.sets - a.sets;
    return a.muscle.localeCompare(b.muscle);
  });
}

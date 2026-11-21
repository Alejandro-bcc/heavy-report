import {
  addDays,
  getPeriodBounds,
  getReferenceDate,
  getStartOfWeek,
  parseDateKey,
  toDateKey,
} from '@/services/analytics';
import {
  calculateEstimated1RM,
  calculateSetVolumeKg,
  isAssistedExercise,
  isSetCounted,
  type CalcSettings,
} from '@/services/calculations';
import type {
  DetailedMuscle,
  ExerciseCategory,
  ExerciseMapping,
  PeriodFilter,
  Workout,
  WorkoutSet,
} from '@/types/workout';

const MONTH_SHORT = [
  'Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun',
  'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec',
];

const MONTH_LONG = [
  'January', 'February', 'March', 'April', 'May', 'June',
  'July', 'August', 'September', 'October', 'November', 'December',
];

export interface RankedExercise {
  exerciseTitle: string;
  timesPerformed: number;
  totalSets: number;
  totalVolumeKg: number;
  bestWeightKg: number | null;
  lowestAssistanceKg: number | null;
  best1RM: number | null;
  maxDurationSeconds: number | null;
  primaryMuscle: DetailedMuscle | null;
  category: ExerciseCategory;
  lastPerformedDateKey: string;
}

export function getMainExercisesRanking(
  workouts: Workout[],
  period: PeriodFilter,
  mappingsByTitle: Map<string, ExerciseMapping>,
  settings: CalcSettings,
  referenceDate?: Date,
): RankedExercise[] {
  const ref = referenceDate ?? getReferenceDate(workouts);
  const bounds = getPeriodBounds(period, ref);

  const inScope =
    bounds.currentStartKey === null
      ? workouts
      : workouts.filter(
          (w) =>
            w.dateKey >= bounds.currentStartKey! && w.dateKey <= bounds.currentEndKey,
        );

  const accMap = new Map<
    string,
    {
      workoutIds: Set<string>;
      totalSets: number;
      totalVolumeKg: number;
      bestWeightKg: number | null;
      lowestAssistanceKg: number | null;
      best1RM: number | null;
      maxDurationSeconds: number | null;
      lastPerformedDateKey: string;
    }
  >();

  for (const w of inScope) {
    for (const s of w.sets) {
      if (!isSetCounted(s, settings)) continue;

      const mapping = mappingsByTitle.get(s.exerciseTitle);
      const assisted = isAssistedExercise(s.exerciseTitle, mapping);
      let entry = accMap.get(s.exerciseTitle);
      if (!entry) {
        entry = {
          workoutIds: new Set(),
          totalSets: 0,
          totalVolumeKg: 0,
          bestWeightKg: null,
          lowestAssistanceKg: null,
          best1RM: null,
          maxDurationSeconds: null,
          lastPerformedDateKey: w.dateKey,
        };
        accMap.set(s.exerciseTitle, entry);
      }

      entry.workoutIds.add(w.id);
      entry.totalSets += 1;
      entry.totalVolumeKg += calculateSetVolumeKg(s, mapping, settings);
      if (w.dateKey > entry.lastPerformedDateKey) {
        entry.lastPerformedDateKey = w.dateKey;
      }

      if (s.weightKg !== null && s.weightKg > 0) {
        if (assisted) {
          if (entry.lowestAssistanceKg === null || s.weightKg < entry.lowestAssistanceKg) {
            entry.lowestAssistanceKg = s.weightKg;
          }
        } else {
          if (entry.bestWeightKg === null || s.weightKg > entry.bestWeightKg) {
            entry.bestWeightKg = s.weightKg;
          }
        }
      }

      const est1rm = calculateEstimated1RM(s.weightKg, s.reps, assisted);
      if (est1rm !== null && (entry.best1RM === null || est1rm > entry.best1RM)) {
        entry.best1RM = est1rm;
      }

      if (
        s.durationSeconds !== null &&
        s.durationSeconds > 0 &&
        (entry.maxDurationSeconds === null || s.durationSeconds > entry.maxDurationSeconds)
      ) {
        entry.maxDurationSeconds = s.durationSeconds;
      }
    }
  }

  const ranked: RankedExercise[] = [];
  for (const [exerciseTitle, entry] of accMap.entries()) {
    const mapping = mappingsByTitle.get(exerciseTitle);
    const category: ExerciseCategory =
      mapping?.category ??
      (isAssistedExercise(exerciseTitle) ? 'assisted' : 'weighted');

    ranked.push({
      exerciseTitle,
      timesPerformed: entry.workoutIds.size,
      totalSets: entry.totalSets,
      totalVolumeKg: Math.round(entry.totalVolumeKg),
      bestWeightKg: entry.bestWeightKg,
      lowestAssistanceKg: entry.lowestAssistanceKg,
      best1RM: entry.best1RM,
      maxDurationSeconds: entry.maxDurationSeconds,
      primaryMuscle: mapping?.primaryMuscle ?? null,
      category,
      lastPerformedDateKey: entry.lastPerformedDateKey,
    });
  }

  ranked.sort((a, b) => {
    if (b.timesPerformed !== a.timesPerformed) return b.timesPerformed - a.timesPerformed;
    if (b.totalSets !== a.totalSets) return b.totalSets - a.totalSets;
    return a.exerciseTitle.localeCompare(b.exerciseTitle);
  });

  return ranked;
}

export interface ExerciseSessionPoint {
  workoutId: string;
  workoutTitle: string;
  dateKey: string;
  label: string;
  startTime: number;
  allSets: WorkoutSet[];
  countedSetCount: number;
  maxWeightKg: number | null;
  minAssistanceKg: number | null;
  sessionVolumeKg: number;
  bestEstimated1RM: number | null;
  avgRpe: number | null;
  maxReps: number | null;
  totalDurationSeconds: number;
}

export interface ExerciseDetailStats {
  exerciseTitle: string;
  category: ExerciseCategory;
  primaryMuscle: DetailedMuscle | null;
  secondaryMuscles: DetailedMuscle[];
  isAssisted: boolean;
  sessionsChronological: ExerciseSessionPoint[];
  sessionsNewestFirst: ExerciseSessionPoint[];
  prMaxWeightKg: number | null;
  prLowestAssistanceKg: number | null;
  prBest1RM: number | null;
  prBestVolumeKg: number;
  prMaxReps: number | null;
  prMaxDurationSeconds: number | null;
  overallAvgRpe: number | null;
  totalSessions: number;
  totalCountedSets: number;
}

export function getExerciseDetailHistory(
  workouts: Workout[],
  exerciseTitle: string,
  mapping: ExerciseMapping | undefined,
  settings: CalcSettings,
  period: PeriodFilter = 'all',
  referenceDate?: Date,
): ExerciseDetailStats {
  const ref = referenceDate ?? getReferenceDate(workouts);
  const bounds = getPeriodBounds(period, ref);
  const assisted = isAssistedExercise(exerciseTitle, mapping);
  const category: ExerciseCategory =
    mapping?.category ?? (assisted ? 'assisted' : 'weighted');

  const inScope =
    bounds.currentStartKey === null
      ? workouts
      : workouts.filter(
          (w) =>
            w.dateKey >= bounds.currentStartKey! && w.dateKey <= bounds.currentEndKey,
        );

  const chronologicalWorkouts = [...inScope].sort((a, b) => a.startTime - b.startTime);

  const sessionsChronological: ExerciseSessionPoint[] = [];
  let prMaxWeightKg: number | null = null;
  let prLowestAssistanceKg: number | null = null;
  let prBest1RM: number | null = null;
  let prBestVolumeKg = 0;
  let prMaxReps: number | null = null;
  let prMaxDurationSeconds: number | null = null;
  let rpeSumTotal = 0;
  let rpeCountTotal = 0;
  let totalCountedSets = 0;

  for (const w of chronologicalWorkouts) {
    const matchingSets = w.sets.filter((s) => s.exerciseTitle === exerciseTitle);
    if (matchingSets.length === 0) continue;

    const counted = matchingSets.filter((s) => isSetCounted(s, settings));
    if (counted.length === 0) continue;

    let maxWeightKg: number | null = null;
    let minAssistanceKg: number | null = null;
    let sessionVolumeKg = 0;
    let bestEstimated1RM: number | null = null;
    let rpeSum = 0;
    let rpeCount = 0;
    let maxReps: number | null = null;
    let totalDurationSeconds = 0;

    for (const s of counted) {
      totalCountedSets += 1;
      sessionVolumeKg += calculateSetVolumeKg(s, mapping, settings);

      if (s.weightKg !== null && s.weightKg > 0) {
        if (assisted) {
          if (minAssistanceKg === null || s.weightKg < minAssistanceKg) {
            minAssistanceKg = s.weightKg;
          }
        } else {
          if (maxWeightKg === null || s.weightKg > maxWeightKg) {
            maxWeightKg = s.weightKg;
          }
        }
      }

      const est1rm = calculateEstimated1RM(s.weightKg, s.reps, assisted);
      if (est1rm !== null && (bestEstimated1RM === null || est1rm > bestEstimated1RM)) {
        bestEstimated1RM = est1rm;
      }

      if (s.rpe !== null) {
        rpeSum += s.rpe;
        rpeCount += 1;
        rpeSumTotal += s.rpe;
        rpeCountTotal += 1;
      }

      if (s.reps !== null && (maxReps === null || s.reps > maxReps)) {
        maxReps = s.reps;
      }

      if (s.durationSeconds !== null && s.durationSeconds > 0) {
        totalDurationSeconds += s.durationSeconds;
        if (prMaxDurationSeconds === null || s.durationSeconds > prMaxDurationSeconds) {
          prMaxDurationSeconds = s.durationSeconds;
        }
      }
    }

    sessionVolumeKg = Math.round(sessionVolumeKg);
    const avgRpe = rpeCount > 0 ? Math.round((rpeSum / rpeCount) * 10) / 10 : null;

    if (maxWeightKg !== null && (prMaxWeightKg === null || maxWeightKg > prMaxWeightKg)) {
      prMaxWeightKg = maxWeightKg;
    }
    if (
      minAssistanceKg !== null &&
      (prLowestAssistanceKg === null || minAssistanceKg < prLowestAssistanceKg)
    ) {
      prLowestAssistanceKg = minAssistanceKg;
    }
    if (bestEstimated1RM !== null && (prBest1RM === null || bestEstimated1RM > prBest1RM)) {
      prBest1RM = bestEstimated1RM;
    }
    if (sessionVolumeKg > prBestVolumeKg) {
      prBestVolumeKg = sessionVolumeKg;
    }
    if (maxReps !== null && (prMaxReps === null || maxReps > prMaxReps)) {
      prMaxReps = maxReps;
    }

    const d = parseDateKey(w.dateKey);
    const label = `${d.getDate()} ${MONTH_SHORT[d.getMonth()]} ${String(d.getFullYear()).slice(2)}`;

    sessionsChronological.push({
      workoutId: w.id,
      workoutTitle: w.title,
      dateKey: w.dateKey,
      label,
      startTime: w.startTime,
      allSets: matchingSets,
      countedSetCount: counted.length,
      maxWeightKg,
      minAssistanceKg,
      sessionVolumeKg,
      bestEstimated1RM,
      avgRpe,
      maxReps,
      totalDurationSeconds,
    });
  }

  return {
    exerciseTitle,
    category,
    primaryMuscle: mapping?.primaryMuscle ?? null,
    secondaryMuscles: mapping?.secondaryMuscles ?? [],
    isAssisted: assisted,
    sessionsChronological,
    sessionsNewestFirst: [...sessionsChronological].reverse(),
    prMaxWeightKg,
    prLowestAssistanceKg,
    prBest1RM,
    prBestVolumeKg,
    prMaxReps,
    prMaxDurationSeconds,
    overallAvgRpe:
      rpeCountTotal > 0 ? Math.round((rpeSumTotal / rpeCountTotal) * 10) / 10 : null,
    totalSessions: sessionsChronological.length,
    totalCountedSets,
  };
}

// ============================================================
// CONSISTENCY CALENDAR ANALYTICS
// ============================================================

export interface StreakStats {
  weekStreak: number;
  restDays: number;
  longestWeekStreak: number;
}

export function calculateStreakAndRestDays(
  workouts: Workout[],
  weekStartsOn: 0 | 1 = 1,
  referenceDate?: Date,
): StreakStats {
  if (workouts.length === 0) {
    return { weekStreak: 0, restDays: 0, longestWeekStreak: 0 };
  }

  const ref = referenceDate ?? getReferenceDate(workouts);
  const weekKeys = new Set<string>();
  let latestDateKey = workouts[0].dateKey;

  for (const w of workouts) {
    if (w.dateKey > latestDateKey) latestDateKey = w.dateKey;
    const wkStart = getStartOfWeek(parseDateKey(w.dateKey), weekStartsOn);
    weekKeys.add(toDateKey(wkStart));
  }

  // Rest days since latest workout
  const latestDate = parseDateKey(latestDateKey);
  const diffDays = Math.round(
    (ref.getTime() - latestDate.getTime()) / (24 * 60 * 60 * 1000),
  );
  const restDays = Math.max(0, diffDays);

  // Current weekly streak: start at current week if trained, else previous week
  const currentWeekStart = getStartOfWeek(ref, weekStartsOn);
  let cursor = currentWeekStart;
  if (!weekKeys.has(toDateKey(cursor))) {
    cursor = addDays(cursor, -7);
  }

  let weekStreak = 0;
  while (weekKeys.has(toDateKey(cursor))) {
    weekStreak++;
    cursor = addDays(cursor, -7);
  }

  // Longest weekly streak across all history
  const sortedWeeks = [...weekKeys].sort();
  let longestWeekStreak = 0;
  let running = 0;
  let prevWeekDate: Date | null = null;

  for (const wkKey of sortedWeeks) {
    const wkDate = parseDateKey(wkKey);
    if (
      prevWeekDate &&
      Math.round((wkDate.getTime() - prevWeekDate.getTime()) / (24 * 60 * 60 * 1000)) === 7
    ) {
      running++;
    } else {
      running = 1;
    }
    if (running > longestWeekStreak) longestWeekStreak = running;
    prevWeekDate = wkDate;
  }

  return { weekStreak, restDays, longestWeekStreak };
}

export interface MonthDayCell {
  dateKey: string;
  dayNumber: number;
  workouts: Workout[];
  isToday: boolean;
}

export interface MonthCalendarBlock {
  year: number;
  monthIndex: number; // 0-11
  monthKey: string; // YYYY-MM
  label: string; // e.g. "November 2026"
  shortLabel: string; // e.g. "Nov"
  leadingEmptySlots: number;
  days: MonthDayCell[];
  workoutCount: number;
}

export function groupWorkoutsByDate(workouts: Workout[]): Map<string, Workout[]> {
  const map = new Map<string, Workout[]>();
  for (const w of workouts) {
    const list = map.get(w.dateKey) ?? [];
    list.push(w);
    map.set(w.dateKey, list);
  }
  return map;
}

export function buildMonthBlock(
  year: number,
  monthIndex: number,
  workoutsByDate: Map<string, Workout[]>,
  todayKey: string,
  weekStartsOn: 0 | 1 = 1,
): MonthCalendarBlock {
  const firstDay = new Date(year, monthIndex, 1, 12, 0, 0, 0);
  const daysInMonth = new Date(year, monthIndex + 1, 0, 12, 0, 0, 0).getDate();
  const leadingEmptySlots = (firstDay.getDay() - weekStartsOn + 7) % 7;

  const days: MonthDayCell[] = [];
  let workoutCount = 0;

  for (let day = 1; day <= daysInMonth; day++) {
    const d = new Date(year, monthIndex, day, 12, 0, 0, 0);
    const dateKey = toDateKey(d);
    const dayWorkouts = workoutsByDate.get(dateKey) ?? [];
    workoutCount += dayWorkouts.length;
    days.push({
      dateKey,
      dayNumber: day,
      workouts: dayWorkouts,
      isToday: dateKey === todayKey,
    });
  }

  const monthKey = `${year}-${String(monthIndex + 1).padStart(2, '0')}`;
  return {
    year,
    monthIndex,
    monthKey,
    label: `${MONTH_LONG[monthIndex]} ${year}`,
    shortLabel: MONTH_SHORT[monthIndex],
    leadingEmptySlots,
    days,
    workoutCount,
  };
}

/**
 * Builds continuous monthly calendar blocks from newest month down to oldest workout month.
 */
export function buildContinuousMonths(
  workouts: Workout[],
  weekStartsOn: 0 | 1 = 1,
  referenceDate?: Date,
): MonthCalendarBlock[] {
  const ref = referenceDate ?? getReferenceDate(workouts);
  const todayKey = toDateKey(ref);
  const byDate = groupWorkoutsByDate(workouts);

  let minYear = ref.getFullYear();
  let minMonth = ref.getMonth();
  let maxYear = ref.getFullYear();
  let maxMonth = ref.getMonth();

  for (const w of workouts) {
    const d = parseDateKey(w.dateKey);
    const y = d.getFullYear();
    const m = d.getMonth();
    if (y < minYear || (y === minYear && m < minMonth)) {
      minYear = y;
      minMonth = m;
    }
    if (y > maxYear || (y === maxYear && m > maxMonth)) {
      maxYear = y;
      maxMonth = m;
    }
  }

  const blocks: MonthCalendarBlock[] = [];
  let curY = maxYear;
  let curM = maxMonth;

  while (curY > minYear || (curY === minYear && curM >= minMonth)) {
    blocks.push(buildMonthBlock(curY, curM, byDate, todayKey, weekStartsOn));
    curM--;
    if (curM < 0) {
      curM = 11;
      curY--;
    }
  }

  return blocks;
}

export function buildYearMiniCalendars(
  year: number,
  workouts: Workout[],
  weekStartsOn: 0 | 1 = 1,
  referenceDate?: Date,
): MonthCalendarBlock[] {
  const ref = referenceDate ?? getReferenceDate(workouts);
  const todayKey = toDateKey(ref);
  const byDate = groupWorkoutsByDate(workouts);
  const months: MonthCalendarBlock[] = [];
  for (let m = 0; m < 12; m++) {
    months.push(buildMonthBlock(year, m, byDate, todayKey, weekStartsOn));
  }
  return months;
}

export interface HeatmapCell {
  dateKey: string;
  inYear: boolean;
  workoutCount: number;
  setCount: number;
  workouts: Workout[];
}

export interface MultiYearHeatmapRow {
  year: number;
  totalWorkouts: number;
  /** columns[weekIdx][rowIdx (0=Mon..6=Sun)] */
  weeks: HeatmapCell[][];
  monthLabels: Array<{ label: string; weekIndex: number }>;
}

/**
 * Builds GitHub-style continuous heatmap grids stacked by year (newest year first).
 */
export function buildMultiYearHeatmaps(
  workouts: Workout[],
  weekStartsOn: 0 | 1 = 1,
): MultiYearHeatmapRow[] {
  if (workouts.length === 0) return [];

  const byDate = groupWorkoutsByDate(workouts);
  const yearsSet = new Set<number>();
  for (const w of workouts) yearsSet.add(w.year);
  const years = [...yearsSet].sort((a, b) => b - a);

  return years.map((year) => {
    const jan1 = new Date(year, 0, 1, 12, 0, 0, 0);
    const dec31 = new Date(year, 11, 31, 12, 0, 0, 0);
    const gridStart = getStartOfWeek(jan1, weekStartsOn);

    const weeks: HeatmapCell[][] = [];
    const monthLabels: Array<{ label: string; weekIndex: number }> = [];
    const seenMonths = new Set<number>();
    let totalWorkouts = 0;

    let cursor = gridStart;
    let weekIndex = 0;
    while (cursor.getTime() <= dec31.getTime()) {
      const col: HeatmapCell[] = [];
      for (let r = 0; r < 7; r++) {
        const d = addDays(cursor, r);
        const inYear = d.getFullYear() === year;
        const dateKey = toDateKey(d);
        const dayWorkouts = inYear ? (byDate.get(dateKey) ?? []) : [];
        if (inYear) {
          totalWorkouts += dayWorkouts.length;
          if (!seenMonths.has(d.getMonth()) && d.getDate() <= 7) {
            seenMonths.add(d.getMonth());
            monthLabels.push({ label: MONTH_SHORT[d.getMonth()], weekIndex });
          }
        }
        const setCount = dayWorkouts.reduce((acc, w) => acc + w.sets.length, 0);
        col.push({
          dateKey,
          inYear,
          workoutCount: dayWorkouts.length,
          setCount,
          workouts: dayWorkouts,
        });
      }
      weeks.push(col);
      cursor = addDays(cursor, 7);
      weekIndex++;
    }

    return { year, totalWorkouts, weeks, monthLabels };
  });
}

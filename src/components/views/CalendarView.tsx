import { useMemo, useState } from 'react';
import { ChevronLeft, ChevronRight, Flame, Moon } from 'lucide-react';
import { WorkoutDetailModal } from '@/components/calendar/WorkoutDetailModal';
import {
  buildContinuousMonths,
  buildMultiYearHeatmaps,
  buildYearMiniCalendars,
  calculateStreakAndRestDays,
} from '@/services/exerciseCalendarAnalytics';
import type { CalcSettings } from '@/services/calculations';
import type { ExerciseMapping, Workout } from '@/types/workout';

interface CalendarViewProps {
  workouts: Workout[];
  mappingsByTitle: Map<string, ExerciseMapping>;
  settings: CalcSettings & { weekStartsOn: 0 | 1 };
  onSelectExercise?: (exerciseTitle: string) => void;
}

type CalendarMode = 'month' | 'year' | 'multi-year';

const WEEKDAY_LABELS_MON = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];
const WEEKDAY_LABELS_SUN = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

export function CalendarView({
  workouts,
  mappingsByTitle,
  settings,
  onSelectExercise,
}: CalendarViewProps) {
  const [mode, setMode] = useState<CalendarMode>('month');
  const [modalDay, setModalDay] = useState<{ dateKey: string; workouts: Workout[] } | null>(
    null,
  );

  const availableYears = useMemo(() => {
    const years = new Set<number>();
    for (const w of workouts) years.add(w.year);
    const list = [...years].sort((a, b) => b - a);
    return list.length > 0 ? list : [new Date().getFullYear()];
  }, [workouts]);

  const [selectedYear, setSelectedYear] = useState<number>(availableYears[0]);
  const activeYear = availableYears.includes(selectedYear)
    ? selectedYear
    : availableYears[0];

  const streak = useMemo(
    () => calculateStreakAndRestDays(workouts, settings.weekStartsOn),
    [workouts, settings.weekStartsOn],
  );

  const continuousMonths = useMemo(
    () => buildContinuousMonths(workouts, settings.weekStartsOn),
    [workouts, settings.weekStartsOn],
  );

  const yearMonths = useMemo(
    () => buildYearMiniCalendars(activeYear, workouts, settings.weekStartsOn),
    [activeYear, workouts, settings.weekStartsOn],
  );

  const multiYearHeatmaps = useMemo(
    () => buildMultiYearHeatmaps(workouts, settings.weekStartsOn),
    [workouts, settings.weekStartsOn],
  );

  const weekdayLabels =
    settings.weekStartsOn === 1 ? WEEKDAY_LABELS_MON : WEEKDAY_LABELS_SUN;

  const activeYearIndex = availableYears.indexOf(activeYear);

  return (
    <div className="space-y-5">
      {/* Top Mode Switcher */}
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="inline-flex rounded-xl bg-heavy-surface border border-heavy-border p-1 gap-1">
          {(
            [
              { id: 'month', label: 'Month' },
              { id: 'year', label: 'Year' },
              { id: 'multi-year', label: 'Multi-year' },
            ] as const
          ).map((tab) => (
            <button
              key={tab.id}
              type="button"
              onClick={() => setMode(tab.id)}
              className={`px-4 py-1.5 rounded-lg text-xs font-medium transition cursor-pointer ${
                mode === tab.id
                  ? 'bg-heavy-blue text-white shadow-sm'
                  : 'text-heavy-muted hover:text-white'
              }`}
            >
              {tab.label}
            </button>
          ))}
        </div>

        <span className="text-xs text-heavy-muted">
          Best streak: <strong className="text-white">{streak.longestWeekStreak}w</strong>
        </span>
      </div>

      {/* Streak & Rest Days Banner */}
      <section className="grid grid-cols-2 gap-3">
        <div className="rounded-2xl border border-heavy-border bg-heavy-surface px-4 py-3.5 flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-orange-500/15 text-orange-400 flex items-center justify-center shrink-0">
            <Flame className="w-5 h-5" />
          </div>
          <div>
            <p className="text-base sm:text-lg font-bold text-white leading-tight">
              {streak.weekStreak} week streak
            </p>
            <p className="text-xs text-heavy-muted">Consecutive active weeks</p>
          </div>
        </div>

        <div className="rounded-2xl border border-heavy-border bg-heavy-surface px-4 py-3.5 flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-indigo-500/15 text-indigo-300 flex items-center justify-center shrink-0">
            <Moon className="w-5 h-5" />
          </div>
          <div>
            <p className="text-base sm:text-lg font-bold text-white leading-tight">
              {streak.restDays} rest {streak.restDays === 1 ? 'day' : 'days'}
            </p>
            <p className="text-xs text-heavy-muted">Since last workout</p>
          </div>
        </div>
      </section>

      {/* =================== MODE 1: MONTH (CONTINUOUS) =================== */}
      {mode === 'month' && (
        <section className="rounded-2xl border border-heavy-border bg-heavy-surface overflow-hidden">
          {/* Sticky Mon-Sun Header */}
          <div className="sticky top-14 md:top-16 z-10 grid grid-cols-7 bg-heavy-surface-elevated/95 backdrop-blur border-b border-heavy-border px-3 sm:px-5 py-2.5 text-center">
            {weekdayLabels.map((wd) => (
              <span
                key={wd}
                className="text-[11px] font-semibold uppercase tracking-wider text-heavy-muted"
              >
                {wd}
              </span>
            ))}
          </div>

          <div className="divide-y divide-heavy-border/60">
            {continuousMonths.map((month) => (
              <div key={month.monthKey} className="px-3 sm:px-5 py-5">
                <div className="flex items-center justify-between mb-3.5 px-1">
                  <h3 className="text-sm font-semibold text-white">{month.label}</h3>
                  <span className="text-xs text-heavy-muted">
                    {month.workoutCount}{' '}
                    {month.workoutCount === 1 ? 'workout' : 'workouts'}
                  </span>
                </div>

                <div className="grid grid-cols-7 gap-y-3 gap-x-1">
                  {Array.from({ length: month.leadingEmptySlots }).map((_, i) => (
                    <div key={`empty-${month.monthKey}-${i}`} />
                  ))}

                  {month.days.map((cell) => {
                    const trained = cell.workouts.length > 0;
                    const primaryTitle = cell.workouts[0]?.title ?? '';
                    const extraCount = cell.workouts.length - 1;

                    return (
                      <button
                        key={cell.dateKey}
                        type="button"
                        disabled={!trained}
                        onClick={() =>
                          trained &&
                          setModalDay({
                            dateKey: cell.dateKey,
                            workouts: cell.workouts,
                          })
                        }
                        className={`flex flex-col items-center gap-1 py-0.5 rounded-xl transition ${
                          trained
                            ? 'cursor-pointer hover:bg-heavy-surface-elevated/70'
                            : 'cursor-default'
                        }`}
                        title={
                          trained
                            ? `${cell.dateKey}: ${cell.workouts.map((w) => w.title).join(', ')}`
                            : cell.dateKey
                        }
                      >
                        <span
                          className={`w-8 h-8 sm:w-9 sm:h-9 rounded-full flex items-center justify-center text-xs sm:text-sm font-semibold transition ${
                            trained
                              ? 'bg-heavy-blue text-white shadow-md shadow-heavy-blue/30'
                              : cell.isToday
                                ? 'border border-heavy-blue/70 text-heavy-blue-bright'
                                : 'text-heavy-muted'
                          }`}
                        >
                          {cell.dayNumber}
                        </span>
                        <span className="text-[10px] leading-tight text-heavy-text truncate max-w-[54px] sm:max-w-[78px] min-h-[13px] px-0.5">
                          {trained
                            ? extraCount > 0
                              ? `${primaryTitle} +${extraCount}`
                              : primaryTitle
                            : ''}
                        </span>
                      </button>
                    );
                  })}
                </div>
              </div>
            ))}
          </div>
        </section>
      )}

      {/* =================== MODE 2: YEAR (12 MINI-CALENDARS) =================== */}
      {mode === 'year' && (
        <section className="rounded-2xl border border-heavy-border bg-heavy-surface p-5 space-y-5">
          {/* Year Switcher */}
          <div className="flex items-center justify-between">
            <button
              type="button"
              disabled={activeYearIndex >= availableYears.length - 1}
              onClick={() =>
                setSelectedYear(availableYears[activeYearIndex + 1] ?? activeYear)
              }
              className="p-2 rounded-xl bg-heavy-surface-elevated hover:bg-heavy-border text-white transition cursor-pointer disabled:opacity-35 disabled:cursor-not-allowed"
              aria-label="Previous year"
            >
              <ChevronLeft className="w-4 h-4" />
            </button>

            <div className="text-center">
              <h3 className="text-base font-bold text-white">{activeYear}</h3>
              <p className="text-xs text-heavy-muted">
                {yearMonths.reduce((s, m) => s + m.workoutCount, 0)} workouts
              </p>
            </div>

            <button
              type="button"
              disabled={activeYearIndex <= 0}
              onClick={() =>
                setSelectedYear(availableYears[activeYearIndex - 1] ?? activeYear)
              }
              className="p-2 rounded-xl bg-heavy-surface-elevated hover:bg-heavy-border text-white transition cursor-pointer disabled:opacity-35 disabled:cursor-not-allowed"
              aria-label="Next year"
            >
              <ChevronRight className="w-4 h-4" />
            </button>
          </div>

          {/* 3-Column Grid of 12 Mini-Calendars */}
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-4 md:gap-5">
            {yearMonths.map((month) => (
              <div
                key={month.monthKey}
                className="rounded-xl bg-heavy-bg/60 border border-heavy-border/70 p-3"
              >
                <div className="flex items-center justify-between mb-2">
                  <span className="text-xs font-semibold text-white">
                    {month.shortLabel}
                  </span>
                  <span className="text-[10px] font-mono text-heavy-subtle">
                    {month.workoutCount > 0 ? `${month.workoutCount}w` : ''}
                  </span>
                </div>

                <div className="grid grid-cols-7 gap-1">
                  {Array.from({ length: month.leadingEmptySlots }).map((_, i) => (
                    <div key={`pad-${month.monthKey}-${i}`} className="aspect-square" />
                  ))}
                  {month.days.map((day) => {
                    const trained = day.workouts.length > 0;
                    return (
                      <button
                        key={day.dateKey}
                        type="button"
                        disabled={!trained}
                        onClick={() =>
                          trained &&
                          setModalDay({
                            dateKey: day.dateKey,
                            workouts: day.workouts,
                          })
                        }
                        title={
                          trained
                            ? `${day.dateKey}: ${day.workouts.map((w) => w.title).join(', ')}`
                            : day.dateKey
                        }
                        className={`aspect-square rounded-[3px] transition ${
                          trained
                            ? day.workouts.length > 1
                              ? 'bg-heavy-blue-bright cursor-pointer hover:ring-1 hover:ring-white'
                              : 'bg-heavy-blue cursor-pointer hover:ring-1 hover:ring-white'
                            : 'bg-[#1D232E] cursor-default'
                        }`}
                      />
                    );
                  })}
                </div>
              </div>
            ))}
          </div>
        </section>
      )}

      {/* =================== MODE 3: MULTI-YEAR (GITHUB HEATMAP) =================== */}
      {mode === 'multi-year' && (
        <div className="space-y-4">
          {multiYearHeatmaps.map((row) => (
            <section
              key={row.year}
              className="rounded-2xl border border-heavy-border bg-heavy-surface p-5 space-y-3"
            >
              <div className="flex items-center justify-between">
                <h3 className="text-sm font-bold text-white">{row.year}</h3>
                <span className="text-xs text-heavy-muted">
                  {row.totalWorkouts} {row.totalWorkouts === 1 ? 'workout' : 'workouts'}
                </span>
              </div>

              <div className="overflow-x-auto pb-1">
                <div className="inline-block min-w-full">
                  {/* Month Labels Row */}
                  <div
                    className="grid gap-[3px] mb-1.5 text-[10px] text-heavy-muted"
                    style={{
                      gridTemplateColumns: `repeat(${row.weeks.length}, minmax(10px, 1fr))`,
                    }}
                  >
                    {row.weeks.map((_, wIdx) => {
                      const labelObj = row.monthLabels.find((m) => m.weekIndex === wIdx);
                      return (
                        <span key={wIdx} className="truncate leading-none">
                          {labelObj ? labelObj.label : ''}
                        </span>
                      );
                    })}
                  </div>

                  {/* 7-row Heatmap Grid */}
                  <div
                    className="grid gap-[3px]"
                    style={{
                      gridTemplateColumns: `repeat(${row.weeks.length}, minmax(10px, 1fr))`,
                    }}
                  >
                    {row.weeks.map((col, wIdx) => (
                      <div key={wIdx} className="grid grid-rows-7 gap-[3px]">
                        {col.map((cell) => {
                          if (!cell.inYear) {
                            return (
                              <div
                                key={cell.dateKey}
                                className="aspect-square rounded-[2px] bg-transparent"
                              />
                            );
                          }
                          const trained = cell.workoutCount > 0;
                          const colorClass = !trained
                            ? 'bg-[#1D232E]'
                            : cell.workoutCount > 1 || cell.setCount >= 22
                              ? 'bg-heavy-blue-bright'
                              : cell.setCount >= 14
                                ? 'bg-heavy-blue'
                                : 'bg-[#1E56B3]';

                          return (
                            <button
                              key={cell.dateKey}
                              type="button"
                              disabled={!trained}
                              onClick={() =>
                                trained &&
                                setModalDay({
                                  dateKey: cell.dateKey,
                                  workouts: cell.workouts,
                                })
                              }
                              title={
                                trained
                                  ? `${cell.dateKey}: ${cell.workouts.map((w) => w.title).join(', ')} (${cell.setCount} sets)`
                                  : `${cell.dateKey}: Rest day`
                              }
                              className={`aspect-square rounded-[2px] transition ${colorClass} ${
                                trained
                                  ? 'cursor-pointer hover:ring-1 hover:ring-white'
                                  : 'cursor-default'
                              }`}
                            />
                          );
                        })}
                      </div>
                    ))}
                  </div>
                </div>
              </div>

              <div className="flex items-center justify-end gap-1.5 text-[10px] text-heavy-subtle">
                <span>Rest</span>
                <span className="w-2.5 h-2.5 rounded-[2px] bg-[#1D232E]" />
                <span className="w-2.5 h-2.5 rounded-[2px] bg-[#1E56B3]" />
                <span className="w-2.5 h-2.5 rounded-[2px] bg-heavy-blue" />
                <span className="w-2.5 h-2.5 rounded-[2px] bg-heavy-blue-bright" />
                <span>High volume</span>
              </div>
            </section>
          ))}
        </div>
      )}

      <WorkoutDetailModal
        dateKey={modalDay?.dateKey ?? null}
        workouts={modalDay?.workouts ?? []}
        mappingsByTitle={mappingsByTitle}
        settings={settings}
        onClose={() => setModalDay(null)}
        onSelectExercise={onSelectExercise}
      />
    </div>
  );
}

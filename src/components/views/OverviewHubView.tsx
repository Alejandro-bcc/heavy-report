import { useMemo } from 'react';
import {
  BarChart3,
  CalendarDays,
  ChevronRight,
  Dumbbell,
  PersonStanding,
} from 'lucide-react';
import { AnatomicalBodyMap } from '@/components/body/AnatomicalBodyMap';
import {
  computePeriodComparison,
  formatFractionalSets,
  getLast7DaysData,
  getSortedMusclesBySets,
} from '@/services/analytics';
import {
  accumulateMuscleSets,
  formatDuration,
  formatVolume,
  type CalcSettings,
} from '@/services/calculations';
import type { AppTab, ExerciseMapping, Workout } from '@/types/workout';

interface OverviewHubViewProps {
  workouts: Workout[];
  mappingsByTitle: Map<string, ExerciseMapping>;
  settings: CalcSettings;
  onNavigate: (tab: AppTab) => void;
}

export function OverviewHubView({
  workouts,
  mappingsByTitle,
  settings,
  onNavigate,
}: OverviewHubViewProps) {
  const last7 = useMemo(() => {
    const data = getLast7DaysData(workouts);
    const muscles = accumulateMuscleSets(
      data.workoutsInWindow,
      mappingsByTitle,
      settings,
    );
    const topMuscles = getSortedMusclesBySets(muscles.detailed)
      .filter((m) => m.sets > 0)
      .slice(0, 6);
    return { ...data, muscles, topMuscles };
  }, [workouts, mappingsByTitle, settings]);

  const last30 = useMemo(
    () => computePeriodComparison(workouts, '30d', mappingsByTitle, settings),
    [workouts, mappingsByTitle, settings],
  );

  const reportLinks: Array<{
    tab: AppTab;
    title: string;
    subtitle: string;
    icon: typeof BarChart3;
    badge?: string;
  }> = [
    {
      tab: 'distribution',
      title: 'Muscle Distribution',
      subtitle: 'Hexagon radar comparing current vs previous period + 4 KPIs',
      icon: BarChart3,
    },
    {
      tab: 'body',
      title: 'Body Distribution',
      subtitle: 'Weekly anatomical map, 16-muscle table & progression chart',
      icon: PersonStanding,
    },
    {
      tab: 'exercises',
      title: 'Main Exercises',
      subtitle: 'Most performed exercises, 1RM, max weight, volume & RPE',
      icon: Dumbbell,
    },
    {
      tab: 'calendar',
      title: 'Consistency Calendar',
      subtitle: 'Month streaks, Year mini-calendars & Multi-year heatmap',
      icon: CalendarDays,
    },
  ];

  return (
    <div className="space-y-6">
      {/* Last 7 Days Body Graph Card */}
      <section className="rounded-2xl border border-heavy-border bg-heavy-surface p-5 md:p-6">
        <div className="flex items-center justify-between gap-3 mb-4">
          <div>
            <h2 className="text-base font-semibold text-white">Last 7 days</h2>
            <p className="text-xs text-heavy-muted mt-0.5">
              {last7.workoutsInWindow.length}{' '}
              {last7.workoutsInWindow.length === 1 ? 'workout' : 'workouts'} ·{' '}
              {formatFractionalSets(last7.muscles.totalWeightedSets)} weighted muscle sets
            </p>
          </div>
          <button
            type="button"
            onClick={() => onNavigate('body')}
            className="inline-flex items-center gap-1 text-xs font-medium text-heavy-blue hover:text-heavy-blue-bright transition cursor-pointer"
          >
            Full body map
            <ChevronRight className="w-4 h-4" />
          </button>
        </div>

        {/* 7-day strip */}
        <div className="grid grid-cols-7 gap-1.5 sm:gap-2 mb-6">
          {last7.days.map((day) => (
            <div
              key={day.dateKey}
              title={
                day.hasWorkout
                  ? `${day.dateKey}: ${day.titles.join(', ')}`
                  : `${day.dateKey}: Rest day`
              }
              className="flex flex-col items-center gap-1.5"
            >
              <span className="text-[11px] font-medium text-heavy-muted">
                {day.dayShort}
              </span>
              <div
                className={`w-9 h-9 sm:w-10 sm:h-10 rounded-full flex items-center justify-center text-xs sm:text-sm font-semibold transition ${
                  day.hasWorkout
                    ? 'bg-heavy-blue text-white shadow-md shadow-heavy-blue/35 ring-2 ring-heavy-blue/30'
                    : 'bg-heavy-surface-elevated text-heavy-subtle border border-heavy-border'
                }`}
              >
                {day.dayNumber}
              </div>
              <span className="text-[10px] text-heavy-muted truncate max-w-full min-h-[14px]">
                {day.titles[0] ?? ''}
              </span>
            </div>
          ))}
        </div>

        {/* Body Silhouette + Top Worked Muscles */}
        <div className="grid grid-cols-1 md:grid-cols-12 gap-5 items-center">
          <div className="md:col-span-6 flex justify-center">
            <AnatomicalBodyMap
              muscleSets={last7.muscles.detailed}
              onSelectMuscle={() => onNavigate('body')}
              compact
            />
          </div>

          <div className="md:col-span-6 space-y-3">
            <p className="text-xs font-medium text-heavy-muted uppercase tracking-wider">
              Muscles worked (7d)
            </p>
            {last7.topMuscles.length === 0 ? (
              <p className="text-sm text-heavy-subtle">
                No workouts logged in the last 7 days.
              </p>
            ) : (
              <div className="space-y-2">
                {last7.topMuscles.map(({ muscle, sets }) => {
                  const pct = Math.min(
                    100,
                    (sets / (last7.topMuscles[0]?.sets || 1)) * 100,
                  );
                  return (
                    <button
                      key={muscle}
                      type="button"
                      onClick={() => onNavigate('body')}
                      className="w-full text-left group cursor-pointer"
                    >
                      <div className="flex items-center justify-between text-xs mb-1">
                        <span className="text-heavy-text group-hover:text-white font-medium">
                          {muscle}
                        </span>
                        <span className="font-mono text-heavy-blue-bright">
                          {formatFractionalSets(sets)} sets
                        </span>
                      </div>
                      <div className="h-1.5 rounded-full bg-heavy-surface-elevated overflow-hidden">
                        <div
                          className="h-full rounded-full bg-gradient-to-r from-heavy-blue-dim to-heavy-blue-bright"
                          style={{ width: `${pct}%` }}
                        />
                      </div>
                    </button>
                  );
                })}
              </div>
            )}
          </div>
        </div>
      </section>

      {/* 30-day Quick KPI Strip */}
      <section className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        <div className="rounded-2xl border border-heavy-border bg-heavy-surface p-4">
          <p className="text-xs text-heavy-muted">Workouts (30d)</p>
          <p className="text-xl font-bold text-white mt-1">
            {last30.currentKpis.workouts}
          </p>
        </div>
        <div className="rounded-2xl border border-heavy-border bg-heavy-surface p-4">
          <p className="text-xs text-heavy-muted">Duration (30d)</p>
          <p className="text-xl font-bold text-white mt-1">
            {formatDuration(last30.currentKpis.durationSeconds)}
          </p>
        </div>
        <div className="rounded-2xl border border-heavy-border bg-heavy-surface p-4">
          <p className="text-xs text-heavy-muted">Volume (30d)</p>
          <p className="text-xl font-bold text-white mt-1">
            {formatVolume(last30.currentKpis.volumeKg)}
          </p>
        </div>
        <div className="rounded-2xl border border-heavy-border bg-heavy-surface p-4">
          <p className="text-xs text-heavy-muted">Sets (30d)</p>
          <p className="text-xl font-bold text-white mt-1">
            {last30.currentKpis.sets}
          </p>
        </div>
      </section>

      {/* Report Shortcuts */}
      <section className="space-y-2.5">
        <h3 className="text-xs font-semibold text-heavy-muted uppercase tracking-wider px-1">
          Detailed Reports
        </h3>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
          {reportLinks.map((item) => {
            const Icon = item.icon;
            return (
              <button
                key={item.tab}
                type="button"
                onClick={() => onNavigate(item.tab)}
                className="flex items-center justify-between gap-3 rounded-2xl border border-heavy-border bg-heavy-surface hover:bg-heavy-surface-elevated hover:border-heavy-blue/40 p-4 text-left transition cursor-pointer group"
              >
                <div className="flex items-center gap-3.5 min-w-0">
                  <div className="w-10 h-10 rounded-xl bg-heavy-blue/15 text-heavy-blue flex items-center justify-center shrink-0">
                    <Icon className="w-5 h-5" />
                  </div>
                  <div className="min-w-0">
                    <div className="flex items-center gap-2">
                      <p className="text-sm font-semibold text-white truncate">
                        {item.title}
                      </p>
                      {item.badge && (
                        <span className="px-1.5 py-0.5 rounded text-[10px] font-medium bg-heavy-surface-elevated text-heavy-muted border border-heavy-border">
                          {item.badge}
                        </span>
                      )}
                    </div>
                    <p className="text-xs text-heavy-muted truncate mt-0.5">
                      {item.subtitle}
                    </p>
                  </div>
                </div>
                <ChevronRight className="w-4 h-4 text-heavy-subtle group-hover:text-heavy-blue shrink-0 transition" />
              </button>
            );
          })}
        </div>
      </section>
    </div>
  );
}

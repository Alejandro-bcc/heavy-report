import { useEffect, useMemo, useState } from 'react';
import type { EChartsOption } from 'echarts';
import {
  Activity,
  ArrowLeft,
  ChevronRight,
  Clock,
  Dumbbell,
  Flame,
  Gauge,
  Search,
  Trophy,
} from 'lucide-react';
import { EChart } from '@/components/charts/EChart';
import { DETAILED_MUSCLES } from '@/constants/muscles';
import {
  calculateEstimated1RM,
  formatVolume,
  type CalcSettings,
} from '@/services/calculations';
import {
  getExerciseDetailHistory,
  getMainExercisesRanking,
} from '@/services/exerciseCalendarAnalytics';
import type {
  DetailedMuscle,
  ExerciseCategory,
  ExerciseMapping,
  PeriodFilter,
  Workout,
} from '@/types/workout';

interface MainExercisesViewProps {
  workouts: Workout[];
  mappingsByTitle: Map<string, ExerciseMapping>;
  settings: CalcSettings;
  initialSelectedExercise?: string | null;
  onClearInitialExercise?: () => void;
}

const PERIOD_OPTIONS: Array<{ id: PeriodFilter; label: string }> = [
  { id: '30d', label: 'Last 30 days' },
  { id: '3m', label: 'Last 3 months' },
  { id: '1y', label: 'Last year' },
  { id: 'all', label: 'All time' },
];

type DetailMetric = 'primaryLoad' | 'volume' | 'oneRm' | 'rpe';

function getCategoryStyle(category: ExerciseCategory): {
  icon: typeof Dumbbell;
  label: string;
  colorClass: string;
} {
  switch (category) {
    case 'cardio':
      return { icon: Activity, label: 'Cardio', colorClass: 'text-emerald-400 bg-emerald-500/15' };
    case 'duration':
      return { icon: Clock, label: 'Isometric', colorClass: 'text-sky-400 bg-sky-500/15' };
    case 'bodyweight':
      return { icon: Flame, label: 'Bodyweight', colorClass: 'text-amber-400 bg-amber-500/15' };
    case 'assisted':
      return { icon: Gauge, label: 'Assisted', colorClass: 'text-purple-400 bg-purple-500/15' };
    default:
      return { icon: Dumbbell, label: 'Weighted', colorClass: 'text-heavy-blue bg-heavy-blue/15' };
  }
}

export function MainExercisesView({
  workouts,
  mappingsByTitle,
  settings,
  initialSelectedExercise = null,
  onClearInitialExercise,
}: MainExercisesViewProps) {
  const [period, setPeriod] = useState<PeriodFilter>('30d');
  const [search, setSearch] = useState('');
  const [muscleFilter, setMuscleFilter] = useState<DetailedMuscle | 'all'>('all');
  const [selectedExercise, setSelectedExercise] = useState<string | null>(
    initialSelectedExercise,
  );
  const [detailPeriod, setDetailPeriod] = useState<PeriodFilter>('all');
  const [detailMetric, setDetailMetric] = useState<DetailMetric>('primaryLoad');

  useEffect(() => {
    if (initialSelectedExercise) {
      setSelectedExercise(initialSelectedExercise);
      setDetailMetric('primaryLoad');
      onClearInitialExercise?.();
    }
  }, [initialSelectedExercise, onClearInitialExercise]);

  const rankedExercises = useMemo(
    () => getMainExercisesRanking(workouts, period, mappingsByTitle, settings),
    [workouts, period, mappingsByTitle, settings],
  );

  const filteredExercises = useMemo(() => {
    const q = search.trim().toLowerCase();
    return rankedExercises.filter((item) => {
      if (muscleFilter !== 'all' && item.primaryMuscle !== muscleFilter) return false;
      if (q && !item.exerciseTitle.toLowerCase().includes(q)) {
        const muscleName = item.primaryMuscle?.toLowerCase() ?? '';
        if (!muscleName.includes(q)) return false;
      }
      return true;
    });
  }, [rankedExercises, search, muscleFilter]);

  const detailStats = useMemo(() => {
    if (!selectedExercise) return null;
    return getExerciseDetailHistory(
      workouts,
      selectedExercise,
      mappingsByTitle.get(selectedExercise),
      settings,
      detailPeriod,
    );
  }, [selectedExercise, workouts, mappingsByTitle, settings, detailPeriod]);

  const detailChartOption = useMemo<EChartsOption | null>(() => {
    if (!detailStats || detailStats.sessionsChronological.length === 0) return null;

    const sessions = detailStats.sessionsChronological;
    const labels = sessions.map((s) => s.label);

    let seriesName = 'Max Weight (kg)';
    let unit = 'kg';
    let invertYAxis = false;

    const values: Array<number | null> = sessions.map((s) => {
      if (detailMetric === 'volume') {
        seriesName = 'Session Volume (kg)';
        unit = 'kg';
        return s.sessionVolumeKg;
      }
      if (detailMetric === 'oneRm') {
        seriesName = 'Estimated 1RM (kg)';
        unit = 'kg';
        return s.bestEstimated1RM;
      }
      if (detailMetric === 'rpe') {
        seriesName = 'Average RPE';
        unit = 'RPE';
        return s.avgRpe;
      }
      // primaryLoad adapts intelligently to exercise category
      if (detailStats.isAssisted) {
        seriesName = 'Lowest Assistance (kg · lower is harder)';
        unit = 'kg assist';
        invertYAxis = true;
        return s.minAssistanceKg;
      }
      if (detailStats.category === 'duration' || detailStats.category === 'cardio') {
        seriesName = 'Total Duration (sec)';
        unit = 's';
        return s.totalDurationSeconds > 0 ? s.totalDurationSeconds : null;
      }
      if (detailStats.category === 'bodyweight' && detailStats.prMaxWeightKg === null) {
        seriesName = 'Max Reps (best set)';
        unit = 'reps';
        return s.maxReps;
      }
      seriesName = 'Max Weight (kg)';
      unit = 'kg';
      return s.maxWeightKg;
    });

    const hasNumericPoint = values.some((v) => v !== null);
    if (!hasNumericPoint) return null;

    return {
      backgroundColor: 'transparent',
      grid: {
        top: 24,
        right: 18,
        bottom: 28,
        left: detailMetric === 'volume' ? 56 : 44,
      },
      tooltip: {
        trigger: 'axis',
        backgroundColor: '#14181F',
        borderColor: '#252C38',
        textStyle: { color: '#F4F6FA', fontSize: 12 },
        formatter: (params: unknown) => {
          const arr = Array.isArray(params) ? params : [params];
          const first = arr[0] as { dataIndex?: number; value?: number | null } | undefined;
          const idx = first?.dataIndex;
          if (idx === undefined) return '';
          const s = sessions[idx];
          const val = values[idx];
          const valText =
            val === null
              ? 'Not logged'
              : detailMetric === 'volume'
                ? formatVolume(val)
                : `${val} ${unit}`;
          return `
            <div style="font-weight:600;margin-bottom:4px;">${s.dateKey} · ${s.workoutTitle}</div>
            <div>${seriesName}: <strong>${valText}</strong></div>
            <div style="color:#8E98A8;margin-top:2px;">${s.countedSetCount} working sets${s.avgRpe !== null ? ` · Avg RPE ${s.avgRpe}` : ''}</div>
          `;
        },
      },
      xAxis: {
        type: 'category',
        data: labels,
        axisLine: { lineStyle: { color: '#252C38' } },
        axisLabel: { color: '#8E98A8', fontSize: 11 },
      },
      yAxis: {
        type: 'value',
        inverse: invertYAxis,
        min: detailMetric === 'rpe' ? 5 : undefined,
        max: detailMetric === 'rpe' ? 10 : undefined,
        scale: detailMetric !== 'volume',
        splitLine: { lineStyle: { color: '#1F2632' } },
        axisLabel: {
          color: '#8E98A8',
          fontSize: 11,
          formatter: (val: number) =>
            detailMetric === 'volume' && val >= 1000 ? `${val / 1000}k` : String(val),
        },
      },
      series: [
        {
          name: seriesName,
          type: 'line',
          smooth: 0.2,
          connectNulls: true,
          symbol: 'circle',
          symbolSize: 7,
          data: values,
          lineStyle: { color: '#2F80ED', width: 2.5 },
          itemStyle: { color: '#38BDF8', borderColor: '#2F80ED', borderWidth: 2 },
          areaStyle: {
            color: {
              type: 'linear',
              x: 0,
              y: 0,
              x2: 0,
              y2: 1,
              colorStops: [
                { offset: 0, color: 'rgba(47, 128, 237, 0.30)' },
                { offset: 1, color: 'rgba(47, 128, 237, 0.02)' },
              ],
            },
          },
        },
      ],
    };
  }, [detailStats, detailMetric]);

  // =================== EXERCISE DETAIL VIEW ===================
  if (selectedExercise && detailStats) {
    const cat = getCategoryStyle(detailStats.category);
    const CatIcon = cat.icon;
    const primaryLoadLabel = detailStats.isAssisted
      ? 'Assistance'
      : detailStats.category === 'duration' || detailStats.category === 'cardio'
        ? 'Duration'
        : detailStats.category === 'bodyweight' && detailStats.prMaxWeightKg === null
          ? 'Max Reps'
          : 'Max Weight';

    return (
      <div className="space-y-5">
        {/* Top Back Bar */}
        <div className="flex flex-wrap items-center justify-between gap-3">
          <button
            type="button"
            onClick={() => setSelectedExercise(null)}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-heavy-surface border border-heavy-border hover:border-heavy-blue/40 text-xs font-medium text-white transition cursor-pointer"
          >
            <ArrowLeft className="w-4 h-4" />
            Back to Main Exercises
          </button>

          <div className="inline-flex rounded-xl bg-heavy-surface border border-heavy-border p-1 gap-1">
            {PERIOD_OPTIONS.map((opt) => (
              <button
                key={opt.id}
                type="button"
                onClick={() => setDetailPeriod(opt.id)}
                className={`px-2.5 py-1 rounded-lg text-xs font-medium transition cursor-pointer ${
                  detailPeriod === opt.id
                    ? 'bg-heavy-blue text-white'
                    : 'text-heavy-muted hover:text-white'
                }`}
              >
                {opt.label.replace('Last ', '')}
              </button>
            ))}
          </div>
        </div>

        {/* Exercise Title & PR Summary */}
        <section className="rounded-2xl border border-heavy-border bg-heavy-surface p-5 space-y-4">
          <div className="flex items-start justify-between gap-3 flex-wrap">
            <div className="flex items-center gap-3">
              <div className={`w-11 h-11 rounded-xl flex items-center justify-center shrink-0 ${cat.colorClass}`}>
                <CatIcon className="w-5 h-5" />
              </div>
              <div>
                <h2 className="text-lg font-semibold text-white">
                  {detailStats.exerciseTitle}
                </h2>
                <p className="text-xs text-heavy-muted mt-0.5">
                  {detailStats.primaryMuscle ?? cat.label}
                  {detailStats.secondaryMuscles.length > 0 &&
                    ` · Secondary: ${detailStats.secondaryMuscles.join(', ')}`}
                  {' · '}
                  {detailStats.totalSessions}{' '}
                  {detailStats.totalSessions === 1 ? 'session' : 'sessions'}
                </p>
              </div>
            </div>
          </div>

          <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
            <div className="rounded-xl bg-heavy-surface-elevated border border-heavy-border p-3.5">
              <p className="text-xs text-heavy-muted flex items-center gap-1.5">
                <Trophy className="w-3.5 h-3.5 text-heavy-blue" />
                {detailStats.isAssisted
                  ? 'Lowest Assistance'
                  : detailStats.category === 'duration' || detailStats.category === 'cardio'
                    ? 'Longest Set'
                    : detailStats.prMaxWeightKg !== null
                      ? 'Best Weight'
                      : 'Best Reps'}
              </p>
              <p className="text-lg font-bold text-white mt-1 font-mono">
                {detailStats.isAssisted
                  ? detailStats.prLowestAssistanceKg !== null
                    ? `${detailStats.prLowestAssistanceKg} kg`
                    : '—'
                  : detailStats.category === 'duration' || detailStats.category === 'cardio'
                    ? detailStats.prMaxDurationSeconds !== null
                      ? `${detailStats.prMaxDurationSeconds}s`
                      : '—'
                    : detailStats.prMaxWeightKg !== null
                      ? `${detailStats.prMaxWeightKg} kg`
                      : detailStats.prMaxReps !== null
                        ? `${detailStats.prMaxReps} reps`
                        : '—'}
              </p>
            </div>

            <div className="rounded-xl bg-heavy-surface-elevated border border-heavy-border p-3.5">
              <p className="text-xs text-heavy-muted">Best Est. 1RM</p>
              <p className="text-lg font-bold text-white mt-1 font-mono">
                {detailStats.prBest1RM !== null ? `${detailStats.prBest1RM} kg` : '—'}
              </p>
            </div>

            <div className="rounded-xl bg-heavy-surface-elevated border border-heavy-border p-3.5">
              <p className="text-xs text-heavy-muted">Best Session Volume</p>
              <p className="text-lg font-bold text-white mt-1 font-mono">
                {detailStats.prBestVolumeKg > 0
                  ? formatVolume(detailStats.prBestVolumeKg)
                  : '—'}
              </p>
            </div>

            <div className="rounded-xl bg-heavy-surface-elevated border border-heavy-border p-3.5">
              <p className="text-xs text-heavy-muted">Average RPE</p>
              <p className="text-lg font-bold text-white mt-1 font-mono">
                {detailStats.overallAvgRpe !== null ? detailStats.overallAvgRpe : '—'}
              </p>
            </div>
          </div>
        </section>

        {/* Progression Chart Card */}
        <section className="rounded-2xl border border-heavy-border bg-heavy-surface p-5">
          <div className="flex flex-wrap items-center justify-between gap-3 mb-4">
            <div>
              <h3 className="text-sm font-semibold text-white">Exercise Progression</h3>
              <p className="text-xs text-heavy-muted">
                {detailStats.isAssisted && detailMetric === 'primaryLoad'
                  ? 'Inverted Y-axis: moving upward means less counterweight assistance (stronger)'
                  : 'Progression across sessions in selected range'}
              </p>
            </div>

            <div className="inline-flex flex-wrap rounded-xl bg-heavy-bg border border-heavy-border p-1 gap-1">
              {(
                [
                  { id: 'primaryLoad', label: primaryLoadLabel },
                  { id: 'volume', label: 'Volume' },
                  { id: 'oneRm', label: 'Est. 1RM' },
                  { id: 'rpe', label: 'Avg RPE' },
                ] as const
              ).map((m) => (
                <button
                  key={m.id}
                  type="button"
                  onClick={() => setDetailMetric(m.id)}
                  className={`px-2.5 py-1 rounded-lg text-xs font-medium transition cursor-pointer ${
                    detailMetric === m.id
                      ? 'bg-heavy-blue text-white'
                      : 'text-heavy-muted hover:text-white'
                  }`}
                >
                  {m.label}
                </button>
              ))}
            </div>
          </div>

          {detailChartOption ? (
            <EChart option={detailChartOption} height={280} />
          ) : (
            <div className="py-12 text-center text-xs text-heavy-muted">
              No recorded data for this metric in the selected period.
            </div>
          )}
        </section>

        {/* Session History Log */}
        <section className="rounded-2xl border border-heavy-border bg-heavy-surface overflow-hidden">
          <div className="px-5 py-3.5 border-b border-heavy-border flex items-center justify-between">
            <h3 className="text-sm font-semibold text-white">Session History</h3>
            <span className="text-xs text-heavy-muted">
              {detailStats.totalSessions} sessions · {detailStats.totalCountedSets} working sets
            </span>
          </div>

          <div className="divide-y divide-heavy-border/70">
            {detailStats.sessionsNewestFirst.map((session) => (
              <div key={session.workoutId} className="p-4 md:px-5 space-y-2.5">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <div className="flex items-center gap-2">
                    <span className="text-xs font-mono text-heavy-blue-bright">
                      {session.dateKey}
                    </span>
                    <span className="text-sm font-semibold text-white">
                      {session.workoutTitle}
                    </span>
                  </div>
                  <div className="flex items-center gap-3 text-xs text-heavy-muted font-mono">
                    {session.sessionVolumeKg > 0 && (
                      <span>Vol {formatVolume(session.sessionVolumeKg)}</span>
                    )}
                    {session.bestEstimated1RM !== null && (
                      <span>1RM {session.bestEstimated1RM}kg</span>
                    )}
                    {session.avgRpe !== null && <span>RPE {session.avgRpe}</span>}
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-1.5">
                  {session.allSets.map((s) => {
                    const est1rm = calculateEstimated1RM(
                      s.weightKg,
                      s.reps,
                      detailStats.isAssisted,
                    );
                    const tag =
                      s.setType === 'warmup'
                        ? 'W'
                        : s.setType === 'dropset'
                          ? 'D'
                          : s.setType === 'failure'
                            ? 'F'
                            : `#${s.setIndex + 1}`;
                    return (
                      <div
                        key={s.rowIndex}
                        className={`flex items-center justify-between gap-2 px-2.5 py-1.5 rounded-lg border text-xs ${
                          s.setType === 'warmup'
                            ? 'border-amber-500/25 bg-heavy-bg/40 opacity-65'
                            : 'border-heavy-border bg-heavy-bg/80'
                        }`}
                      >
                        <div className="flex items-center gap-2">
                          <span className="text-[10px] font-bold text-heavy-muted w-5">
                            {tag}
                          </span>
                          <span className="font-mono text-heavy-text">
                            {s.weightKg !== null && s.reps !== null
                              ? `${s.weightKg}kg × ${s.reps}`
                              : s.reps !== null
                                ? `${s.reps} reps`
                                : s.durationSeconds !== null
                                  ? `${s.durationSeconds}s`
                                  : '—'}
                          </span>
                        </div>
                        <div className="flex items-center gap-2 text-[11px] font-mono text-heavy-muted">
                          {est1rm !== null && s.setType !== 'warmup' && (
                            <span>{est1rm}</span>
                          )}
                          {s.rpe !== null && (
                            <span className="text-heavy-blue-bright">@{s.rpe}</span>
                          )}
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            ))}
          </div>
        </section>
      </div>
    );
  }

  // =================== MAIN EXERCISES RANKED LIST ===================
  return (
    <div className="space-y-5">
      {/* Period Selector & Filters */}
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="inline-flex flex-wrap rounded-xl bg-heavy-surface border border-heavy-border p-1 gap-1">
          {PERIOD_OPTIONS.map((opt) => (
            <button
              key={opt.id}
              type="button"
              onClick={() => setPeriod(opt.id)}
              className={`px-3 py-1.5 rounded-lg text-xs font-medium transition cursor-pointer ${
                period === opt.id
                  ? 'bg-heavy-blue text-white shadow-sm'
                  : 'text-heavy-muted hover:text-white'
              }`}
            >
              {opt.label}
            </button>
          ))}
        </div>

        <div className="flex items-center gap-2 w-full sm:w-auto">
          <div className="relative flex-1 sm:w-52">
            <Search className="w-3.5 h-3.5 text-heavy-subtle absolute left-3 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search exercise..."
              className="w-full pl-8 pr-3 py-1.5 rounded-xl bg-heavy-surface border border-heavy-border text-xs text-white placeholder:text-heavy-subtle focus:outline-none focus:border-heavy-blue"
            />
          </div>

          <select
            value={muscleFilter}
            onChange={(e) => setMuscleFilter(e.target.value as DetailedMuscle | 'all')}
            aria-label="Filter exercises by muscle"
            className="rounded-xl bg-heavy-surface border border-heavy-border px-2.5 py-1.5 text-xs text-white focus:outline-none focus:border-heavy-blue"
          >
            <option value="all">All muscles</option>
            {DETAILED_MUSCLES.map((m) => (
              <option key={m} value={m}>
                {m}
              </option>
            ))}
          </select>
        </div>
      </div>

      {/* Ranked List Card */}
      <section className="rounded-2xl border border-heavy-border bg-heavy-surface overflow-hidden">
        <div className="px-5 py-3.5 border-b border-heavy-border flex items-center justify-between">
          <h2 className="text-sm font-semibold text-white">
            Most Performed Exercises
          </h2>
          <span className="text-xs text-heavy-muted">
            {filteredExercises.length}{' '}
            {filteredExercises.length === 1 ? 'exercise' : 'exercises'}
          </span>
        </div>

        {filteredExercises.length === 0 ? (
          <div className="p-10 text-center text-xs text-heavy-muted">
            No exercises found in this period.
          </div>
        ) : (
          <div className="divide-y divide-heavy-border/60">
            {filteredExercises.map((item, idx) => {
              const cat = getCategoryStyle(item.category);
              const CatIcon = cat.icon;
              return (
                <button
                  key={item.exerciseTitle}
                  type="button"
                  onClick={() => {
                    setSelectedExercise(item.exerciseTitle);
                    setDetailPeriod('all');
                    setDetailMetric('primaryLoad');
                  }}
                  className="w-full px-4 md:px-5 py-3.5 flex items-center justify-between gap-3 hover:bg-heavy-surface-elevated/70 transition cursor-pointer text-left group"
                >
                  <div className="flex items-center gap-3 min-w-0">
                    <span className="w-6 text-xs font-mono text-heavy-subtle shrink-0 text-right">
                      {idx + 1}
                    </span>
                    <div
                      className={`w-9 h-9 rounded-xl flex items-center justify-center shrink-0 ${cat.colorClass}`}
                    >
                      <CatIcon className="w-4 h-4" />
                    </div>
                    <div className="min-w-0">
                      <p className="text-sm font-medium text-white truncate group-hover:text-heavy-blue-bright transition">
                        {item.exerciseTitle}
                      </p>
                      <p className="text-xs text-heavy-muted truncate mt-0.5">
                        {item.primaryMuscle ?? cat.label}
                        {' · '}
                        {item.totalSets} sets
                        {item.bestWeightKg !== null && ` · Best ${item.bestWeightKg} kg`}
                        {item.lowestAssistanceKg !== null &&
                          ` · Min assist ${item.lowestAssistanceKg} kg`}
                        {item.maxDurationSeconds !== null &&
                          item.bestWeightKg === null &&
                          ` · Max ${item.maxDurationSeconds}s`}
                      </p>
                    </div>
                  </div>

                  <div className="flex items-center gap-2 shrink-0">
                    <span className="text-xs sm:text-sm font-semibold text-heavy-blue-bright">
                      {item.timesPerformed} {item.timesPerformed === 1 ? 'time' : 'times'}
                    </span>
                    <ChevronRight className="w-4 h-4 text-heavy-subtle group-hover:text-heavy-blue transition" />
                  </div>
                </button>
              );
            })}
          </div>
        )}
      </section>
    </div>
  );
}

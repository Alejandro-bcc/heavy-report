import { useMemo, useState } from 'react';
import type { EChartsOption } from 'echarts';
import { ChevronLeft, ChevronRight, TrendingUp } from 'lucide-react';
import { AnatomicalBodyMap } from '@/components/body/AnatomicalBodyMap';
import { EChart } from '@/components/charts/EChart';
import { DETAILED_MUSCLES } from '@/constants/muscles';
import {
  buildMuscleHistorySeries,
  computePeriodComparison,
  formatFractionalSets,
  getWeekWindow,
} from '@/services/analytics';
import {
  accumulateMuscleSets,
  formatVolume,
  type CalcSettings,
} from '@/services/calculations';
import type {
  DetailedMuscle,
  ExerciseMapping,
  PeriodFilter,
  Workout,
} from '@/types/workout';

interface BodyDistributionViewProps {
  workouts: Workout[];
  mappingsByTitle: Map<string, ExerciseMapping>;
  settings: CalcSettings & { weekStartsOn: 0 | 1 };
}

type BodyRangeMode = 'week' | PeriodFilter;

const RANGE_OPTIONS: Array<{ id: BodyRangeMode; label: string }> = [
  { id: 'week', label: 'Week' },
  { id: '30d', label: '30 days' },
  { id: '3m', label: '3 months' },
  { id: '1y', label: '1 year' },
  { id: 'all', label: 'All time' },
];

export function BodyDistributionView({
  workouts,
  mappingsByTitle,
  settings,
}: BodyDistributionViewProps) {
  const [rangeMode, setRangeMode] = useState<BodyRangeMode>('week');
  const [weekOffset, setWeekOffset] = useState(0);
  const [selectedMuscle, setSelectedMuscle] = useState<DetailedMuscle | 'Total'>('Total');
  const [historyMetric, setHistoryMetric] = useState<'sets' | 'volumeKg'>('sets');
  const [historyGranularity, setHistoryGranularity] = useState<'week' | 'month'>('week');

  const activeWindow = useMemo(() => {
    if (rangeMode === 'week') {
      const week = getWeekWindow(workouts, weekOffset, settings.weekStartsOn);
      const muscles = accumulateMuscleSets(week.workouts, mappingsByTitle, settings);
      return {
        label: week.label,
        weekDays: week.days,
        workoutsInScope: week.workouts,
        muscles,
      };
    }

    const comp = computePeriodComparison(workouts, rangeMode, mappingsByTitle, settings);
    return {
      label: comp.currentRangeLabel,
      weekDays: null,
      workoutsInScope: comp.currentWorkouts,
      muscles: comp.currentMuscles,
    };
  }, [workouts, rangeMode, weekOffset, mappingsByTitle, settings]);

  const maxDetailedSets = useMemo(
    () => Math.max(1, ...Object.values(activeWindow.muscles.detailed)),
    [activeWindow.muscles.detailed],
  );

  const historySeries = useMemo(
    () =>
      buildMuscleHistorySeries(
        workouts,
        selectedMuscle,
        mappingsByTitle,
        settings,
        historyGranularity,
      ),
    [workouts, selectedMuscle, mappingsByTitle, settings, historyGranularity],
  );

  const historyOption = useMemo<EChartsOption>(() => {
    const labels = historySeries.map((p) => p.label);
    const values = historySeries.map((p) =>
      historyMetric === 'sets' ? p.sets : p.volumeKg,
    );

    return {
      backgroundColor: 'transparent',
      grid: {
        top: 24,
        right: 16,
        bottom: 28,
        left: historyMetric === 'sets' ? 42 : 58,
      },
      tooltip: {
        trigger: 'axis',
        backgroundColor: '#14181F',
        borderColor: '#252C38',
        textStyle: { color: '#F4F6FA', fontSize: 12 },
        formatter: (params: unknown) => {
          const arr = Array.isArray(params) ? params : [params];
          const first = arr[0] as { dataIndex?: number } | undefined;
          const pt =
            first?.dataIndex !== undefined ? historySeries[first.dataIndex] : undefined;
          if (!pt) return '';
          return `
            <div style="font-weight:600;margin-bottom:4px;">${pt.label}</div>
            <div>Sets: <strong>${formatFractionalSets(pt.sets)}</strong></div>
            <div>Volume: <strong>${formatVolume(pt.volumeKg)}</strong></div>
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
        splitLine: { lineStyle: { color: '#1F2632' } },
        axisLabel: {
          color: '#8E98A8',
          fontSize: 11,
          formatter: (val: number) =>
            historyMetric === 'sets' ? String(val) : val >= 1000 ? `${val / 1000}k` : String(val),
        },
      },
      series: [
        {
          type: 'line',
          smooth: 0.25,
          symbol: 'circle',
          symbolSize: 6,
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
                { offset: 0, color: 'rgba(47, 128, 237, 0.35)' },
                { offset: 1, color: 'rgba(47, 128, 237, 0.02)' },
              ],
            },
          },
        },
      ],
    };
  }, [historySeries, historyMetric]);

  const handleToggleMuscle = (muscle: DetailedMuscle) => {
    setSelectedMuscle((prev) => (prev === muscle ? 'Total' : muscle));
  };

  return (
    <div className="space-y-5">
      {/* Mode / Filter Selector */}
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="inline-flex flex-wrap rounded-xl bg-heavy-surface border border-heavy-border p-1 gap-1">
          {RANGE_OPTIONS.map((opt) => (
            <button
              key={opt.id}
              type="button"
              onClick={() => setRangeMode(opt.id)}
              className={`px-3 py-1.5 rounded-lg text-xs font-medium transition cursor-pointer ${
                rangeMode === opt.id
                  ? 'bg-heavy-blue text-white shadow-sm'
                  : 'text-heavy-muted hover:text-white'
              }`}
            >
              {opt.label}
            </button>
          ))}
        </div>

        <span className="text-xs text-heavy-muted">
          {activeWindow.workoutsInScope.length}{' '}
          {activeWindow.workoutsInScope.length === 1 ? 'workout' : 'workouts'} in range
        </span>
      </div>

      {/* Weekly Navigator + Mon-Sun Bar */}
      {rangeMode === 'week' && activeWindow.weekDays && (
        <section className="rounded-2xl border border-heavy-border bg-heavy-surface p-4 space-y-4">
          <div className="flex items-center justify-between gap-2">
            <button
              type="button"
              onClick={() => setWeekOffset((w) => w - 1)}
              className="p-2 rounded-xl bg-heavy-surface-elevated hover:bg-heavy-border text-white transition cursor-pointer"
              aria-label="Previous week"
            >
              <ChevronLeft className="w-4 h-4" />
            </button>

            <div className="text-center">
              <p className="text-sm font-semibold text-white">{activeWindow.label}</p>
              {weekOffset !== 0 && (
                <button
                  type="button"
                  onClick={() => setWeekOffset(0)}
                  className="text-[11px] text-heavy-blue hover:underline cursor-pointer mt-0.5"
                >
                  Back to current week
                </button>
              )}
            </div>

            <button
              type="button"
              onClick={() => setWeekOffset((w) => Math.min(0, w + 1))}
              disabled={weekOffset >= 0}
              className="p-2 rounded-xl bg-heavy-surface-elevated hover:bg-heavy-border text-white transition cursor-pointer disabled:opacity-35 disabled:cursor-not-allowed"
              aria-label="Next week"
            >
              <ChevronRight className="w-4 h-4" />
            </button>
          </div>

          <div className="grid grid-cols-7 gap-1.5 sm:gap-2">
            {activeWindow.weekDays.map((day) => (
              <div
                key={day.dateKey}
                title={
                  day.hasWorkout
                    ? `${day.dateKey}: ${day.titles.join(', ')}`
                    : `${day.dateKey}: Rest`
                }
                className="flex flex-col items-center gap-1"
              >
                <span className="text-[11px] text-heavy-muted">{day.dayShort}</span>
                <div
                  className={`w-8 h-8 sm:w-9 sm:h-9 rounded-full flex items-center justify-center text-xs font-semibold ${
                    day.hasWorkout
                      ? 'bg-heavy-blue text-white shadow-md shadow-heavy-blue/30'
                      : 'bg-heavy-bg text-heavy-subtle border border-heavy-border'
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
        </section>
      )}

      {/* Split Layout: Anatomical SVG Map + 16-Muscle Sets Table */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-5">
        {/* Anatomical SVG Card */}
        <section className="lg:col-span-6 rounded-2xl border border-heavy-border bg-heavy-surface p-5 flex flex-col justify-between">
          <div className="flex items-center justify-between gap-2 mb-3">
            <div>
              <h2 className="text-sm font-semibold text-white">Anatomical Map</h2>
              <p className="text-xs text-heavy-muted">{activeWindow.label}</p>
            </div>
            {selectedMuscle !== 'Total' && (
              <button
                type="button"
                onClick={() => setSelectedMuscle('Total')}
                className="px-2.5 py-1 rounded-lg text-[11px] bg-heavy-blue/15 text-heavy-blue-bright border border-heavy-blue/30 cursor-pointer"
              >
                Clear: {selectedMuscle} ×
              </button>
            )}
          </div>

          <AnatomicalBodyMap
            muscleSets={activeWindow.muscles.detailed}
            selectedMuscle={selectedMuscle === 'Total' ? null : selectedMuscle}
            onSelectMuscle={handleToggleMuscle}
          />
        </section>

        {/* Sets per Muscle Table */}
        <section className="lg:col-span-6 rounded-2xl border border-heavy-border bg-heavy-surface overflow-hidden flex flex-col">
          <div className="px-5 py-3.5 border-b border-heavy-border flex items-center justify-between">
            <h2 className="text-sm font-semibold text-white">Sets per Muscle Group</h2>
            <span className="text-[11px] text-heavy-muted">
              1.0 primary · {settings.secondaryMuscleWeight} secondary
            </span>
          </div>

          <div className="divide-y divide-heavy-border/60 overflow-y-auto max-h-[440px]">
            {/* Pinned Total Row */}
            <button
              type="button"
              onClick={() => setSelectedMuscle('Total')}
              className={`w-full px-5 py-3 flex items-center justify-between text-left transition cursor-pointer ${
                selectedMuscle === 'Total'
                  ? 'bg-heavy-blue/15 border-l-2 border-heavy-blue'
                  : 'bg-heavy-surface-elevated/60 hover:bg-heavy-surface-elevated'
              }`}
            >
              <span className="text-sm font-semibold text-white">Total</span>
              <span className="text-sm font-bold font-mono text-heavy-blue-bright">
                {formatFractionalSets(activeWindow.muscles.totalWeightedSets)}
              </span>
            </button>

            {/* 16 Detailed Muscles */}
            {DETAILED_MUSCLES.map((muscle) => {
              const sets = activeWindow.muscles.detailed[muscle];
              const isSelected = selectedMuscle === muscle;
              const pct = sets > 0 ? Math.max(4, (sets / maxDetailedSets) * 100) : 0;

              return (
                <button
                  key={muscle}
                  type="button"
                  onClick={() => handleToggleMuscle(muscle)}
                  className={`w-full px-5 py-2.5 flex items-center justify-between gap-4 text-left transition cursor-pointer ${
                    isSelected
                      ? 'bg-heavy-blue/15 border-l-2 border-heavy-blue'
                      : 'hover:bg-heavy-surface-elevated/60'
                  }`}
                >
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center justify-between gap-2">
                      <span
                        className={`text-xs font-medium ${
                          sets > 0 ? 'text-white' : 'text-heavy-subtle'
                        }`}
                      >
                        {muscle}
                      </span>
                    </div>
                    <div className="mt-1 h-1.5 rounded-full bg-heavy-bg overflow-hidden">
                      {pct > 0 && (
                        <div
                          className="h-full rounded-full bg-gradient-to-r from-heavy-blue-dim to-heavy-blue-bright transition-all duration-300"
                          style={{ width: `${pct}%` }}
                        />
                      )}
                    </div>
                  </div>
                  <span
                    className={`w-12 text-right font-mono text-xs font-semibold shrink-0 ${
                      sets > 0 ? 'text-heavy-text' : 'text-heavy-subtle'
                    }`}
                  >
                    {formatFractionalSets(sets)}
                  </span>
                </button>
              );
            })}
          </div>
        </section>
      </div>

      {/* Historical Series by Selected Muscle */}
      <section className="rounded-2xl border border-heavy-border bg-heavy-surface p-5">
        <div className="flex flex-wrap items-center justify-between gap-3 mb-4">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-lg bg-heavy-blue/15 text-heavy-blue flex items-center justify-center">
              <TrendingUp className="w-4 h-4" />
            </div>
            <div>
              <h3 className="text-sm font-semibold text-white">
                Historical Progression — {selectedMuscle === 'Total' ? 'All Muscles' : selectedMuscle}
              </h3>
              <p className="text-xs text-heavy-muted">
                Click any muscle on the map or table to inspect its trend over time
              </p>
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <select
              value={selectedMuscle}
              onChange={(e) =>
                setSelectedMuscle(e.target.value as DetailedMuscle | 'Total')
              }
              aria-label="Select muscle for history chart"
              className="rounded-lg bg-heavy-bg border border-heavy-border px-2.5 py-1.5 text-xs text-white focus:outline-none focus:border-heavy-blue"
            >
              <option value="Total">Total (All Muscles)</option>
              {DETAILED_MUSCLES.map((m) => (
                <option key={m} value={m}>
                  {m}
                </option>
              ))}
            </select>

            <div className="inline-flex rounded-lg bg-heavy-bg border border-heavy-border p-0.5 text-xs">
              <button
                type="button"
                onClick={() => setHistoryMetric('sets')}
                className={`px-2.5 py-1 rounded-md cursor-pointer transition ${
                  historyMetric === 'sets'
                    ? 'bg-heavy-blue text-white'
                    : 'text-heavy-muted hover:text-white'
                }`}
              >
                Sets
              </button>
              <button
                type="button"
                onClick={() => setHistoryMetric('volumeKg')}
                className={`px-2.5 py-1 rounded-md cursor-pointer transition ${
                  historyMetric === 'volumeKg'
                    ? 'bg-heavy-blue text-white'
                    : 'text-heavy-muted hover:text-white'
                }`}
              >
                Volume
              </button>
            </div>

            <div className="inline-flex rounded-lg bg-heavy-bg border border-heavy-border p-0.5 text-xs">
              <button
                type="button"
                onClick={() => setHistoryGranularity('week')}
                className={`px-2.5 py-1 rounded-md cursor-pointer transition ${
                  historyGranularity === 'week'
                    ? 'bg-heavy-surface-elevated text-white'
                    : 'text-heavy-muted hover:text-white'
                }`}
              >
                Weekly
              </button>
              <button
                type="button"
                onClick={() => setHistoryGranularity('month')}
                className={`px-2.5 py-1 rounded-md cursor-pointer transition ${
                  historyGranularity === 'month'
                    ? 'bg-heavy-surface-elevated text-white'
                    : 'text-heavy-muted hover:text-white'
                }`}
              >
                Monthly
              </button>
            </div>
          </div>
        </div>

        {historySeries.length === 0 ? (
          <p className="text-xs text-heavy-muted py-10 text-center">
            Not enough data to render progression chart.
          </p>
        ) : (
          <EChart option={historyOption} height={260} />
        )}
      </section>
    </div>
  );
}

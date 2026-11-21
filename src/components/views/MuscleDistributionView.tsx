import { useMemo, useState } from 'react';
import type { EChartsOption } from 'echarts';
import { ArrowDownRight, ArrowUpRight, Minus } from 'lucide-react';
import { EChart } from '@/components/charts/EChart';
import { MACRO_MUSCLES } from '@/constants/muscles';
import {
  computePeriodComparison,
  formatFractionalSets,
} from '@/services/analytics';
import {
  formatDuration,
  formatVolume,
  type CalcSettings,
} from '@/services/calculations';
import type { ExerciseMapping, PeriodFilter, Workout } from '@/types/workout';

interface MuscleDistributionViewProps {
  workouts: Workout[];
  mappingsByTitle: Map<string, ExerciseMapping>;
  settings: CalcSettings;
}

const PERIOD_OPTIONS: Array<{ id: PeriodFilter; label: string }> = [
  { id: '30d', label: 'Last 30 days' },
  { id: '3m', label: 'Last 3 months' },
  { id: '1y', label: 'Last year' },
  { id: 'all', label: 'All time' },
];

interface KpiCardProps {
  label: string;
  displayValue: string;
  currentNumeric: number;
  previousNumeric: number | null;
  previousDisplay: string | null;
}

function KpiComparisonCard({
  label,
  displayValue,
  currentNumeric,
  previousNumeric,
  previousDisplay,
}: KpiCardProps) {
  const hasPrev = previousNumeric !== null && previousDisplay !== null;
  const delta = hasPrev ? currentNumeric - previousNumeric : 0;
  const isUp = delta > 0;
  const isDown = delta < 0;

  return (
    <div className="rounded-2xl border border-heavy-border bg-heavy-surface p-4 md:p-5 flex flex-col justify-between">
      <p className="text-xs font-medium text-heavy-muted">{label}</p>
      <p className="text-2xl md:text-3xl font-bold text-white tracking-tight mt-2">
        {displayValue}
      </p>
      {hasPrev ? (
        <div className="mt-2.5 flex items-center gap-1.5 text-xs">
          {isUp ? (
            <span className="inline-flex items-center gap-0.5 text-heavy-positive font-medium">
              <ArrowUpRight className="w-3.5 h-3.5" />
              Up
            </span>
          ) : isDown ? (
            <span className="inline-flex items-center gap-0.5 text-heavy-negative font-medium">
              <ArrowDownRight className="w-3.5 h-3.5" />
              Down
            </span>
          ) : (
            <span className="inline-flex items-center gap-0.5 text-heavy-muted font-medium">
              <Minus className="w-3.5 h-3.5" />
              Same
            </span>
          )}
          <span className="text-heavy-muted">vs {previousDisplay} prev</span>
        </div>
      ) : (
        <p className="mt-2.5 text-xs text-heavy-subtle">Accumulated total</p>
      )}
    </div>
  );
}

export function MuscleDistributionView({
  workouts,
  mappingsByTitle,
  settings,
}: MuscleDistributionViewProps) {
  const [period, setPeriod] = useState<PeriodFilter>('30d');

  const comparison = useMemo(
    () => computePeriodComparison(workouts, period, mappingsByTitle, settings),
    [workouts, period, mappingsByTitle, settings],
  );

  const radarOption = useMemo<EChartsOption>(() => {
    const currentVals = MACRO_MUSCLES.map((m) => comparison.currentMuscles.macro[m]);
    const prevVals = comparison.previousMuscles
      ? MACRO_MUSCLES.map((m) => comparison.previousMuscles!.macro[m])
      : null;

    const rawMax = Math.max(
      1,
      ...currentVals,
      ...(prevVals ?? [0]),
    );
    const axisMax = Math.ceil(rawMax * 1.15);

    const seriesData: Array<Record<string, unknown>> = [];

    if (prevVals) {
      seriesData.push({
        value: prevVals,
        name: 'Previous period',
        symbol: 'circle',
        symbolSize: 5,
        lineStyle: {
          color: '#7C8798',
          width: 2,
          type: 'solid',
        },
        itemStyle: {
          color: '#7C8798',
        },
        areaStyle: {
          color: 'rgba(124, 135, 152, 0.18)',
        },
      });
    }

    seriesData.push({
      value: currentVals,
      name: period === 'all' ? 'All time' : 'Current period',
      symbol: 'circle',
      symbolSize: 6,
      lineStyle: {
        color: '#2F80ED',
        width: 2.5,
      },
      itemStyle: {
        color: '#38BDF8',
        borderColor: '#2F80ED',
        borderWidth: 2,
      },
      areaStyle: {
        color: 'rgba(47, 128, 237, 0.34)',
      },
    });

    return {
      backgroundColor: 'transparent',
      tooltip: {
        trigger: 'item',
        backgroundColor: '#14181F',
        borderColor: '#252C38',
        textStyle: {
          color: '#F4F6FA',
          fontSize: 12,
        },
      },
      legend: {
        bottom: 0,
        itemWidth: 12,
        itemHeight: 8,
        textStyle: {
          color: '#8E98A8',
          fontSize: 12,
        },
      },
      radar: {
        shape: 'polygon',
        center: ['50%', '46%'],
        radius: '68%',
        splitNumber: 4,
        indicator: MACRO_MUSCLES.map((name) => ({
          name,
          max: axisMax,
        })),
        axisName: {
          color: '#D7DFEC',
          fontSize: 12,
          fontWeight: 600,
        },
        splitLine: {
          lineStyle: {
            color: ['#252C38', '#252C38', '#252C38', '#2E3746'],
          },
        },
        splitArea: {
          areaStyle: {
            color: ['rgba(20, 24, 31, 0.25)', 'rgba(27, 33, 43, 0.35)'],
          },
        },
        axisLine: {
          lineStyle: {
            color: '#252C38',
          },
        },
      },
      series: [
        {
          type: 'radar',
          data: seriesData,
        },
      ],
    };
  }, [comparison, period]);

  return (
    <div className="space-y-5">
      {/* Period Selector */}
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="inline-flex rounded-xl bg-heavy-surface border border-heavy-border p-1 gap-1">
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

        <p className="text-xs text-heavy-muted">
          {comparison.currentRangeLabel}
          {comparison.previousRangeLabel && (
            <span className="text-heavy-subtle">
              {' '}
              vs {comparison.previousRangeLabel}
            </span>
          )}
        </p>
      </div>

      {/* Main Grid: Radar Chart + 2x2 KPI Cards */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-5">
        {/* Radar Card */}
        <section className="lg:col-span-7 rounded-2xl border border-heavy-border bg-heavy-surface p-5">
          <div className="flex items-center justify-between gap-2 mb-2">
            <div>
              <h2 className="text-sm font-semibold text-white">
                Muscle Group Balance
              </h2>
              <p className="text-xs text-heavy-muted">
                Weighted sets across 6 macro groups (primary 1.0x, secondary {settings.secondaryMuscleWeight}x)
              </p>
            </div>
          </div>

          <EChart option={radarOption} height={330} />
        </section>

        {/* 2x2 KPI Grid */}
        <section className="lg:col-span-5 grid grid-cols-2 gap-3 content-stretch">
          <KpiComparisonCard
            label="Workouts"
            displayValue={String(comparison.currentKpis.workouts)}
            currentNumeric={comparison.currentKpis.workouts}
            previousNumeric={comparison.previousKpis?.workouts ?? null}
            previousDisplay={
              comparison.previousKpis ? String(comparison.previousKpis.workouts) : null
            }
          />
          <KpiComparisonCard
            label="Duration"
            displayValue={formatDuration(comparison.currentKpis.durationSeconds)}
            currentNumeric={comparison.currentKpis.durationSeconds}
            previousNumeric={comparison.previousKpis?.durationSeconds ?? null}
            previousDisplay={
              comparison.previousKpis
                ? formatDuration(comparison.previousKpis.durationSeconds)
                : null
            }
          />
          <KpiComparisonCard
            label="Volume"
            displayValue={formatVolume(comparison.currentKpis.volumeKg)}
            currentNumeric={comparison.currentKpis.volumeKg}
            previousNumeric={comparison.previousKpis?.volumeKg ?? null}
            previousDisplay={
              comparison.previousKpis
                ? formatVolume(comparison.previousKpis.volumeKg)
                : null
            }
          />
          <KpiComparisonCard
            label="Sets"
            displayValue={String(comparison.currentKpis.sets)}
            currentNumeric={comparison.currentKpis.sets}
            previousNumeric={comparison.previousKpis?.sets ?? null}
            previousDisplay={
              comparison.previousKpis ? String(comparison.previousKpis.sets) : null
            }
          />
        </section>
      </div>

      {/* Macro Group Numbers Strip */}
      <section className="rounded-2xl border border-heavy-border bg-heavy-surface p-5">
        <h3 className="text-xs font-semibold text-heavy-muted uppercase tracking-wider mb-3">
          Sets per Macro Group
        </h3>
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-2.5">
          {MACRO_MUSCLES.map((macro) => {
            const curr = comparison.currentMuscles.macro[macro];
            const prev = comparison.previousMuscles?.macro[macro] ?? null;
            const diff = prev !== null ? Math.round((curr - prev) * 10) / 10 : null;
            return (
              <div
                key={macro}
                className="rounded-xl bg-heavy-surface-elevated border border-heavy-border p-3"
              >
                <p className="text-xs text-heavy-muted">{macro}</p>
                <p className="text-lg font-bold text-white mt-0.5 font-mono">
                  {formatFractionalSets(curr)}
                </p>
                {diff !== null && (
                  <p
                    className={`text-[11px] font-mono mt-0.5 ${
                      diff > 0
                        ? 'text-heavy-positive'
                        : diff < 0
                          ? 'text-heavy-negative'
                          : 'text-heavy-subtle'
                    }`}
                  >
                    {diff > 0 ? `+${formatFractionalSets(diff)}` : formatFractionalSets(diff)} vs{' '}
                    {formatFractionalSets(prev!)}
                  </p>
                )}
              </div>
            );
          })}
        </div>
      </section>
    </div>
  );
}

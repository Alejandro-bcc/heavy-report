import { Clock, Dumbbell, Layers, Scale, X } from 'lucide-react';
import {
  calculateSetVolumeKg,
  formatDuration,
  formatVolume,
  isSetCounted,
  type CalcSettings,
} from '@/services/calculations';
import type { ExerciseMapping, Workout, WorkoutSet } from '@/types/workout';

interface WorkoutDetailModalProps {
  dateKey: string | null;
  workouts: Workout[];
  mappingsByTitle: Map<string, ExerciseMapping>;
  settings: CalcSettings;
  onClose: () => void;
  onSelectExercise?: (exerciseTitle: string) => void;
}

function formatClockTime(epochMs: number): string {
  const d = new Date(epochMs);
  return `${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}`;
}

function formatSetBadge(set: WorkoutSet, displayWorkingIndex: number): {
  label: string;
  className: string;
} {
  switch (set.setType) {
    case 'warmup':
      return {
        label: 'W',
        className: 'bg-amber-500/20 text-amber-300 border-amber-500/40',
      };
    case 'dropset':
      return {
        label: 'D',
        className: 'bg-sky-500/20 text-sky-300 border-sky-500/40',
      };
    case 'failure':
      return {
        label: 'F',
        className: 'bg-red-500/20 text-red-300 border-red-500/40',
      };
    default:
      return {
        label: String(displayWorkingIndex),
        className: 'bg-heavy-surface-elevated text-heavy-text border-heavy-border',
      };
  }
}

function formatSetMetrics(set: WorkoutSet): string {
  const parts: string[] = [];
  if (set.weightKg !== null && set.reps !== null) {
    parts.push(`${set.weightKg} kg × ${set.reps}`);
  } else if (set.reps !== null) {
    parts.push(`${set.reps} reps`);
  }
  if (set.durationSeconds !== null) {
    const mins = Math.floor(set.durationSeconds / 60);
    const secs = set.durationSeconds % 60;
    parts.push(mins > 0 ? `${mins}m ${secs}s` : `${secs}s`);
  }
  if (set.distanceKm !== null) {
    parts.push(`${set.distanceKm} km`);
  }
  return parts.length > 0 ? parts.join(' · ') : '—';
}

interface ExerciseBlock {
  exerciseTitle: string;
  blockIndex: number;
  notes: string | null;
  sets: WorkoutSet[];
}

function groupSetsIntoBlocks(sets: WorkoutSet[]): ExerciseBlock[] {
  const blocks: ExerciseBlock[] = [];
  for (const s of sets) {
    const last = blocks[blocks.length - 1];
    if (
      last &&
      last.exerciseTitle === s.exerciseTitle &&
      last.blockIndex === s.blockIndex
    ) {
      last.sets.push(s);
      if (!last.notes && s.exerciseNotes) last.notes = s.exerciseNotes;
    } else {
      blocks.push({
        exerciseTitle: s.exerciseTitle,
        blockIndex: s.blockIndex,
        notes: s.exerciseNotes,
        sets: [s],
      });
    }
  }
  return blocks;
}

export function WorkoutDetailModal({
  dateKey,
  workouts,
  mappingsByTitle,
  settings,
  onClose,
  onSelectExercise,
}: WorkoutDetailModalProps) {
  if (!dateKey || workouts.length === 0) return null;

  return (
    <div
      className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-3 md:p-6"
      role="dialog"
      aria-modal="true"
      aria-label={`Workout details for ${dateKey}`}
      onClick={onClose}
    >
      <div
        className="w-full max-w-2xl max-h-[88vh] rounded-2xl border border-heavy-border bg-heavy-surface shadow-2xl overflow-hidden flex flex-col"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between px-5 py-4 border-b border-heavy-border shrink-0">
          <div>
            <p className="text-xs font-mono text-heavy-blue-bright">{dateKey}</p>
            <h2 className="text-base font-semibold text-white mt-0.5">
              {workouts.length === 1
                ? workouts[0].title
                : `${workouts.length} Workouts on this day`}
            </h2>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-1.5 rounded-lg text-heavy-muted hover:text-white hover:bg-heavy-surface-elevated transition cursor-pointer"
            aria-label="Close workout summary"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Body */}
        <div className="p-5 overflow-y-auto space-y-6">
          {workouts.map((workout) => {
            const blocks = groupSetsIntoBlocks(workout.sets);
            const countedSets = workout.sets.filter((s) => isSetCounted(s, settings));
            const volumeKg = countedSets.reduce(
              (sum, s) =>
                sum +
                calculateSetVolumeKg(s, mappingsByTitle.get(s.exerciseTitle), settings),
              0,
            );

            return (
              <div key={workout.id} className="space-y-4">
                {/* Workout Meta Strip */}
                <div className="rounded-xl bg-heavy-bg/70 border border-heavy-border p-3.5 space-y-2.5">
                  <div className="flex items-center justify-between gap-2 flex-wrap">
                    <h3 className="text-sm font-semibold text-white">{workout.title}</h3>
                    <span className="text-xs font-mono text-heavy-muted">
                      {formatClockTime(workout.startTime)} – {formatClockTime(workout.endTime)}
                    </span>
                  </div>

                  {workout.description && (
                    <p className="text-xs text-heavy-muted">{workout.description}</p>
                  )}

                  <div className="grid grid-cols-3 gap-2 pt-1">
                    <div className="flex items-center gap-1.5 text-xs text-heavy-text">
                      <Clock className="w-3.5 h-3.5 text-heavy-blue" />
                      <span>{formatDuration(workout.durationSeconds)}</span>
                    </div>
                    <div className="flex items-center gap-1.5 text-xs text-heavy-text">
                      <Scale className="w-3.5 h-3.5 text-heavy-blue" />
                      <span>{formatVolume(volumeKg)}</span>
                    </div>
                    <div className="flex items-center gap-1.5 text-xs text-heavy-text">
                      <Layers className="w-3.5 h-3.5 text-heavy-blue" />
                      <span>{countedSets.length} sets</span>
                    </div>
                  </div>
                </div>

                {/* Exercise Blocks */}
                <div className="space-y-3">
                  {blocks.map((block, bIdx) => {
                    const mapping = mappingsByTitle.get(block.exerciseTitle);
                    let workingCounter = 0;

                    return (
                      <div
                        key={`${block.exerciseTitle}-${block.blockIndex}-${bIdx}`}
                        className="rounded-xl border border-heavy-border/80 bg-heavy-surface-elevated/40 p-3.5"
                      >
                        <div className="flex items-center justify-between gap-2 mb-2.5">
                          <div className="flex items-center gap-2 min-w-0">
                            <Dumbbell className="w-3.5 h-3.5 text-heavy-blue shrink-0" />
                            {onSelectExercise ? (
                              <button
                                type="button"
                                onClick={() => {
                                  onClose();
                                  onSelectExercise(block.exerciseTitle);
                                }}
                                className="text-xs font-semibold text-heavy-blue-bright hover:underline truncate cursor-pointer text-left"
                              >
                                {block.exerciseTitle}
                              </button>
                            ) : (
                              <span className="text-xs font-semibold text-white truncate">
                                {block.exerciseTitle}
                              </span>
                            )}
                          </div>
                          {mapping?.primaryMuscle && (
                            <span className="text-[10px] px-2 py-0.5 rounded-md bg-heavy-bg border border-heavy-border text-heavy-muted shrink-0">
                              {mapping.primaryMuscle}
                            </span>
                          )}
                        </div>

                        {block.notes && (
                          <p className="text-[11px] text-heavy-muted italic mb-2">
                            Note: {block.notes}
                          </p>
                        )}

                        <div className="space-y-1.5">
                          {block.sets.map((s) => {
                            if (s.setType !== 'warmup') workingCounter++;
                            const badge = formatSetBadge(s, workingCounter);
                            return (
                              <div
                                key={s.rowIndex}
                                className={`flex items-center justify-between gap-2 text-xs px-2 py-1 rounded-lg ${
                                  s.setType === 'warmup'
                                    ? 'opacity-65 bg-heavy-bg/40'
                                    : 'bg-heavy-bg/70'
                                }`}
                              >
                                <div className="flex items-center gap-2.5">
                                  <span
                                    className={`w-5 h-5 rounded-md border text-[10px] font-bold flex items-center justify-center ${badge.className}`}
                                  >
                                    {badge.label}
                                  </span>
                                  <span className="font-mono text-heavy-text">
                                    {formatSetMetrics(s)}
                                  </span>
                                </div>
                                {s.rpe !== null && (
                                  <span className="text-[11px] font-mono text-heavy-muted">
                                    RPE <strong className="text-white">{s.rpe}</strong>
                                  </span>
                                )}
                              </div>
                            );
                          })}
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}

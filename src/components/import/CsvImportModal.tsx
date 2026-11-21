import { useRef, useState } from 'react';
import {
  AlertTriangle,
  CheckCircle2,
  FileSpreadsheet,
  GitCompare,
  Sparkles,
  Upload,
  X,
} from 'lucide-react';
import { parseHeavyCsv } from '@/services/csvParser';
import { analyzeImportDiff, commitIncrementalImport } from '@/services/importService';
import { formatDuration } from '@/services/calculations';
import type { ImportSummary, Workout, WorkoutDiffResult } from '@/types/workout';

interface CsvImportModalProps {
  open: boolean;
  onClose: () => void;
  onOpenExerciseMapper: (focusUnmapped?: boolean) => void;
}

type ModalStage = 'select' | 'review-modified' | 'done';

function describeWorkoutChange(existing: Workout, incoming: Workout): string[] {
  const diffs: string[] = [];
  if (existing.title !== incoming.title) {
    diffs.push(`Title: "${existing.title}" → "${incoming.title}"`);
  }
  if (existing.durationSeconds !== incoming.durationSeconds) {
    diffs.push(
      `Duration: ${formatDuration(existing.durationSeconds)} → ${formatDuration(incoming.durationSeconds)}`,
    );
  }
  if (existing.sets.length !== incoming.sets.length) {
    diffs.push(`Sets: ${existing.sets.length} → ${incoming.sets.length}`);
  }
  if (diffs.length === 0) {
    diffs.push('Set details (weight, reps, RPE, or notes) modified');
  }
  return diffs;
}

export function CsvImportModal({
  open,
  onClose,
  onOpenExerciseMapper,
}: CsvImportModalProps) {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [isDragging, setIsDragging] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [warnings, setWarnings] = useState<string[]>([]);
  const [stage, setStage] = useState<ModalStage>('select');
  const [fileName, setFileName] = useState('');
  const [diff, setDiff] = useState<WorkoutDiffResult | null>(null);
  const [selectedModifiedIds, setSelectedModifiedIds] = useState<Set<string>>(new Set());
  const [summary, setSummary] = useState<ImportSummary | null>(null);

  if (!open) return null;

  const resetState = () => {
    setError(null);
    setWarnings([]);
    setStage('select');
    setFileName('');
    setDiff(null);
    setSelectedModifiedIds(new Set());
    setSummary(null);
    setIsProcessing(false);
    setIsDragging(false);
  };

  const handleClose = () => {
    resetState();
    onClose();
  };

  const processFile = async (file: File) => {
    setError(null);
    setWarnings([]);
    setIsProcessing(true);
    setFileName(file.name);

    try {
      const text = await file.text();
      const parsed = parseHeavyCsv(text);
      setWarnings(parsed.warnings);

      const diffResult = await analyzeImportDiff(parsed.workouts);
      setDiff(diffResult);

      if (diffResult.modifiedWorkouts.length > 0) {
        // Pre-select all modified workouts for user review
        setSelectedModifiedIds(
          new Set(diffResult.modifiedWorkouts.map((m) => m.incoming.id)),
        );
        setStage('review-modified');
      } else {
        const result = await commitIncrementalImport({
          fileName: file.name,
          newWorkouts: diffResult.newWorkouts,
          acceptedModifiedWorkouts: [],
          unchangedCount: diffResult.unchangedCount,
          unmappedExercises: diffResult.unmappedExercises,
        });
        setSummary(result);
        setStage('done');
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to parse CSV file.');
    } finally {
      setIsProcessing(false);
    }
  };

  const handleConfirmModified = async () => {
    if (!diff) return;
    setIsProcessing(true);
    setError(null);
    try {
      const accepted = diff.modifiedWorkouts.filter((m) =>
        selectedModifiedIds.has(m.incoming.id),
      );
      const ignoredModified = diff.modifiedWorkouts.length - accepted.length;

      const result = await commitIncrementalImport({
        fileName,
        newWorkouts: diff.newWorkouts,
        acceptedModifiedWorkouts: accepted,
        unchangedCount: diff.unchangedCount + ignoredModified,
        unmappedExercises: diff.unmappedExercises,
      });
      setSummary(result);
      setStage('done');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to save workouts.');
    } finally {
      setIsProcessing(false);
    }
  };

  const toggleModifiedId = (id: string) => {
    setSelectedModifiedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  return (
    <div
      className="fixed inset-0 z-50 bg-black/75 backdrop-blur-sm flex items-center justify-center p-4"
      role="dialog"
      aria-modal="true"
      aria-label="Import Heavy CSV"
    >
      <div className="w-full max-w-xl rounded-2xl border border-heavy-border bg-heavy-surface shadow-2xl overflow-hidden flex flex-col max-h-[90vh]">
        {/* Header */}
        <div className="flex items-center justify-between px-5 py-4 border-b border-heavy-border">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-lg bg-heavy-blue/15 text-heavy-blue flex items-center justify-center">
              <FileSpreadsheet className="w-4 h-4" />
            </div>
            <div>
              <h2 className="text-sm font-semibold text-white">Import Heavy CSV</h2>
              <p className="text-xs text-heavy-muted">
                Incremental sync — unchanged workouts are skipped automatically
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={handleClose}
            className="p-1.5 rounded-lg text-heavy-muted hover:text-white hover:bg-heavy-surface-elevated transition cursor-pointer"
            aria-label="Close modal"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Body */}
        <div className="p-5 overflow-y-auto space-y-4">
          {error && (
            <div className="rounded-xl border border-heavy-negative/40 bg-heavy-negative/10 p-3.5 text-xs text-red-200 flex items-start gap-2.5">
              <AlertTriangle className="w-4 h-4 text-heavy-negative shrink-0 mt-0.5" />
              <span>{error}</span>
            </div>
          )}

          {stage === 'select' && (
            <>
              <div
                onDragOver={(e) => {
                  e.preventDefault();
                  setIsDragging(true);
                }}
                onDragLeave={() => setIsDragging(false)}
                onDrop={(e) => {
                  e.preventDefault();
                  setIsDragging(false);
                  const file = e.dataTransfer.files?.[0];
                  if (file) void processFile(file);
                }}
                onClick={() => fileInputRef.current?.click()}
                className={`rounded-2xl border-2 border-dashed p-8 text-center transition cursor-pointer ${
                  isDragging
                    ? 'border-heavy-blue bg-heavy-blue/10'
                    : 'border-heavy-border hover:border-heavy-blue/60 bg-heavy-bg/50'
                }`}
              >
                <input
                  ref={fileInputRef}
                  type="file"
                  accept=".csv,text/csv"
                  className="hidden"
                  onChange={(e) => {
                    const file = e.target.files?.[0];
                    if (file) void processFile(file);
                    e.target.value = '';
                  }}
                />
                <div className="w-12 h-12 rounded-2xl bg-heavy-blue/15 text-heavy-blue mx-auto flex items-center justify-center mb-3">
                  <Upload className="w-6 h-6" />
                </div>
                <p className="text-sm font-medium text-white">
                  {isProcessing ? 'Analyzing CSV...' : 'Drop your Heavy workout_data.csv here'}
                </p>
                <p className="text-xs text-heavy-muted mt-1">
                  or click to browse from your device · Processed 100% locally
                </p>
              </div>

              <div className="rounded-xl bg-heavy-bg/60 border border-heavy-border p-3.5 text-xs text-heavy-muted space-y-1">
                <p className="font-medium text-heavy-text">How incremental upload works:</p>
                <p>• Identical workouts already stored in IndexedDB are ignored.</p>
                <p>• New workouts are added and only affected monthly caches are updated.</p>
                <p>• Edited workouts trigger a review step before overwriting.</p>
              </div>
            </>
          )}

          {stage === 'review-modified' && diff && (
            <div className="space-y-4">
              <div className="rounded-xl border border-heavy-warning/35 bg-heavy-warning/10 p-3.5 flex items-start gap-2.5">
                <GitCompare className="w-4 h-4 text-heavy-warning shrink-0 mt-0.5" />
                <div className="text-xs">
                  <p className="font-medium text-amber-200">
                    {diff.modifiedWorkouts.length} previously imported{' '}
                    {diff.modifiedWorkouts.length === 1 ? 'workout has' : 'workouts have'} changes
                  </p>
                  <p className="text-amber-100/80 mt-0.5">
                    {diff.newWorkouts.length} new · {diff.unchangedCount} unchanged. Select which edited workouts should be updated:
                  </p>
                </div>
              </div>

              <div className="flex items-center justify-between text-xs">
                <span className="text-heavy-muted">
                  {selectedModifiedIds.size} of {diff.modifiedWorkouts.length} selected to update
                </span>
                <div className="flex items-center gap-3">
                  <button
                    type="button"
                    onClick={() =>
                      setSelectedModifiedIds(
                        new Set(diff.modifiedWorkouts.map((m) => m.incoming.id)),
                      )
                    }
                    className="text-heavy-blue hover:underline cursor-pointer"
                  >
                    Select all
                  </button>
                  <button
                    type="button"
                    onClick={() => setSelectedModifiedIds(new Set())}
                    className="text-heavy-muted hover:text-white cursor-pointer"
                  >
                    Ignore all
                  </button>
                </div>
              </div>

              <div className="space-y-2 max-h-64 overflow-y-auto pr-1">
                {diff.modifiedWorkouts.map(({ existing, incoming }) => {
                  const checked = selectedModifiedIds.has(incoming.id);
                  const changes = describeWorkoutChange(existing, incoming);
                  return (
                    <label
                      key={incoming.id}
                      className={`flex items-start gap-3 rounded-xl border p-3 cursor-pointer transition ${
                        checked
                          ? 'border-heavy-blue/50 bg-heavy-blue/10'
                          : 'border-heavy-border bg-heavy-bg/50'
                      }`}
                    >
                      <input
                        type="checkbox"
                        checked={checked}
                        onChange={() => toggleModifiedId(incoming.id)}
                        className="mt-0.5 h-4 w-4 accent-heavy-blue cursor-pointer"
                      />
                      <div className="min-w-0 flex-1">
                        <div className="flex items-center justify-between gap-2">
                          <span className="text-sm font-medium text-white truncate">
                            {incoming.title}
                          </span>
                          <span className="text-[11px] font-mono text-heavy-muted shrink-0">
                            {incoming.dateKey}
                          </span>
                        </div>
                        <ul className="mt-1 space-y-0.5 text-xs text-heavy-muted">
                          {changes.map((c) => (
                            <li key={c}>• {c}</li>
                          ))}
                        </ul>
                      </div>
                    </label>
                  );
                })}
              </div>

              <div className="flex items-center justify-end gap-2.5 pt-2 border-t border-heavy-border">
                <button
                  type="button"
                  onClick={resetState}
                  className="px-4 py-2 rounded-xl text-xs font-medium text-heavy-muted hover:text-white hover:bg-heavy-surface-elevated transition cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="button"
                  disabled={isProcessing}
                  onClick={() => void handleConfirmModified()}
                  className="px-4 py-2 rounded-xl text-xs font-medium bg-heavy-blue hover:bg-heavy-blue/90 text-white transition cursor-pointer disabled:opacity-50"
                >
                  {isProcessing ? 'Saving...' : 'Confirm Import'}
                </button>
              </div>
            </div>
          )}

          {stage === 'done' && summary && (
            <div className="space-y-4">
              <div className="rounded-xl border border-heavy-positive/35 bg-heavy-positive/10 p-4 flex items-start gap-3">
                <CheckCircle2 className="w-5 h-5 text-heavy-positive shrink-0 mt-0.5" />
                <div>
                  <p className="text-sm font-semibold text-white">Import Complete</p>
                  <p className="text-xs text-emerald-200/90 mt-1">
                    {summary.added} new {summary.added === 1 ? 'workout' : 'workouts'} imported,{' '}
                    {summary.skipped} existing skipped, {summary.updated} updated.
                  </p>
                  <p className="text-[11px] text-heavy-muted mt-1 font-mono">{summary.fileName}</p>
                </div>
              </div>

              <div className="grid grid-cols-3 gap-2.5">
                <div className="rounded-xl bg-heavy-surface-elevated border border-heavy-border p-3 text-center">
                  <p className="text-lg font-bold text-heavy-positive">{summary.added}</p>
                  <p className="text-[11px] text-heavy-muted">Imported</p>
                </div>
                <div className="rounded-xl bg-heavy-surface-elevated border border-heavy-border p-3 text-center">
                  <p className="text-lg font-bold text-heavy-text">{summary.skipped}</p>
                  <p className="text-[11px] text-heavy-muted">Skipped</p>
                </div>
                <div className="rounded-xl bg-heavy-surface-elevated border border-heavy-border p-3 text-center">
                  <p className="text-lg font-bold text-heavy-blue">{summary.updated}</p>
                  <p className="text-[11px] text-heavy-muted">Updated</p>
                </div>
              </div>

              {summary.unmappedExercises.length > 0 && (
                <div className="rounded-xl border border-heavy-blue/40 bg-heavy-blue/10 p-3.5 flex items-center justify-between gap-3">
                  <div className="flex items-start gap-2.5">
                    <Sparkles className="w-4 h-4 text-heavy-blue shrink-0 mt-0.5" />
                    <div className="text-xs">
                      <p className="font-medium text-white">
                        {summary.unmappedExercises.length} unmapped{' '}
                        {summary.unmappedExercises.length === 1 ? 'exercise' : 'exercises'} found
                      </p>
                      <p className="text-heavy-muted mt-0.5">
                        Assign primary and secondary muscles so they appear on the Body & Radar charts.
                      </p>
                    </div>
                  </div>
                  <button
                    type="button"
                    onClick={() => {
                      handleClose();
                      onOpenExerciseMapper(true);
                    }}
                    className="shrink-0 px-3 py-1.5 rounded-lg bg-heavy-blue text-white text-xs font-medium hover:bg-heavy-blue/90 transition cursor-pointer"
                  >
                    Map Now
                  </button>
                </div>
              )}

              {warnings.length > 0 && (
                <details className="rounded-xl border border-heavy-border bg-heavy-bg/60 p-3 text-xs text-heavy-muted">
                  <summary className="cursor-pointer font-medium text-heavy-text">
                    {warnings.length} parser {warnings.length === 1 ? 'notice' : 'notices'}
                  </summary>
                  <ul className="mt-2 space-y-1 max-h-32 overflow-y-auto font-mono text-[11px]">
                    {warnings.slice(0, 20).map((w, idx) => (
                      <li key={idx}>• {w}</li>
                    ))}
                  </ul>
                </details>
              )}

              <div className="flex items-center justify-end gap-2.5 pt-2 border-t border-heavy-border">
                <button
                  type="button"
                  onClick={resetState}
                  className="px-3.5 py-2 rounded-xl text-xs font-medium text-heavy-muted hover:text-white hover:bg-heavy-surface-elevated transition cursor-pointer"
                >
                  Import another file
                </button>
                <button
                  type="button"
                  onClick={handleClose}
                  className="px-4 py-2 rounded-xl text-xs font-medium bg-heavy-blue hover:bg-heavy-blue/90 text-white transition cursor-pointer"
                >
                  Done
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

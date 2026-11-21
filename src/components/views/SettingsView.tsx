import { useRef, useState } from 'react';
import {
  AlertTriangle,
  CheckCircle2,
  Database,
  Download,
  Dumbbell,
  SlidersHorizontal,
  Smartphone,
  Trash2,
  Upload,
} from 'lucide-react';
import { clearWorkoutDatabase, updateUserSettings } from '@/db/database';
import {
  createBackupJsonFromDb,
  parseAndValidateBackup,
  restoreBackupToDb,
} from '@/services/backupService';
import type { ExerciseMapping, UserSettings } from '@/types/workout';

interface SettingsViewProps {
  settings: UserSettings;
  workoutCount: number;
  cachedMonthCount: number;
  mappings: ExerciseMapping[];
  unmappedCount: number;
  canInstallPwa: boolean;
  isPwaInstalled: boolean;
  onInstallPwa: () => void;
  onOpenMapper: (focusUnmapped: boolean) => void;
}

export function SettingsView({
  settings,
  workoutCount,
  cachedMonthCount,
  mappings,
  unmappedCount,
  canInstallPwa,
  isPwaInstalled,
  onInstallPwa,
  onOpenMapper,
}: SettingsViewProps) {
  const backupInputRef = useRef<HTMLInputElement>(null);
  const [restoreMode, setRestoreMode] = useState<'merge' | 'replace'>('merge');
  const [backupMessage, setBackupMessage] = useState<{
    type: 'success' | 'error';
    text: string;
  } | null>(null);
  const [confirmClear, setConfirmClear] = useState(false);

  const customMappingsCount = mappings.filter((m) => m.isCustom).length;

  const handleExportBackup = async () => {
    setBackupMessage(null);
    try {
      const { json, fileName, workoutCount: count, customMappingCount } =
        await createBackupJsonFromDb();
      const blob = new Blob([json], { type: 'application/json' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = fileName;
      a.click();
      URL.revokeObjectURL(url);
      setBackupMessage({
        type: 'success',
        text: `Exported ${count} workouts and ${customMappingCount} custom mappings to ${fileName}.`,
      });
    } catch (err) {
      setBackupMessage({
        type: 'error',
        text: err instanceof Error ? err.message : 'Failed to export backup.',
      });
    }
  };

  const handleRestoreFile = async (file: File) => {
    setBackupMessage(null);
    try {
      const text = await file.text();
      const payload = parseAndValidateBackup(text);
      const result = await restoreBackupToDb(payload, restoreMode);
      setBackupMessage({
        type: 'success',
        text: `Restored ${result.workoutsRestored} workouts and ${result.mappingsRestored} custom mappings (${restoreMode === 'replace' ? 'replaced database' : 'merged'}).`,
      });
    } catch (err) {
      setBackupMessage({
        type: 'error',
        text: err instanceof Error ? err.message : 'Failed to restore backup.',
      });
    }
  };

  return (
    <div className="space-y-4">
      {/* Calculation Preferences */}
      <section className="rounded-2xl border border-heavy-border bg-heavy-surface p-5">
        <div className="flex items-center gap-2.5 mb-4">
          <SlidersHorizontal className="w-4 h-4 text-heavy-blue" />
          <h2 className="text-sm font-semibold text-white">Calculation Preferences</h2>
        </div>

        <div className="space-y-4">
          <label className="flex items-center justify-between gap-4 cursor-pointer">
            <div>
              <p className="text-sm font-medium text-heavy-text">Include warmup sets</p>
              <p className="text-xs text-heavy-muted">
                Off by default (matches Heavy). Counts warmup sets in set totals, volume, and muscle maps when enabled.
              </p>
            </div>
            <input
              type="checkbox"
              checked={settings.includeWarmup}
              onChange={(e) =>
                void updateUserSettings({ includeWarmup: e.target.checked })
              }
              className="h-5 w-5 accent-heavy-blue rounded cursor-pointer shrink-0"
            />
          </label>

          <div className="pt-3 border-t border-heavy-border flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div>
              <p className="text-sm font-medium text-heavy-text">Body weight (kg)</p>
              <p className="text-xs text-heavy-muted">
                Optional. Estimates volume for bodyweight (BW × reps) and assisted ((BW − assist) × reps) exercises.
              </p>
            </div>
            <input
              type="number"
              min={0}
              max={300}
              step="0.5"
              placeholder="e.g. 78.5"
              value={settings.bodyWeightKg ?? ''}
              onChange={(e) => {
                const val = e.target.value.trim();
                const parsed = val === '' ? null : Number(val);
                void updateUserSettings({
                  bodyWeightKg:
                    parsed !== null && Number.isFinite(parsed) && parsed > 0
                      ? parsed
                      : null,
                });
              }}
              className="w-32 rounded-xl bg-heavy-bg border border-heavy-border px-3 py-2 text-sm text-white placeholder:text-heavy-subtle focus:outline-none focus:border-heavy-blue"
            />
          </div>

          <div className="pt-3 border-t border-heavy-border flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div>
              <p className="text-sm font-medium text-heavy-text">Secondary muscle weight</p>
              <p className="text-xs text-heavy-muted">
                Primary muscles count as 1.0 set; secondary muscles default to 0.5 sets.
              </p>
            </div>
            <div className="inline-flex rounded-xl bg-heavy-bg border border-heavy-border p-1 gap-1 self-start sm:self-auto">
              {[0.25, 0.5, 1].map((w) => (
                <button
                  key={w}
                  type="button"
                  onClick={() => void updateUserSettings({ secondaryMuscleWeight: w })}
                  className={`px-2.5 py-1 rounded-lg text-xs font-mono transition cursor-pointer ${
                    settings.secondaryMuscleWeight === w
                      ? 'bg-heavy-blue text-white'
                      : 'text-heavy-muted hover:text-white'
                  }`}
                >
                  {w}x
                </button>
              ))}
            </div>
          </div>

          <div className="pt-3 border-t border-heavy-border flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div>
              <p className="text-sm font-medium text-heavy-text">First day of week</p>
              <p className="text-xs text-heavy-muted">
                Used for weekly body distribution, streak calculation, and calendar columns.
              </p>
            </div>
            <div className="inline-flex rounded-xl bg-heavy-bg border border-heavy-border p-1 gap-1 self-start sm:self-auto">
              {(
                [
                  { value: 1, label: 'Monday' },
                  { value: 0, label: 'Sunday' },
                ] as const
              ).map((opt) => (
                <button
                  key={opt.value}
                  type="button"
                  onClick={() => void updateUserSettings({ weekStartsOn: opt.value })}
                  className={`px-3 py-1 rounded-lg text-xs font-medium transition cursor-pointer ${
                    settings.weekStartsOn === opt.value
                      ? 'bg-heavy-blue text-white'
                      : 'text-heavy-muted hover:text-white'
                  }`}
                >
                  {opt.label}
                </button>
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* Exercise Muscle Mapping Manager */}
      <section className="rounded-2xl border border-heavy-border bg-heavy-surface p-5 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div className="flex items-start gap-3">
          <div className="w-9 h-9 rounded-xl bg-heavy-blue/15 text-heavy-blue flex items-center justify-center shrink-0">
            <Dumbbell className="w-4 h-4" />
          </div>
          <div>
            <h2 className="text-sm font-semibold text-white">
              Exercise Muscle Mappings
            </h2>
            <p className="text-xs text-heavy-muted mt-0.5">
              {mappings.length} dictionary exercises ({customMappingsCount} custom)
              {unmappedCount > 0 && ` · ${unmappedCount} unmapped in your workouts`}
            </p>
          </div>
        </div>
        <button
          type="button"
          onClick={() => onOpenMapper(unmappedCount > 0)}
          className="px-4 py-2 rounded-xl bg-heavy-surface-elevated hover:bg-heavy-border text-white text-xs font-medium border border-heavy-border transition cursor-pointer shrink-0"
        >
          Manage Mappings
        </button>
      </section>

      {/* JSON Backup & Restore */}
      <section className="rounded-2xl border border-heavy-border bg-heavy-surface p-5 space-y-4">
        <div className="flex items-center gap-2.5">
          <Database className="w-4 h-4 text-heavy-blue" />
          <div>
            <h2 className="text-sm font-semibold text-white">JSON Backup &amp; Restore</h2>
            <p className="text-xs text-heavy-muted">
              Transfer your workouts, custom muscle mappings, and preferences between desktop and Android.
            </p>
          </div>
        </div>

        {backupMessage && (
          <div
            className={`rounded-xl border p-3 text-xs flex items-start gap-2 ${
              backupMessage.type === 'success'
                ? 'border-heavy-positive/40 bg-heavy-positive/10 text-emerald-200'
                : 'border-heavy-negative/40 bg-heavy-negative/10 text-red-200'
            }`}
          >
            {backupMessage.type === 'success' ? (
              <CheckCircle2 className="w-4 h-4 text-heavy-positive shrink-0 mt-0.5" />
            ) : (
              <AlertTriangle className="w-4 h-4 text-heavy-negative shrink-0 mt-0.5" />
            )}
            <span>{backupMessage.text}</span>
          </div>
        )}

        <div className="flex flex-wrap items-center justify-between gap-3 pt-1">
          <button
            type="button"
            disabled={workoutCount === 0}
            onClick={() => void handleExportBackup()}
            className="inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-heavy-blue hover:bg-heavy-blue/90 text-white text-xs font-medium transition cursor-pointer disabled:opacity-40"
          >
            <Download className="w-3.5 h-3.5" />
            Export JSON Backup
          </button>

          <div className="flex flex-wrap items-center gap-2">
            <select
              value={restoreMode}
              onChange={(e) => setRestoreMode(e.target.value as 'merge' | 'replace')}
              aria-label="Backup restore mode"
              className="rounded-xl bg-heavy-bg border border-heavy-border px-2.5 py-2 text-xs text-white focus:outline-none focus:border-heavy-blue"
            >
              <option value="merge">Merge with existing</option>
              <option value="replace">Replace all workouts</option>
            </select>

            <input
              ref={backupInputRef}
              type="file"
              accept=".json,application/json"
              className="hidden"
              onChange={(e) => {
                const file = e.target.files?.[0];
                if (file) void handleRestoreFile(file);
                e.target.value = '';
              }}
            />
            <button
              type="button"
              onClick={() => backupInputRef.current?.click()}
              className="inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-heavy-surface-elevated hover:bg-heavy-border border border-heavy-border text-white text-xs font-medium transition cursor-pointer"
            >
              <Upload className="w-3.5 h-3.5" />
              Restore JSON
            </button>
          </div>
        </div>
      </section>

      {/* PWA Install & Local Storage */}
      <section className="rounded-2xl border border-heavy-border bg-heavy-surface p-5 space-y-4">
        <div className="flex items-center justify-between gap-3 flex-wrap">
          <div className="flex items-start gap-3">
            <div className="w-9 h-9 rounded-xl bg-heavy-blue/15 text-heavy-blue flex items-center justify-center shrink-0">
              <Smartphone className="w-4 h-4" />
            </div>
            <div>
              <h2 className="text-sm font-semibold text-white">
                PWA &amp; Offline Storage
              </h2>
              <p className="text-xs text-heavy-muted mt-0.5">
                {workoutCount} workouts stored · {cachedMonthCount} monthly caches in IndexedDB
                {isPwaInstalled && ' · Installed as standalone app'}
              </p>
            </div>
          </div>

          {canInstallPwa && (
            <button
              type="button"
              onClick={onInstallPwa}
              className="px-4 py-2 rounded-xl bg-heavy-blue hover:bg-heavy-blue/90 text-white text-xs font-medium transition cursor-pointer"
            >
              Install App
            </button>
          )}
        </div>

        <div className="pt-3 border-t border-heavy-border flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div>
            <p className="text-sm font-medium text-heavy-text">
              Reimport all / Clear database
            </p>
            <p className="text-xs text-heavy-muted">
              Removes all stored workouts and monthly caches from IndexedDB (keeps your custom exercise mappings).
            </p>
          </div>
          {!confirmClear ? (
            <button
              type="button"
              disabled={workoutCount === 0}
              onClick={() => setConfirmClear(true)}
              className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl border border-heavy-negative/40 bg-heavy-negative/10 text-red-300 hover:bg-heavy-negative/20 text-xs font-medium transition cursor-pointer disabled:opacity-40 shrink-0"
            >
              <Trash2 className="w-3.5 h-3.5" />
              Clear Workouts
            </button>
          ) : (
            <div className="flex items-center gap-2 shrink-0">
              <button
                type="button"
                onClick={() => setConfirmClear(false)}
                className="px-3 py-1.5 rounded-lg text-xs text-heavy-muted hover:text-white cursor-pointer"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={async () => {
                  await clearWorkoutDatabase({ clearCustomMappings: false });
                  setConfirmClear(false);
                }}
                className="px-3.5 py-1.5 rounded-lg bg-heavy-negative text-white text-xs font-medium cursor-pointer"
              >
                Confirm Clear
              </button>
            </div>
          )}
        </div>
      </section>
    </div>
  );
}

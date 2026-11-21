import { useCallback, useEffect, useMemo, useState } from 'react';
import { useLiveQuery } from 'dexie-react-hooks';
import { AlertTriangle, CheckCircle2, Upload } from 'lucide-react';
import { AppShell } from '@/components/layout/AppShell';
import { CsvImportModal } from '@/components/import/CsvImportModal';
import { ExerciseMappingModal } from '@/components/exercises/ExerciseMappingModal';
import { OverviewHubView } from '@/components/views/OverviewHubView';
import { MuscleDistributionView } from '@/components/views/MuscleDistributionView';
import { BodyDistributionView } from '@/components/views/BodyDistributionView';
import { MainExercisesView } from '@/components/views/MainExercisesView';
import { CalendarView } from '@/components/views/CalendarView';
import { SettingsView } from '@/components/views/SettingsView';
import { ensureExerciseDictionarySeeded } from '@/data/defaultExerciseDictionary';
import { db, DEFAULT_USER_SETTINGS, getOrInitSettings } from '@/db/database';
import { usePwaStatus } from '@/hooks/usePwaInstall';
import type { AppTab, ExerciseMapping } from '@/types/workout';

export function App() {
  const [activeTab, setActiveTab] = useState<AppTab>('overview');
  const [importOpen, setImportOpen] = useState(false);
  const [mapperOpen, setMapperOpen] = useState(false);
  const [mapperFilter, setMapperFilter] = useState<'all' | 'unmapped' | 'custom' | 'used'>(
    'used',
  );
  const [jumpToExercise, setJumpToExercise] = useState<string | null>(null);

  const pwa = usePwaStatus();

  const workouts = useLiveQuery(
    () => db.workouts.orderBy('startTime').reverse().toArray(),
    [],
    [],
  );
  const mappings = useLiveQuery(() => db.exerciseMappings.toArray(), [], []);
  const cachedMonthCount = useLiveQuery(() => db.monthlyCache.count(), [], 0);
  const settings =
    useLiveQuery(() => db.settings.get('default'), []) ?? DEFAULT_USER_SETTINGS;

  useEffect(() => {
    void getOrInitSettings();
    void ensureExerciseDictionarySeeded();
  }, []);

  const mappingsByTitle = useMemo(() => {
    const map = new Map<string, ExerciseMapping>();
    for (const m of mappings) map.set(m.exerciseTitle, m);
    return map;
  }, [mappings]);

  const unmappedList = useMemo(() => {
    const unmapped = new Set<string>();
    for (const w of workouts) {
      for (const s of w.sets) {
        if (!mappingsByTitle.has(s.exerciseTitle)) {
          unmapped.add(s.exerciseTitle);
        }
      }
    }
    return [...unmapped].sort((a, b) => a.localeCompare(b));
  }, [workouts, mappingsByTitle]);

  const openMapper = useCallback((focusUnmapped = false) => {
    setMapperFilter(focusUnmapped ? 'unmapped' : 'used');
    setMapperOpen(true);
  }, []);

  const handleSelectExerciseFromCalendar = useCallback((exerciseTitle: string) => {
    setJumpToExercise(exerciseTitle);
    setActiveTab('exercises');
  }, []);

  const clearJumpToExercise = useCallback(() => {
    setJumpToExercise(null);
  }, []);

  const renderMainContent = () => {
    if (activeTab === 'settings') {
      return (
        <SettingsView
          settings={settings}
          workoutCount={workouts.length}
          cachedMonthCount={cachedMonthCount}
          mappings={mappings}
          unmappedCount={unmappedList.length}
          canInstallPwa={pwa.canInstall}
          isPwaInstalled={pwa.isInstalled}
          onInstallPwa={() => void pwa.promptInstall()}
          onOpenMapper={openMapper}
        />
      );
    }

    if (workouts.length === 0) {
      return (
        <section className="rounded-2xl border border-heavy-border bg-heavy-surface p-8 text-center">
          <div className="w-14 h-14 rounded-2xl bg-heavy-blue/15 text-heavy-blue mx-auto flex items-center justify-center mb-4">
            <Upload className="w-7 h-7" />
          </div>
          <h2 className="text-lg font-semibold text-white">
            Import your Heavy CSV to begin
          </h2>
          <p className="text-sm text-heavy-muted mt-1.5 max-w-md mx-auto">
            Upload your Heavy <code className="text-heavy-text">workout_data.csv</code> export. All parsing, deduplication, and analytics happen 100% locally in your browser.
          </p>
          <button
            type="button"
            onClick={() => setImportOpen(true)}
            className="mt-5 inline-flex items-center gap-2 px-5 py-2.5 rounded-xl bg-heavy-blue hover:bg-heavy-blue/90 text-white text-sm font-medium transition cursor-pointer shadow-lg shadow-heavy-blue/20"
          >
            <Upload className="w-4 h-4" />
            Import Heavy CSV
          </button>
        </section>
      );
    }

    switch (activeTab) {
      case 'overview':
        return (
          <OverviewHubView
            workouts={workouts}
            mappingsByTitle={mappingsByTitle}
            settings={settings}
            onNavigate={setActiveTab}
          />
        );
      case 'distribution':
        return (
          <MuscleDistributionView
            workouts={workouts}
            mappingsByTitle={mappingsByTitle}
            settings={settings}
          />
        );
      case 'body':
        return (
          <BodyDistributionView
            workouts={workouts}
            mappingsByTitle={mappingsByTitle}
            settings={settings}
          />
        );
      case 'exercises':
        return (
          <MainExercisesView
            workouts={workouts}
            mappingsByTitle={mappingsByTitle}
            settings={settings}
            initialSelectedExercise={jumpToExercise}
            onClearInitialExercise={clearJumpToExercise}
          />
        );
      case 'calendar':
        return (
          <CalendarView
            workouts={workouts}
            mappingsByTitle={mappingsByTitle}
            settings={settings}
            onSelectExercise={handleSelectExerciseFromCalendar}
          />
        );
    }
  };

  return (
    <AppShell
      activeTab={activeTab}
      onSelectTab={setActiveTab}
      workoutCount={workouts.length}
      onOpenImport={() => setImportOpen(true)}
      canInstallPwa={pwa.canInstall}
      isOnline={pwa.isOnline}
      onInstallPwa={() => void pwa.promptInstall()}
    >
      <div className="space-y-5">
        {/* Compact Last Import Strip on Overview */}
        {activeTab === 'overview' && settings.lastImportSummary && workouts.length > 0 && (
          <div className="rounded-2xl border border-heavy-border bg-heavy-surface px-4 py-2.5 flex flex-wrap items-center justify-between gap-2 text-xs">
            <div className="flex items-center gap-2">
              <CheckCircle2 className="w-4 h-4 text-heavy-positive shrink-0" />
              <span className="text-heavy-muted">
                Synced <span className="font-mono text-heavy-text">{settings.lastImportSummary.fileName}</span>:{' '}
                <strong className="text-white">{settings.lastImportSummary.added}</strong> added ·{' '}
                <strong className="text-white">{settings.lastImportSummary.skipped}</strong> skipped ·{' '}
                <strong className="text-white">{settings.lastImportSummary.updated}</strong> updated
              </span>
            </div>
            <button
              type="button"
              onClick={() => openMapper(false)}
              className="text-heavy-blue hover:underline font-medium cursor-pointer"
            >
              Muscle Mappings
            </button>
          </div>
        )}

        {/* Unmapped Exercises Alert */}
        {unmappedList.length > 0 && activeTab !== 'settings' && (
          <div className="rounded-2xl border border-heavy-warning/40 bg-heavy-warning/10 p-3.5 flex flex-wrap items-center justify-between gap-3">
            <div className="flex items-start gap-2.5">
              <AlertTriangle className="w-4 h-4 text-heavy-warning shrink-0 mt-0.5" />
              <div className="text-xs">
                <p className="font-medium text-amber-200">
                  {unmappedList.length} exercises need muscle mapping
                </p>
                <p className="text-amber-100/80 mt-0.5">
                  {unmappedList.slice(0, 4).join(', ')}
                  {unmappedList.length > 4 && '…'}
                </p>
              </div>
            </div>
            <button
              type="button"
              onClick={() => openMapper(true)}
              className="px-3 py-1.5 rounded-lg bg-heavy-warning text-black font-semibold text-xs cursor-pointer"
            >
              Map Exercises
            </button>
          </div>
        )}

        {renderMainContent()}
      </div>

      <CsvImportModal
        open={importOpen}
        onClose={() => setImportOpen(false)}
        onOpenExerciseMapper={(focusUnmapped) => openMapper(focusUnmapped)}
      />

      <ExerciseMappingModal
        open={mapperOpen}
        initialFilter={mapperFilter}
        onClose={() => setMapperOpen(false)}
      />
    </AppShell>
  );
}

export default App;

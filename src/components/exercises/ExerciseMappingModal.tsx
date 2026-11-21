import { useEffect, useMemo, useState } from 'react';
import { useLiveQuery } from 'dexie-react-hooks';
import {
  Check,
  Dumbbell,
  RotateCcw,
  Search,
  Sparkles,
  X,
} from 'lucide-react';
import { DETAILED_MUSCLES } from '@/constants/muscles';
import {
  inferCategoryFromSets,
  lookupDefaultExercise,
} from '@/data/defaultExerciseDictionary';
import { db } from '@/db/database';
import type {
  DetailedMuscle,
  ExerciseCategory,
  ExerciseMapping,
  WorkoutSet,
} from '@/types/workout';

interface ExerciseMappingModalProps {
  open: boolean;
  initialFilter?: 'all' | 'unmapped' | 'custom' | 'used';
  onClose: () => void;
}

const CATEGORIES: Array<{ value: ExerciseCategory; label: string }> = [
  { value: 'weighted', label: 'Weighted' },
  { value: 'bodyweight', label: 'Bodyweight' },
  { value: 'assisted', label: 'Assisted' },
  { value: 'duration', label: 'Duration / Isometric' },
  { value: 'cardio', label: 'Cardio' },
];

export function ExerciseMappingModal({
  open,
  initialFilter = 'used',
  onClose,
}: ExerciseMappingModalProps) {
  const [search, setSearch] = useState('');
  const [filterMode, setFilterMode] = useState<'all' | 'unmapped' | 'custom' | 'used'>(
    initialFilter,
  );

  useEffect(() => {
    if (open) {
      setFilterMode(initialFilter);
    }
  }, [open, initialFilter]);
  const [selectedTitle, setSelectedTitle] = useState<string | null>(null);
  const [draftPrimary, setDraftPrimary] = useState<DetailedMuscle | ''>('');
  const [draftSecondary, setDraftSecondary] = useState<DetailedMuscle[]>([]);
  const [draftCategory, setDraftCategory] = useState<ExerciseCategory>('weighted');
  const [savedNotice, setSavedNotice] = useState(false);

  const workouts = useLiveQuery(() => db.workouts.toArray(), [], []);
  const mappings = useLiveQuery(() => db.exerciseMappings.toArray(), [], []);

  const { allEntries, unmappedCount } = useMemo(() => {
    const mappingMap = new Map<string, ExerciseMapping>();
    for (const m of mappings) {
      mappingMap.set(m.exerciseTitle, m);
    }

    const usedSetsByExercise = new Map<string, WorkoutSet[]>();
    for (const w of workouts) {
      for (const s of w.sets) {
        const list = usedSetsByExercise.get(s.exerciseTitle) ?? [];
        list.push(s);
        usedSetsByExercise.set(s.exerciseTitle, list);
      }
    }

    const allTitles = new Set<string>([
      ...mappingMap.keys(),
      ...usedSetsByExercise.keys(),
    ]);

    let unmapped = 0;
    const entries = [...allTitles]
      .map((title) => {
        const mapping = mappingMap.get(title);
        const sets = usedSetsByExercise.get(title) ?? [];
        const isUnmapped = !mapping;
        if (isUnmapped) unmapped++;
        return {
          title,
          mapping,
          setCount: sets.length,
          sampleSets: sets,
          isUnmapped,
          isUsed: sets.length > 0,
        };
      })
      .sort((a, b) => {
        if (a.isUnmapped !== b.isUnmapped) return a.isUnmapped ? -1 : 1;
        if (b.setCount !== a.setCount) return b.setCount - a.setCount;
        return a.title.localeCompare(b.title);
      });

    return { allEntries: entries, unmappedCount: unmapped };
  }, [workouts, mappings]);

  const filteredEntries = useMemo(() => {
    const q = search.trim().toLowerCase();
    return allEntries.filter((e) => {
      if (filterMode === 'unmapped' && !e.isUnmapped) return false;
      if (filterMode === 'custom' && !e.mapping?.isCustom) return false;
      if (filterMode === 'used' && !e.isUsed) return false;
      if (q && !e.title.toLowerCase().includes(q)) {
        const primary = e.mapping?.primaryMuscle?.toLowerCase() ?? '';
        if (!primary.includes(q)) return false;
      }
      return true;
    });
  }, [allEntries, filterMode, search]);

  if (!open) return null;

  const selectExercise = (entry: (typeof allEntries)[number]) => {
    setSelectedTitle(entry.title);
    setSavedNotice(false);
    if (entry.mapping) {
      setDraftPrimary(entry.mapping.primaryMuscle ?? '');
      setDraftSecondary([...entry.mapping.secondaryMuscles]);
      setDraftCategory(entry.mapping.category);
    } else {
      const fallback = lookupDefaultExercise(entry.title);
      setDraftPrimary(fallback?.primaryMuscle ?? '');
      setDraftSecondary(fallback ? [...fallback.secondaryMuscles] : []);
      setDraftCategory(
        fallback?.category ?? inferCategoryFromSets(entry.title, entry.sampleSets),
      );
    }
  };

  const toggleSecondary = (muscle: DetailedMuscle) => {
    if (muscle === draftPrimary) return;
    setDraftSecondary((prev) =>
      prev.includes(muscle) ? prev.filter((m) => m !== muscle) : [...prev, muscle],
    );
  };

  const handleSave = async () => {
    if (!selectedTitle) return;
    const primary = draftPrimary === '' ? null : draftPrimary;
    const cleanedSecondary = draftSecondary.filter((m) => m !== primary);
    await db.exerciseMappings.put({
      exerciseTitle: selectedTitle,
      primaryMuscle: primary,
      secondaryMuscles: cleanedSecondary,
      category: draftCategory,
      isCustom: true,
      updatedAt: Date.now(),
    });
    setSavedNotice(true);
    setTimeout(() => setSavedNotice(false), 1800);
  };

  const handleResetDefault = async () => {
    if (!selectedTitle) return;
    const def = lookupDefaultExercise(selectedTitle);
    if (!def) return;
    await db.exerciseMappings.put({
      exerciseTitle: selectedTitle,
      primaryMuscle: def.primaryMuscle,
      secondaryMuscles: [...def.secondaryMuscles],
      category: def.category,
      isCustom: false,
      updatedAt: Date.now(),
    });
    setDraftPrimary(def.primaryMuscle ?? '');
    setDraftSecondary([...def.secondaryMuscles]);
    setDraftCategory(def.category);
    setSavedNotice(true);
    setTimeout(() => setSavedNotice(false), 1800);
  };

  const selectedEntry = allEntries.find((e) => e.title === selectedTitle) ?? null;
  const hasDefault = selectedTitle ? Boolean(lookupDefaultExercise(selectedTitle)) : false;

  return (
    <div
      className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-3 md:p-6"
      role="dialog"
      aria-modal="true"
      aria-label="Exercise Muscle Mapping"
    >
      <div className="w-full max-w-4xl h-[86vh] rounded-2xl border border-heavy-border bg-heavy-surface shadow-2xl overflow-hidden flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between px-5 py-4 border-b border-heavy-border shrink-0">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-lg bg-heavy-blue/15 text-heavy-blue flex items-center justify-center">
              <Dumbbell className="w-4 h-4" />
            </div>
            <div>
              <h2 className="text-sm font-semibold text-white">
                Exercise Muscle Mappings
              </h2>
              <p className="text-xs text-heavy-muted">
                Primary counts 1.0x · Secondary counts 0.5x · Saved locally in IndexedDB
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-1.5 rounded-lg text-heavy-muted hover:text-white hover:bg-heavy-surface-elevated transition cursor-pointer"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Content Split */}
        <div className="flex-1 min-h-0 grid grid-cols-1 md:grid-cols-12">
          {/* Left List */}
          <div className="md:col-span-5 border-b md:border-b-0 md:border-r border-heavy-border flex flex-col min-h-0">
            <div className="p-3 space-y-2.5 border-b border-heavy-border">
              <div className="relative">
                <Search className="w-4 h-4 text-heavy-subtle absolute left-3 top-1/2 -translate-y-1/2" />
                <input
                  type="text"
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  placeholder="Search exercise or muscle..."
                  className="w-full pl-9 pr-3 py-2 rounded-xl bg-heavy-bg border border-heavy-border text-xs text-white placeholder:text-heavy-subtle focus:outline-none focus:border-heavy-blue"
                />
              </div>

              <div className="flex items-center gap-1.5 flex-wrap">
                {(
                  [
                    { id: 'used', label: 'In My CSV' },
                    { id: 'unmapped', label: `Unmapped (${unmappedCount})` },
                    { id: 'custom', label: 'Custom' },
                    { id: 'all', label: 'All Dictionary' },
                  ] as const
                ).map((tab) => (
                  <button
                    key={tab.id}
                    type="button"
                    onClick={() => setFilterMode(tab.id)}
                    className={`px-2.5 py-1 rounded-lg text-[11px] font-medium transition cursor-pointer ${
                      filterMode === tab.id
                        ? 'bg-heavy-blue text-white'
                        : 'bg-heavy-bg text-heavy-muted hover:text-white border border-heavy-border'
                    }`}
                  >
                    {tab.label}
                  </button>
                ))}
              </div>
            </div>

            <div className="flex-1 overflow-y-auto divide-y divide-heavy-border/60">
              {filteredEntries.length === 0 ? (
                <div className="p-6 text-center text-xs text-heavy-muted">
                  No exercises match this filter.
                </div>
              ) : (
                filteredEntries.map((entry) => {
                  const isSelected = entry.title === selectedTitle;
                  return (
                    <button
                      key={entry.title}
                      type="button"
                      onClick={() => selectExercise(entry)}
                      className={`w-full text-left px-3.5 py-2.5 transition cursor-pointer flex items-center justify-between gap-2 ${
                        isSelected
                          ? 'bg-heavy-blue/15 border-l-2 border-heavy-blue'
                          : 'hover:bg-heavy-surface-elevated/70'
                      }`}
                    >
                      <div className="min-w-0">
                        <p className="text-xs font-medium text-white truncate">
                          {entry.title}
                        </p>
                        <p className="text-[11px] text-heavy-muted truncate mt-0.5">
                          {entry.isUnmapped ? (
                            <span className="text-heavy-warning">Unmapped</span>
                          ) : entry.mapping?.primaryMuscle ? (
                            <>
                              {entry.mapping.primaryMuscle}
                              {entry.mapping.secondaryMuscles.length > 0 &&
                                ` + ${entry.mapping.secondaryMuscles.join(', ')}`}
                            </>
                          ) : (
                            <span className="capitalize">
                              {entry.mapping?.category ?? 'Cardio / None'}
                            </span>
                          )}
                        </p>
                      </div>
                      <div className="flex items-center gap-1.5 shrink-0">
                        {entry.mapping?.isCustom && (
                          <span className="px-1.5 py-0.5 rounded text-[10px] bg-heavy-blue/20 text-heavy-blue">
                            Custom
                          </span>
                        )}
                        {entry.setCount > 0 && (
                          <span className="text-[11px] font-mono text-heavy-subtle">
                            {entry.setCount}s
                          </span>
                        )}
                      </div>
                    </button>
                  );
                })
              )}
            </div>
          </div>

          {/* Right Editor */}
          <div className="md:col-span-7 p-5 overflow-y-auto">
            {!selectedEntry ? (
              <div className="h-full flex flex-col items-center justify-center text-center text-heavy-muted p-6">
                <Sparkles className="w-8 h-8 text-heavy-blue/60 mb-3" />
                <p className="text-sm font-medium text-white">
                  Select an exercise to edit its muscle mapping
                </p>
                <p className="text-xs text-heavy-muted mt-1 max-w-sm">
                  Changes immediately apply to Muscle Distribution, Body Map, and Volume calculations.
                </p>
              </div>
            ) : (
              <div className="space-y-5">
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <h3 className="text-base font-semibold text-white">
                      {selectedEntry.title}
                    </h3>
                    <p className="text-xs text-heavy-muted mt-0.5">
                      {selectedEntry.setCount > 0
                        ? `${selectedEntry.setCount} sets recorded in your history`
                        : 'Built-in dictionary exercise'}
                    </p>
                  </div>
                  {hasDefault && selectedEntry.mapping?.isCustom && (
                    <button
                      type="button"
                      onClick={() => void handleResetDefault()}
                      className="inline-flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-xs text-heavy-muted hover:text-white border border-heavy-border hover:bg-heavy-surface-elevated transition cursor-pointer"
                    >
                      <RotateCcw className="w-3.5 h-3.5" />
                      Reset default
                    </button>
                  )}
                </div>

                {/* Category */}
                <div>
                  <label className="block text-xs font-medium text-heavy-muted mb-2">
                    Exercise Category (affects volume & 1RM rules)
                  </label>
                  <div className="flex flex-wrap gap-2">
                    {CATEGORIES.map((cat) => (
                      <button
                        key={cat.value}
                        type="button"
                        onClick={() => setDraftCategory(cat.value)}
                        className={`px-3 py-1.5 rounded-xl text-xs font-medium border transition cursor-pointer ${
                          draftCategory === cat.value
                            ? 'bg-heavy-blue/20 border-heavy-blue text-white'
                            : 'bg-heavy-bg border-heavy-border text-heavy-muted hover:text-white'
                        }`}
                      >
                        {cat.label}
                      </button>
                    ))}
                  </div>
                </div>

                {/* Primary Muscle */}
                <div>
                  <label
                    htmlFor="primary-muscle-select"
                    className="block text-xs font-medium text-heavy-muted mb-2"
                  >
                    Primary Muscle (1.0 set per working set)
                  </label>
                  <select
                    id="primary-muscle-select"
                    value={draftPrimary}
                    onChange={(e) => {
                      const next = e.target.value as DetailedMuscle | '';
                      setDraftPrimary(next);
                      if (next) {
                        setDraftSecondary((prev) => prev.filter((m) => m !== next));
                      }
                    }}
                    className="w-full rounded-xl bg-heavy-bg border border-heavy-border px-3 py-2.5 text-sm text-white focus:outline-none focus:border-heavy-blue"
                  >
                    <option value="">None (Cardio / General Warmup)</option>
                    {DETAILED_MUSCLES.map((muscle) => (
                      <option key={muscle} value={muscle}>
                        {muscle}
                      </option>
                    ))}
                  </select>
                </div>

                {/* Secondary Muscles */}
                <div>
                  <label className="block text-xs font-medium text-heavy-muted mb-2">
                    Secondary Muscles (0.5 sets per working set)
                  </label>
                  <div className="flex flex-wrap gap-1.5">
                    {DETAILED_MUSCLES.map((muscle) => {
                      const isPrimary = muscle === draftPrimary;
                      const isSelected = draftSecondary.includes(muscle);
                      return (
                        <button
                          key={muscle}
                          type="button"
                          disabled={isPrimary}
                          onClick={() => toggleSecondary(muscle)}
                          className={`px-2.5 py-1 rounded-lg text-xs border transition ${
                            isPrimary
                              ? 'opacity-35 cursor-not-allowed bg-heavy-bg border-heavy-border text-heavy-subtle'
                              : isSelected
                                ? 'bg-heavy-blue/20 border-heavy-blue text-heavy-blue-bright cursor-pointer'
                                : 'bg-heavy-bg border-heavy-border text-heavy-muted hover:text-white cursor-pointer'
                          }`}
                        >
                          {muscle}
                        </button>
                      );
                    })}
                  </div>
                </div>

                <div className="pt-3 border-t border-heavy-border flex items-center justify-between gap-3">
                  {savedNotice ? (
                    <span className="inline-flex items-center gap-1.5 text-xs text-heavy-positive font-medium">
                      <Check className="w-4 h-4" />
                      Saved locally
                    </span>
                  ) : (
                    <span className="text-xs text-heavy-subtle">
                      Stored in IndexedDB (survives re-imports)
                    </span>
                  )}
                  <button
                    type="button"
                    onClick={() => void handleSave()}
                    className="px-4 py-2 rounded-xl bg-heavy-blue hover:bg-heavy-blue/90 text-white text-xs font-medium transition cursor-pointer"
                  >
                    Save Mapping
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

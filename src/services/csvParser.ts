import Papa from 'papaparse';
import type { SetType, Workout, WorkoutSet } from '@/types/workout';

const MONTH_INDEX: Record<string, number> = {
  jan: 0,
  feb: 1,
  mar: 2,
  apr: 3,
  may: 4,
  jun: 5,
  jul: 6,
  aug: 7,
  sep: 8,
  oct: 9,
  nov: 10,
  dec: 11,
};

const VALID_SET_TYPES = new Set<SetType>(['normal', 'warmup', 'dropset', 'failure']);

const REQUIRED_COLUMNS = [
  'title',
  'start_time',
  'end_time',
  'exercise_title',
  'set_index',
  'set_type',
] as const;

export interface ParsedTimestamp {
  epochMs: number;
  dateKey: string;
  monthKey: string;
  year: number;
  isoKey: string;
}

export interface CsvParseResult {
  workouts: Workout[];
  totalRows: number;
  skippedRows: number;
  warnings: string[];
}

function pad2(n: number): string {
  return String(n).padStart(2, '0');
}

/**
 * Parses Heavy timestamp strings like "19 Nov 2026, 20:52" or "9 Jul 2025, 15:30".
 * Uses local wall-clock calendar fields so dateKey/monthKey never drift by timezone.
 */
export function parseHeavyTimestamp(raw: string): ParsedTimestamp | null {
  const trimmed = raw.trim();
  const match = trimmed.match(/^(\d{1,2})\s+([A-Za-z]{3})\s+(\d{4}),\s*(\d{1,2}):(\d{2})$/);
  if (!match) return null;

  const day = Number(match[1]);
  const monthIdx = MONTH_INDEX[match[2].toLowerCase()];
  const year = Number(match[3]);
  const hour = Number(match[4]);
  const minute = Number(match[5]);

  if (monthIdx === undefined || day < 1 || day > 31 || hour > 23 || minute > 59) {
    return null;
  }

  const date = new Date(year, monthIdx, day, hour, minute, 0, 0);
  if (Number.isNaN(date.getTime())) return null;

  const monthStr = pad2(monthIdx + 1);
  const dayStr = pad2(day);
  const hourStr = pad2(hour);
  const minStr = pad2(minute);

  return {
    epochMs: date.getTime(),
    dateKey: `${year}-${monthStr}-${dayStr}`,
    monthKey: `${year}-${monthStr}`,
    year,
    isoKey: `${year}-${monthStr}-${dayStr}T${hourStr}:${minStr}`,
  };
}

function parseOptionalNumber(raw: unknown): number | null {
  if (raw === undefined || raw === null) return null;
  const s = String(raw).trim();
  if (s === '') return null;
  const n = Number(s);
  return Number.isFinite(n) ? n : null;
}

function parseOptionalString(raw: unknown): string | null {
  if (raw === undefined || raw === null) return null;
  const s = String(raw).trim();
  return s === '' ? null : s;
}

/**
 * Deterministic 64-bit FNV-1a hash (synchronous across browser & Vitest/Node).
 */
export function fnv1a64Hex(input: string): string {
  let hash = 0xcbf29ce484222325n;
  const prime = 0x100000001b3n;
  const mask = 0xffffffffffffffffn;
  for (let i = 0; i < input.length; i++) {
    hash ^= BigInt(input.charCodeAt(i));
    hash = (hash * prime) & mask;
  }
  return hash.toString(16).padStart(16, '0');
}

export function computeWorkoutContentHash(input: {
  title: string;
  startTime: number;
  endTime: number;
  description: string | null;
  sets: WorkoutSet[];
}): string {
  const canonicalSets = input.sets
    .map((s) =>
      [
        s.rowIndex,
        s.blockIndex,
        s.exerciseTitle,
        s.setIndex,
        s.setType,
        s.weightKg ?? '',
        s.reps ?? '',
        s.distanceKm ?? '',
        s.durationSeconds ?? '',
        s.rpe ?? '',
        s.supersetId ?? '',
        s.exerciseNotes ?? '',
      ].join('|'),
    )
    .join('\n');

  const payload = [
    input.title,
    String(input.startTime),
    String(input.endTime),
    input.description ?? '',
    canonicalSets,
  ].join('\u001f');

  return fnv1a64Hex(payload);
}

interface RawCsvRow {
  title?: string;
  start_time?: string;
  end_time?: string;
  description?: string;
  exercise_title?: string;
  superset_id?: string;
  exercise_notes?: string;
  set_index?: string;
  set_type?: string;
  weight_kg?: string;
  reps?: string;
  distance_km?: string;
  duration_seconds?: string;
  rpe?: string;
}

interface SessionAccumulator {
  rawSessionKey: string;
  startParsed: ParsedTimestamp;
  endParsed: ParsedTimestamp;
  title: string;
  description: string | null;
  sets: WorkoutSet[];
  exerciseBlockCount: Map<string, number>;
  lastExerciseTitle: string | null;
  lastSetIndex: number | null;
}

/**
 * Parses a Heavy exported CSV string into strongly typed Workout objects.
 *
 * Handles real-world Heavy export quirks:
 * - Mixed CRLF (\r\n) and lone LF (\n) pagination boundaries
 * - UTF-8 BOM
 * - Emojis in workout titles
 * - Repeated exercises within the same workout whose set_index restarts at 0
 * - Optional RPE, description, superset_id, exercise_notes, distance_km
 * - Decimal weights (e.g. 37.5) and decimal RPE (e.g. 9.5)
 */
export function parseHeavyCsv(csvText: string): CsvParseResult {
  const warnings: string[] = [];

  // Strip BOM and normalize mixed CRLF/CR/LF line endings (critical for Heavy exports!)
  const normalized = csvText
    .replace(/^\uFEFF/, '')
    .replace(/\r\n/g, '\n')
    .replace(/\r/g, '\n');

  const parsed = Papa.parse<RawCsvRow>(normalized, {
    header: true,
    skipEmptyLines: 'greedy',
    newline: '\n',
  });

  const headers = parsed.meta.fields ?? [];
  const missingHeaders = REQUIRED_COLUMNS.filter((col) => !headers.includes(col));
  if (missingHeaders.length > 0) {
    throw new Error(
      `Invalid Heavy CSV format. Missing required columns: ${missingHeaders.join(', ')}`,
    );
  }

  for (const err of parsed.errors) {
    warnings.push(`CSV row ${err.row ?? '?'}: ${err.message}`);
  }

  const sessionsMap = new Map<string, SessionAccumulator>();
  const sessionsOrder: SessionAccumulator[] = [];
  let skippedRows = 0;

  for (let i = 0; i < parsed.data.length; i++) {
    const row = parsed.data[i];
    const startRaw = (row.start_time ?? '').trim();
    const endRaw = (row.end_time ?? '').trim();
    const exerciseTitle = (row.exercise_title ?? '').trim();

    if (!startRaw || !exerciseTitle) {
      skippedRows++;
      warnings.push(`Row ${i + 2}: missing start_time or exercise_title, skipped.`);
      continue;
    }

    const startParsed = parseHeavyTimestamp(startRaw);
    const endParsed = parseHeavyTimestamp(endRaw) ?? startParsed;

    if (!startParsed || !endParsed) {
      skippedRows++;
      warnings.push(`Row ${i + 2}: invalid timestamp "${startRaw}", skipped.`);
      continue;
    }

    const title = (row.title ?? '').trim() || 'Workout';
    const description = parseOptionalString(row.description);
    const rawSessionKey = `${startParsed.isoKey}|${endParsed.isoKey}|${title}`;

    let acc = sessionsMap.get(rawSessionKey);
    if (!acc) {
      acc = {
        rawSessionKey,
        startParsed,
        endParsed,
        title,
        description,
        sets: [],
        exerciseBlockCount: new Map(),
        lastExerciseTitle: null,
        lastSetIndex: null,
      };
      sessionsMap.set(rawSessionKey, acc);
      sessionsOrder.push(acc);
    } else if (!acc.description && description) {
      acc.description = description;
    }

    const setIndexNum = parseOptionalNumber(row.set_index) ?? 0;
    const rawSetType = (row.set_type ?? 'normal').trim().toLowerCase() as SetType;
    const setType: SetType = VALID_SET_TYPES.has(rawSetType) ? rawSetType : 'normal';
    if (!VALID_SET_TYPES.has(rawSetType)) {
      warnings.push(`Row ${i + 2}: unknown set_type "${row.set_type}", defaulted to "normal".`);
    }

    // Track repeated blocks of the same exercise within a workout
    const prevBlockCount = acc.exerciseBlockCount.get(exerciseTitle) ?? 0;
    let blockIndex: number;
    if (prevBlockCount === 0) {
      blockIndex = 0;
      acc.exerciseBlockCount.set(exerciseTitle, 1);
    } else if (
      acc.lastExerciseTitle !== exerciseTitle ||
      (acc.lastSetIndex !== null && setIndexNum <= acc.lastSetIndex)
    ) {
      blockIndex = prevBlockCount;
      acc.exerciseBlockCount.set(exerciseTitle, prevBlockCount + 1);
    } else {
      blockIndex = prevBlockCount - 1;
    }

    acc.sets.push({
      rowIndex: acc.sets.length,
      exerciseTitle,
      blockIndex,
      setIndex: setIndexNum,
      setType,
      weightKg: parseOptionalNumber(row.weight_kg),
      reps: parseOptionalNumber(row.reps),
      distanceKm: parseOptionalNumber(row.distance_km),
      durationSeconds: parseOptionalNumber(row.duration_seconds),
      rpe: parseOptionalNumber(row.rpe),
      supersetId: parseOptionalString(row.superset_id),
      exerciseNotes: parseOptionalString(row.exercise_notes),
    });

    acc.lastExerciseTitle = exerciseTitle;
    acc.lastSetIndex = setIndexNum;
  }

  // Assign deterministic IDs based on startTime isoKey (disambiguated only if multiple sessions share the exact same minute)
  const idUsage = new Map<string, number>();
  const now = Date.now();
  const workouts: Workout[] = sessionsOrder.map((acc) => {
    const baseId = acc.startParsed.isoKey;
    const count = idUsage.get(baseId) ?? 0;
    idUsage.set(baseId, count + 1);
    const id = count === 0 ? baseId : `${baseId}#${count + 1}`;

    const durationSeconds = Math.max(
      0,
      Math.round((acc.endParsed.epochMs - acc.startParsed.epochMs) / 1000),
    );

    const contentHash = computeWorkoutContentHash({
      title: acc.title,
      startTime: acc.startParsed.epochMs,
      endTime: acc.endParsed.epochMs,
      description: acc.description,
      sets: acc.sets,
    });

    return {
      id,
      contentHash,
      title: acc.title,
      description: acc.description,
      startTime: acc.startParsed.epochMs,
      endTime: acc.endParsed.epochMs,
      durationSeconds,
      dateKey: acc.startParsed.dateKey,
      monthKey: acc.startParsed.monthKey,
      year: acc.startParsed.year,
      sets: acc.sets,
      importedAt: now,
      updatedAt: now,
    };
  });

  // Sort newest first
  workouts.sort((a, b) => b.startTime - a.startTime);

  return {
    workouts,
    totalRows: parsed.data.length,
    skippedRows,
    warnings,
  };
}

/**
 * THE ONLY FILE THAT READS OR WRITES HABIT DATA.
 *
 * Pages and hooks must go through these functions and never call Supabase (or localStorage)
 * directly. Database rows use snake_case; everything outside this file uses the camelCase
 * types from ./types. The mapping happens here.
 *
 * Schema: supabase/migrations/. Row Level Security limits every query to the signed-in user,
 * and `user_id` is filled in by the database (default auth.uid()), so it never appears here.
 */
import { supabase } from './supabase'
import { CUSTOM_ID_PREFIX } from './exercises'
import type { Exercise } from './program'
import type {
  Completion,
  CustomExerciseInput,
  Field,
  DateKey,
  Habit,
  HabitInput,
  ProgramSettings,
  SessionKind,
  WorkoutSession,
  WorkoutSessionUpdate,
  WorkoutSet,
  WorkoutSetInput,
} from './types'

// ---------- row types and mapping (private) ----------

interface HabitRow {
  id: string
  name: string
  color: string
  frequency_type: 'daily' | 'weekly'
  times_per_week: number | null
  created_at: string
}

interface CompletionRow {
  id: string
  habit_id: string
  /** Postgres `date` column; comes back as "YYYY-MM-DD" with no time zone conversion. */
  date: string
  created_at: string
}

const HABIT_COLUMNS = 'id, name, color, frequency_type, times_per_week, created_at'
const COMPLETION_COLUMNS = 'id, habit_id, date, created_at'

function toHabit(row: HabitRow): Habit {
  return {
    id: row.id,
    name: row.name,
    color: row.color,
    frequency:
      row.frequency_type === 'weekly'
        ? { type: 'weekly', timesPerWeek: row.times_per_week ?? 1 }
        : { type: 'daily' },
    createdAt: row.created_at,
  }
}

function toHabitRow(input: HabitInput) {
  return {
    name: input.name,
    color: input.color,
    frequency_type: input.frequency.type,
    times_per_week: input.frequency.type === 'weekly' ? input.frequency.timesPerWeek : null,
  }
}

function toCompletion(row: CompletionRow): Completion {
  return { id: row.id, habitId: row.habit_id, date: row.date, createdAt: row.created_at }
}

/** Postgres error code for a unique constraint violation. */
const UNIQUE_VIOLATION = '23505'

// ---------- habits ----------

export async function listHabits(): Promise<Habit[]> {
  const { data, error } = await supabase
    .from('habits')
    .select(HABIT_COLUMNS)
    .order('created_at')
    .returns<HabitRow[]>()
  if (error) throw error
  return data.map(toHabit)
}

export async function createHabit(input: HabitInput): Promise<Habit> {
  const { data, error } = await supabase
    .from('habits')
    .insert(toHabitRow(input))
    .select(HABIT_COLUMNS)
    .single<HabitRow>()
  if (error) throw error
  return toHabit(data)
}

export async function updateHabit(id: string, input: HabitInput): Promise<Habit> {
  const { data, error } = await supabase
    .from('habits')
    .update(toHabitRow(input))
    .eq('id', id)
    .select(HABIT_COLUMNS)
    .single<HabitRow>()
  if (error) throw error
  return toHabit(data)
}

/** Deletes the habit; the database deletes its completions too (ON DELETE CASCADE). */
export async function deleteHabit(id: string): Promise<void> {
  const { error } = await supabase.from('habits').delete().eq('id', id)
  if (error) throw error
}

// ---------- completions ----------

/** Completions with `from <= date <= to` (inclusive). */
export async function listCompletions(from: DateKey, to: DateKey): Promise<Completion[]> {
  const { data, error } = await supabase
    .from('completions')
    .select(COMPLETION_COLUMNS)
    .gte('date', from)
    .lte('date', to)
    .order('created_at')
    .returns<CompletionRow[]>()
  if (error) throw error
  return data.map(toCompletion)
}

/**
 * Records a completion. If one already exists for that habit and day (e.g. you tapped on your
 * phone and your laptop at the same time), returns the existing record instead of failing.
 */
export async function addCompletion(habitId: string, date: DateKey): Promise<Completion> {
  const { data, error } = await supabase
    .from('completions')
    .insert({ habit_id: habitId, date })
    .select(COMPLETION_COLUMNS)
    .single<CompletionRow>()
  if (!error) return toCompletion(data)
  if (error.code !== UNIQUE_VIOLATION) throw error

  const existing = await supabase
    .from('completions')
    .select(COMPLETION_COLUMNS)
    .eq('habit_id', habitId)
    .eq('date', date)
    .single<CompletionRow>()
  if (existing.error) throw existing.error
  return toCompletion(existing.data)
}

export async function deleteCompletion(id: string): Promise<void> {
  const { error } = await supabase.from('completions').delete().eq('id', id)
  if (error) throw error
}

// ---------- program settings ----------

export async function getProgramSettings(): Promise<ProgramSettings | null> {
  const { data, error } = await supabase
    .from('program_settings')
    .select('start_date')
    .maybeSingle<{ start_date: string }>()
  if (error) throw error
  return data ? { startDate: data.start_date } : null
}

export async function saveProgramStart(startDate: DateKey): Promise<void> {
  const { error } = await supabase
    .from('program_settings')
    .upsert({ start_date: startDate, updated_at: new Date().toISOString() }, { onConflict: 'user_id' })
  if (error) throw error
}

// ---------- workout sessions ----------

interface SessionRow {
  id: string
  date: string
  session_key: SessionKind
  extra_exercise_ids: string[] | null
  knee_pain: number | null
  knee_pain_next_morning: number | null
  notes: string | null
  created_at: string
}

const SESSION_COLUMNS = 'id, date, session_key, extra_exercise_ids, knee_pain, knee_pain_next_morning, notes, created_at'

function toSession(row: SessionRow): WorkoutSession {
  return {
    id: row.id,
    date: row.date,
    sessionKind: row.session_key,
    extraExerciseIds: row.extra_exercise_ids ?? [],
    kneePain: row.knee_pain,
    kneePainNextMorning: row.knee_pain_next_morning,
    notes: row.notes ?? '',
    createdAt: row.created_at,
  }
}

/** Sessions with `from <= date <= to`, oldest first. */
export async function listWorkoutSessions(from: DateKey, to: DateKey): Promise<WorkoutSession[]> {
  const { data, error } = await supabase
    .from('workout_sessions')
    .select(SESSION_COLUMNS)
    .gte('date', from)
    .lte('date', to)
    .order('date')
    .returns<SessionRow[]>()
  if (error) throw error
  return data.map(toSession)
}

export async function getWorkoutSession(id: string): Promise<WorkoutSession | null> {
  const { data, error } = await supabase
    .from('workout_sessions')
    .select(SESSION_COLUMNS)
    .eq('id', id)
    .maybeSingle<SessionRow>()
  if (error) throw error
  return data ? toSession(data) : null
}

/** Opens the session for that day, creating it if needed (one per kind per date). */
export async function getOrCreateWorkoutSession(date: DateKey, kind: SessionKind): Promise<WorkoutSession> {
  const { data, error } = await supabase
    .from('workout_sessions')
    .insert({ date, session_key: kind })
    .select(SESSION_COLUMNS)
    .single<SessionRow>()
  if (!error) return toSession(data)
  if (error.code !== UNIQUE_VIOLATION) throw error

  const existing = await supabase
    .from('workout_sessions')
    .select(SESSION_COLUMNS)
    .eq('date', date)
    .eq('session_key', kind)
    .single<SessionRow>()
  if (existing.error) throw existing.error
  return toSession(existing.data)
}

export async function updateWorkoutSession(id: string, update: WorkoutSessionUpdate): Promise<void> {
  const row: Record<string, unknown> = {}
  if ('kneePain' in update) row.knee_pain = update.kneePain
  if ('kneePainNextMorning' in update) row.knee_pain_next_morning = update.kneePainNextMorning
  if ('notes' in update) row.notes = update.notes
  if ('extraExerciseIds' in update) row.extra_exercise_ids = update.extraExerciseIds
  const { error } = await supabase.from('workout_sessions').update(row).eq('id', id)
  if (error) throw error
}

/** Deletes the session; the database deletes its sets too (ON DELETE CASCADE). */
export async function deleteWorkoutSession(id: string): Promise<void> {
  const { error } = await supabase.from('workout_sessions').delete().eq('id', id)
  if (error) throw error
}

// ---------- workout sets ----------

interface SetRow {
  id: string
  session_id: string
  exercise_id: string
  set_number: number
  side: 'left' | 'right' | null
  reps: number | null
  weight_kg: number | null
  duration_s: number | null
  length_cm: number | null
  pain: number | null
  created_at: string
}

const SET_COLUMNS = 'id, session_id, exercise_id, set_number, side, reps, weight_kg, duration_s, length_cm, pain, created_at'

/** Postgres `numeric` can arrive as a string; normalise to number. */
const num = (v: number | string | null) => (v == null ? null : Number(v))

function toSet(row: SetRow): WorkoutSet {
  return {
    id: row.id,
    sessionId: row.session_id,
    exerciseId: row.exercise_id,
    setNumber: row.set_number,
    side: row.side,
    reps: row.reps,
    weightKg: num(row.weight_kg),
    durationS: row.duration_s,
    lengthCm: num(row.length_cm),
    pain: row.pain,
    createdAt: row.created_at,
  }
}

function toSetRow(input: Partial<WorkoutSetInput>) {
  const row: Record<string, unknown> = {}
  if ('sessionId' in input) row.session_id = input.sessionId
  if ('exerciseId' in input) row.exercise_id = input.exerciseId
  if ('setNumber' in input) row.set_number = input.setNumber
  if ('side' in input) row.side = input.side
  if ('reps' in input) row.reps = input.reps
  if ('weightKg' in input) row.weight_kg = input.weightKg
  if ('durationS' in input) row.duration_s = input.durationS
  if ('lengthCm' in input) row.length_cm = input.lengthCm
  if ('pain' in input) row.pain = input.pain
  return row
}

/** All sets for the given sessions. */
export async function listWorkoutSets(sessionIds: string[]): Promise<WorkoutSet[]> {
  if (sessionIds.length === 0) return []
  const { data, error } = await supabase
    .from('workout_sets')
    .select(SET_COLUMNS)
    .in('session_id', sessionIds)
    .order('created_at')
    .returns<SetRow[]>()
  if (error) throw error
  return data.map(toSet)
}

export async function addWorkoutSet(input: WorkoutSetInput): Promise<WorkoutSet> {
  const { data, error } = await supabase
    .from('workout_sets')
    .insert(toSetRow(input))
    .select(SET_COLUMNS)
    .single<SetRow>()
  if (error) throw error
  return toSet(data)
}

export async function updateWorkoutSet(id: string, input: Partial<WorkoutSetInput>): Promise<void> {
  const { error } = await supabase.from('workout_sets').update(toSetRow(input)).eq('id', id)
  if (error) throw error
}

export async function deleteWorkoutSet(id: string): Promise<void> {
  const { error } = await supabase.from('workout_sets').delete().eq('id', id)
  if (error) throw error
}

// ---------- your own exercises ----------

interface CustomExerciseRow {
  id: string
  name: string
  fields: Field[]
  per_side: boolean
}

function toCustomExercise(row: CustomExerciseRow): Exercise {
  return {
    id: CUSTOM_ID_PREFIX + row.id,
    name: row.name,
    fields: row.fields,
    perSide: row.per_side,
    custom: true,
    rx: {},
  }
}

export async function listCustomExercises(): Promise<Exercise[]> {
  const { data, error } = await supabase
    .from('custom_exercises')
    .select('id, name, fields, per_side')
    .order('name')
    .returns<CustomExerciseRow[]>()
  if (error) throw error
  return data.map(toCustomExercise)
}

/** Creates one of your own exercises. Names are unique per user (ignoring case). */
export async function createCustomExercise(input: CustomExerciseInput): Promise<Exercise> {
  const { data, error } = await supabase
    .from('custom_exercises')
    .insert({ name: input.name.trim(), fields: input.fields, per_side: input.perSide })
    .select('id, name, fields, per_side')
    .single<CustomExerciseRow>()
  if (error) {
    if (error.code === UNIQUE_VIOLATION) throw new Error(`You already have an exercise called “${input.name.trim()}”.`)
    throw error
  }
  return toCustomExercise(data)
}

// ---------- live sync ----------

type SyncedTable = 'habits' | 'completions' | 'program_settings' | 'workout_sessions' | 'workout_sets' | 'custom_exercises'

/**
 * Calls `onChange` whenever a table changes on any device (Supabase Realtime), and when the
 * tab becomes visible again (in case the phone dropped the connection while locked).
 * Returns an unsubscribe function.
 */
export function subscribeToChanges(table: SyncedTable, onChange: () => void): () => void {
  const channel = supabase
    .channel(`${table}-changes-${Math.random().toString(36).slice(2)}`)
    .on('postgres_changes', { event: '*', schema: 'public', table }, onChange)
    .subscribe()

  const onVisible = () => {
    if (document.visibilityState === 'visible') onChange()
  }
  document.addEventListener('visibilitychange', onVisible)

  return () => {
    document.removeEventListener('visibilitychange', onVisible)
    void supabase.removeChannel(channel)
  }
}

// ---------- one-time import of pre-Supabase data saved on this device ----------

const LEGACY_KEYS = {
  habits: 'habit-tracker:habits:v1',
  completions: 'habit-tracker:completions:v1',
} as const

function readLegacy<T>(key: string): T[] {
  try {
    const raw = localStorage.getItem(key)
    return raw ? (JSON.parse(raw) as T[]) : []
  } catch {
    return []
  }
}

/** Habits and completions still saved in this browser's localStorage from before Supabase. */
export async function getLocalDataToImport(): Promise<{ habits: number; completions: number }> {
  return {
    habits: readLegacy<Habit>(LEGACY_KEYS.habits).length,
    completions: readLegacy<Completion>(LEGACY_KEYS.completions).length,
  }
}

/**
 * Copies this device's old localStorage data into Supabase, keeping the same ids so running it
 * twice never creates duplicates, then removes the local copy.
 */
export async function importLocalData(): Promise<void> {
  const habits = readLegacy<Habit>(LEGACY_KEYS.habits)
  const habitIds = new Set(habits.map((h) => h.id))
  const completions = readLegacy<Completion>(LEGACY_KEYS.completions).filter((c) => habitIds.has(c.habitId))

  if (habits.length > 0) {
    const { error } = await supabase
      .from('habits')
      .upsert(
        habits.map((h) => ({ id: h.id, created_at: h.createdAt, ...toHabitRow(h) })),
        { onConflict: 'id', ignoreDuplicates: true },
      )
    if (error) throw error
  }
  if (completions.length > 0) {
    const { error } = await supabase
      .from('completions')
      .upsert(
        completions.map((c) => ({ id: c.id, habit_id: c.habitId, date: c.date, created_at: c.createdAt })),
        { onConflict: 'habit_id,date', ignoreDuplicates: true },
      )
    if (error) throw error
  }
  discardLocalData()
}

export function discardLocalData(): void {
  localStorage.removeItem(LEGACY_KEYS.habits)
  localStorage.removeItem(LEGACY_KEYS.completions)
}

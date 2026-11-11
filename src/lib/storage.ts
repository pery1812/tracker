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
import type { Completion, DateKey, Habit, HabitInput } from './types'

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

// ---------- live sync ----------

/**
 * Calls `onChange` whenever habits or completions change on any device (Supabase Realtime),
 * and when the tab becomes visible again (in case the phone dropped the connection while
 * locked). Returns an unsubscribe function.
 */
export function subscribeToChanges(table: 'habits' | 'completions', onChange: () => void): () => void {
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

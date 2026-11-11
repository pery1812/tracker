/**
 * THE ONLY FILE THAT READS OR WRITES PERSISTED DATA.
 *
 * Pages and hooks must go through these functions and never touch localStorage directly.
 * Every function is async (returns a Promise) even though localStorage is synchronous,
 * so that this file can be swapped for a Supabase implementation later with the same
 * signatures and no changes to the pages.
 *
 * Supabase mapping (planned):
 *   habits      -> table `habits`      (id uuid, name text, color text, frequency_type text,
 *                                        times_per_week int null, created_at timestamptz)
 *   completions -> table `completions` (id uuid, habit_id uuid references habits on delete cascade,
 *                                        date date, created_at timestamptz)
 * `date` is a plain DATE column filled from our local "YYYY-MM-DD" key — no time zone conversion.
 */
import type { Completion, DateKey, Habit, HabitInput } from './types'

const KEYS = {
  habits: 'habit-tracker:habits:v1',
  completions: 'habit-tracker:completions:v1',
} as const

// ---------- low-level helpers (private) ----------

function read<T>(key: string): T[] {
  try {
    const raw = localStorage.getItem(key)
    return raw ? (JSON.parse(raw) as T[]) : []
  } catch {
    return []
  }
}

function write<T>(key: string, value: T[]): void {
  localStorage.setItem(key, JSON.stringify(value))
}

/**
 * UUID v4. `crypto.randomUUID()` only exists in secure contexts (https or localhost),
 * so it is missing when the dev site is opened on a phone via http://192.168.x.x.
 * `crypto.getRandomValues` works everywhere. UUIDs also match Supabase's `uuid` columns.
 */
function newId(): string {
  if (typeof crypto.randomUUID === 'function' && window.isSecureContext) {
    return crypto.randomUUID()
  }
  const b = crypto.getRandomValues(new Uint8Array(16))
  b[6] = (b[6] & 0x0f) | 0x40
  b[8] = (b[8] & 0x3f) | 0x80
  const h = Array.from(b, (x) => x.toString(16).padStart(2, '0')).join('')
  return `${h.slice(0, 8)}-${h.slice(8, 12)}-${h.slice(12, 16)}-${h.slice(16, 20)}-${h.slice(20)}`
}

// ---------- habits ----------

export async function listHabits(): Promise<Habit[]> {
  return read<Habit>(KEYS.habits).sort((a, b) => a.createdAt.localeCompare(b.createdAt))
}

export async function createHabit(input: HabitInput): Promise<Habit> {
  const habit: Habit = { ...input, id: newId(), createdAt: new Date().toISOString() }
  write(KEYS.habits, [...read<Habit>(KEYS.habits), habit])
  return habit
}

export async function updateHabit(id: string, input: HabitInput): Promise<Habit> {
  const habits = read<Habit>(KEYS.habits)
  const existing = habits.find((h) => h.id === id)
  if (!existing) throw new Error(`Habit ${id} not found`)
  const updated: Habit = { ...existing, ...input }
  write(
    KEYS.habits,
    habits.map((h) => (h.id === id ? updated : h)),
  )
  return updated
}

/** Deletes the habit and all of its completions (like ON DELETE CASCADE in Postgres). */
export async function deleteHabit(id: string): Promise<void> {
  write(
    KEYS.habits,
    read<Habit>(KEYS.habits).filter((h) => h.id !== id),
  )
  write(
    KEYS.completions,
    read<Completion>(KEYS.completions).filter((c) => c.habitId !== id),
  )
}

// ---------- completions ----------

/** Completions with `from <= date <= to` (inclusive). "YYYY-MM-DD" strings sort correctly as text. */
export async function listCompletions(from: DateKey, to: DateKey): Promise<Completion[]> {
  return read<Completion>(KEYS.completions).filter((c) => c.date >= from && c.date <= to)
}

export async function addCompletion(habitId: string, date: DateKey): Promise<Completion> {
  const completion: Completion = {
    id: newId(),
    habitId,
    date,
    createdAt: new Date().toISOString(),
  }
  write(KEYS.completions, [...read<Completion>(KEYS.completions), completion])
  return completion
}

export async function deleteCompletion(id: string): Promise<void> {
  write(
    KEYS.completions,
    read<Completion>(KEYS.completions).filter((c) => c.id !== id),
  )
}

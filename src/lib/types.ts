/** A local calendar date in the user's own time zone, formatted "YYYY-MM-DD". Never UTC. */
export type DateKey = string

export type HabitFrequency =
  | { type: 'daily' }
  | { type: 'weekly'; timesPerWeek: number }

export interface Habit {
  id: string
  name: string
  /** Hex colour, e.g. "#22c55e". */
  color: string
  frequency: HabitFrequency
  /** ISO timestamp of when the habit was created (an instant, so UTC is fine here). */
  createdAt: string
}

/** One record per tap. Progress is always computed by counting these, never stored as a counter. */
export interface Completion {
  id: string
  habitId: string
  date: DateKey
  createdAt: string
}

export type HabitInput = Pick<Habit, 'name' | 'color' | 'frequency'>

// ---------- workouts ----------

export type SessionKey = 'mon' | 'tue' | 'wed' | 'sat'
export type Side = 'left' | 'right'

export interface ProgramSettings {
  /** Monday of program week 1. */
  startDate: DateKey
}

export interface WorkoutSession {
  id: string
  date: DateKey
  sessionKey: SessionKey
  /** Right knee 0–10 during the session (the program's knee rule). */
  kneePain: number | null
  kneePainNextMorning: number | null
  notes: string
  createdAt: string
}

export type WorkoutSessionUpdate = Partial<Pick<WorkoutSession, 'kneePain' | 'kneePainNextMorning' | 'notes'>>

/** One set actually done. Only the values the exercise uses are filled in. */
export interface WorkoutSet {
  id: string
  sessionId: string
  exerciseId: string
  setNumber: number
  side: Side | null
  reps: number | null
  weightKg: number | null
  durationS: number | null
  lengthCm: number | null
  pain: number | null
  createdAt: string
}

export type WorkoutSetInput = Omit<WorkoutSet, 'id' | 'createdAt'>

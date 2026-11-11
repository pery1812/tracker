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

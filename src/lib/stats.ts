/** Pure calculations for the Stats page and workout logging. No I/O. */
import { addDays, weekRange } from './dates'
import type { Exercise, Rx } from './program'
import { daysBetween } from './schedule'
import type { DateKey, Side, WorkoutSession, WorkoutSet } from './types'

// ---------- habit streaks ----------

export interface Streaks {
  current: number
  best: number
}

/**
 * Daily habit: consecutive days done. Today not being done yet doesn't break the streak:
 * it then counts back from yesterday.
 */
export function dailyStreaks(dates: Set<DateKey>, today: DateKey): Streaks {
  let current = 0
  let day = dates.has(today) ? today : addDays(today, -1)
  while (dates.has(day)) {
    current++
    day = addDays(day, -1)
  }

  const sorted = [...dates].filter((d) => d <= today).sort()
  let best = 0
  let run = 0
  sorted.forEach((d, i) => {
    run = i > 0 && daysBetween(sorted[i - 1], d) === 1 ? run + 1 : 1
    best = Math.max(best, run)
  })
  return { current, best: Math.max(best, current) }
}

/** Distinct days done per week, keyed by the week's Monday. */
function daysPerWeek(dates: Set<DateKey>): Map<DateKey, number> {
  const weeks = new Map<DateKey, number>()
  for (const d of dates) {
    const start = weekRange(d).start
    weeks.set(start, (weeks.get(start) ?? 0) + 1)
  }
  return weeks
}

/**
 * "X times per week" habit: consecutive weeks where the target was hit. The current week only
 * counts once it's hit; until then the streak counts back from last week.
 */
export function weeklyStreaks(dates: Set<DateKey>, target: number, today: DateKey): Streaks {
  const weeks = daysPerWeek(dates)
  const met = (start: DateKey) => (weeks.get(start) ?? 0) >= target

  const thisWeek = weekRange(today).start
  let current = 0
  let w = met(thisWeek) ? thisWeek : addDays(thisWeek, -7)
  while (met(w)) {
    current++
    w = addDays(w, -7)
  }

  const metWeeks = [...weeks.keys()].filter((s) => s <= thisWeek && met(s)).sort()
  let best = 0
  let run = 0
  metWeeks.forEach((s, i) => {
    run = i > 0 && daysBetween(metWeeks[i - 1], s) === 7 ? run + 1 : 1
    best = Math.max(best, run)
  })
  return { current, best: Math.max(best, current) }
}

/** Days done in the last `n` days (including today), out of the days since the habit existed. */
export function recentDays(dates: Set<DateKey>, today: DateKey, createdOn: DateKey, n = 30) {
  const of = Math.max(1, Math.min(n, daysBetween(createdOn, today) + 1))
  let done = 0
  for (let i = 0; i < of; i++) if (dates.has(addDays(today, -i))) done++
  return { done, of }
}

/** Of the last `n` full weeks (not counting this one), how many hit the target. */
export function recentWeeks(dates: Set<DateKey>, target: number, today: DateKey, createdOn: DateKey, n = 4) {
  const weeks = daysPerWeek(dates)
  const thisWeek = weekRange(today).start
  const firstWeek = weekRange(createdOn).start
  let hit = 0
  let of = 0
  for (let i = 1; i <= n; i++) {
    const start = addDays(thisWeek, -7 * i)
    if (start < firstWeek) break
    of++
    if ((weeks.get(start) ?? 0) >= target) hit++
  }
  return { hit, of }
}

// ---------- workout sets ----------

/** The number that best represents a set for progress: weight, then height/distance, then time, then reps. */
export function primaryMetric(exercise: Exercise): 'weightKg' | 'lengthCm' | 'durationS' | 'reps' | 'pain' | null {
  const f = exercise.fields
  if (f.includes('kg')) return 'weightKg'
  if (f.includes('cm')) return 'lengthCm'
  if (f.includes('sec')) return 'durationS'
  if (f.includes('reps')) return 'reps'
  if (f.includes('pain')) return 'pain'
  return null
}

export function formatSet(exercise: Exercise, s: WorkoutSet): string {
  const parts: string[] = []
  for (const f of exercise.fields) {
    if (f === 'kg' && s.weightKg != null) parts.push(`${s.weightKg} kg`)
    if (f === 'reps' && s.reps != null) parts.push(`${s.reps}`)
    if (f === 'sec' && s.durationS != null) parts.push(`${s.durationS} s`)
    if (f === 'cm' && s.lengthCm != null) parts.push(`${s.lengthCm} cm`)
    if (f === 'pain' && s.pain != null) parts.push(`${s.pain}/10`)
  }
  return parts.length ? parts.join(' × ') : '✓'
}

/** "60 kg × 6, 6, 6, 5" when the weight didn't change, otherwise each set in full. */
export function describeSets(exercise: Exercise, sets: WorkoutSet[]): string {
  if (sets.length === 0) return ''
  const sorted = [...sets].sort((a, b) => a.setNumber - b.setNumber)
  const sameWeight = exercise.fields.includes('kg') && sorted.every((s) => s.weightKg === sorted[0].weightKg)
  if (sameWeight && exercise.fields.length === 2 && exercise.fields.includes('reps')) {
    return `${sorted[0].weightKg ?? 0} kg × ${sorted.map((s) => s.reps ?? '–').join(', ')}`
  }
  if (exercise.fields.length === 0) return `${sorted.length} done`
  return sorted.map((s) => formatSet(exercise, s)).join(', ')
}

/**
 * The program's progression rule: when every set hit the top of the rep range, add 2.5–5 kg.
 * We only know reps (not RPE), so this suggests rather than decides.
 */
export function suggestIncrease(exercise: Exercise, rx: Rx, previous: WorkoutSet[]): boolean {
  if (!exercise.fields.includes('kg') || !rx.reps || previous.length < rx.sets) return false
  return previous.every((s) => (s.reps ?? 0) >= rx.reps!)
}

export interface ProgressPoint {
  date: DateKey
  value: number
  /** The set that produced the value, for the tooltip. */
  detail: string
}

/**
 * Best value per session for an exercise (e.g. the heaviest set), oldest first.
 * For left/right exercises, pass `side` to get one line per side.
 */
export function exerciseProgress(
  exercise: Exercise,
  sessions: WorkoutSession[],
  sets: WorkoutSet[],
  side?: Side,
): ProgressPoint[] {
  const metric = primaryMetric(exercise)
  if (!metric) return []
  const dateOf = new Map(sessions.map((s) => [s.id, s.date]))
  const best = new Map<DateKey, { value: number; set: WorkoutSet }>()

  for (const s of sets) {
    if (s.exerciseId !== exercise.id) continue
    if (side && s.side !== side) continue
    const date = dateOf.get(s.sessionId)
    const value = s[metric]
    if (!date || value == null) continue
    const prev = best.get(date)
    // Same weight: more reps wins.
    if (!prev || value > prev.value || (value === prev.value && (s.reps ?? 0) > (prev.set.reps ?? 0))) {
      best.set(date, { value, set: s })
    }
  }
  return [...best.entries()]
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([date, { value, set }]) => ({ date, value, detail: formatSet(exercise, set) }))
}

/** Left as a percentage of right, e.g. 0.92. Null when either side is missing or right is 0. */
export function leftRightRatio(left: number | undefined, right: number | undefined): number | null {
  if (left == null || right == null || right === 0) return null
  return left / right
}

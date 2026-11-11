/** Where a date falls in the 12-week program, and what is planned for it. Pure functions. */
import { addDays, fromDateKey, weekRange } from './dates'
import {
  DELOAD_WEEKS,
  PROGRAM_WEEKS,
  SESSIONS,
  SESSION_ORDER,
  TEST_WEEKS,
  TESTS,
  type Exercise,
  type Phase,
  type Rx,
} from './program'
import type { DateKey, SessionKey } from './types'

/** Whole days from `a` to `b` (local calendar days; safe across daylight-saving changes). */
export function daysBetween(a: DateKey, b: DateKey): number {
  const ms = fromDateKey(b).getTime() - fromDateKey(a).getTime()
  return Math.round(ms / 86_400_000)
}

/**
 * Program week (1-based) for a date. Week 1 starts on `startDate`.
 * Returns 0 or less before the program starts, and more than 12 after it ends.
 */
export function programWeek(startDate: DateKey, date: DateKey): number {
  return Math.floor(daysBetween(startDate, date) / 7) + 1
}

/** Phase for a week, clamped so dates before/after the program still get a sensible plan. */
export function phaseForWeek(week: number): Phase {
  if (week <= 4) return 1
  if (week <= 8) return 2
  return 3
}

export const isDeloadWeek = (week: number) => DELOAD_WEEKS.includes(week)
export const isTestWeek = (week: number) => TEST_WEEKS.includes(week)

/** The gym session planned for a weekday, or null on football / volleyball / rest days. */
export function plannedSessionKey(date: DateKey): SessionKey | null {
  const weekday = fromDateKey(date).getDay()
  return SESSION_ORDER.find((k) => SESSIONS[k].weekday === weekday) ?? null
}

/** The calendar date of a session in the same Monday-to-Sunday week as `date`. */
export function dateOfSessionInWeek(date: DateKey, key: SessionKey): DateKey {
  return addDays(weekRange(date).start, SESSIONS[key].weekday - 1)
}

export interface PlannedExercise {
  exercise: Exercise
  rx: Rx
  /** "Warm-up", "A", "B", ... or "Test 1", "Test 2", ... */
  label: string
  perSide: boolean
  isTest: boolean
}

/** Deload: about 40% fewer sets, never fewer than one. */
export function deloadSets(sets: number): number {
  return Math.max(1, Math.round(sets * 0.6))
}

/** The exercises to do for a session in a given program week, in order. */
export function planSession(key: SessionKey, week: number): PlannedExercise[] {
  const phase = phaseForWeek(week)
  const deload = isDeloadWeek(week)
  const out: PlannedExercise[] = []
  let letter = 0

  const warmups = SESSIONS[key].exercises.filter((e) => e.warmup)
  const main = SESSIONS[key].exercises.filter((e) => !e.warmup)

  for (const exercise of warmups) {
    const rx = exercise.rx[phase]
    if (rx) out.push({ exercise, rx, label: 'Warm-up', perSide: false, isTest: false })
  }

  // Tests come right after the warm-up on Wednesday of weeks 1, 4, 8 and 12.
  if (key === 'wed' && isTestWeek(week)) {
    TESTS.forEach((exercise, i) => {
      const rx = exercise.rx[phase]!
      out.push({ exercise, rx, label: `Test ${i + 1}`, perSide: Boolean(exercise.perSide), isTest: true })
    })
  }

  for (const exercise of main) {
    const base = exercise.rx[phase]
    if (!base) continue
    if (deload && base.skipOnDeload) continue
    const rx = deload ? { ...base, sets: deloadSets(base.sets) } : base
    out.push({
      exercise,
      rx,
      label: String.fromCharCode(65 + letter++),
      perSide: rx.perSide ?? Boolean(exercise.perSide),
      isTest: false,
    })
  }
  return out
}

export { PROGRAM_WEEKS }

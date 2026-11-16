/** Where a date falls in the 12-week program, and what is planned for it. Pure functions. */
import { addDays, fromDateKey } from './dates'
import {
  DELOAD_WEEKS,
  PROGRAM_WEEK_STARTS_ON,
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

/** First and last day (inclusive) of the program week containing `date`. */
export function programWeekRange(startDate: DateKey, date: DateKey): { start: DateKey; end: DateKey } {
  const start = addDays(startDate, (programWeek(startDate, date) - 1) * 7)
  return { start, end: addDays(start, 6) }
}

/** The program-week start day (Sunday) on or before `date`. */
export function programWeekStartOnOrBefore(date: DateKey): DateKey {
  const offset = (fromDateKey(date).getDay() - PROGRAM_WEEK_STARTS_ON + 7) % 7
  return addDays(date, -offset)
}

/** Phase for a week, clamped so dates before/after the program still get a sensible plan. */
export function phaseForWeek(week: number): Phase {
  if (week <= 4) return 1
  if (week <= 8) return 2
  return 3
}

export const isDeloadWeek = (week: number) => DELOAD_WEEKS.includes(week)
export const isTestWeek = (week: number) => TEST_WEEKS.includes(week)

/** The gym session planned for a weekday, or null on volleyball / football / rest days. */
export function plannedSessionKey(date: DateKey): SessionKey | null {
  const weekday = fromDateKey(date).getDay()
  return SESSION_ORDER.find((k) => SESSIONS[k].weekday === weekday) ?? null
}

export interface PlannedExercise {
  exercise: Exercise
  rx: Rx
  /** "Warm-up", "A", "B", ... "I2", or "Test 1", "Test 2", ... */
  label: string
  perSide: boolean
  isTest: boolean
  /** Added by hand to this session rather than planned by the program. */
  added?: boolean
}

/** Deload: about 40% fewer sets, never fewer than one. */
export function deloadSets(sets: number): number {
  return Math.max(1, Math.round(sets * 0.6))
}

export interface PlanOptions {
  /** Scrimmage Sunday: drop the jump block, one set fewer on the strength work. */
  scrimmage?: boolean
}

/** The exercises to do for a session in a given program week, in order. */
export function planSession(key: SessionKey, week: number, options: PlanOptions = {}): PlannedExercise[] {
  const phase = phaseForWeek(week)
  const deload = isDeloadWeek(week)
  const items = SESSIONS[key].items
  const out: PlannedExercise[] = []

  for (const item of items.filter((i) => i.exercise.warmup)) {
    const rx = item.exercise.rx[phase]
    if (rx) out.push({ exercise: item.exercise, rx, label: 'Warm-up', perSide: false, isTest: false })
  }

  // Tests come right after the warm-up on Sunday of weeks 1, 4, 8 and 12.
  if (key === 'lower' && isTestWeek(week)) {
    TESTS.forEach((exercise, i) => {
      const rx = exercise.rx[phase]!
      out.push({ exercise, rx, label: `Test ${i + 1}`, perSide: Boolean(exercise.perSide), isTest: true })
    })
  }

  // Letters are assigned across the whole sheet before anything is skipped (other phases, deload,
  // scrimmage), so they always match the program sheet.
  let letter = -1
  let sub = 1
  for (const item of items.filter((i) => !i.exercise.warmup)) {
    if (item.phaseAlternative) {
      // same letter as the exercise it replaces
    } else if (item.continuesPrevious && letter >= 0) {
      sub++
    } else {
      letter++
      sub = 1
    }
    const label = String.fromCharCode(65 + letter) + (sub > 1 ? String(sub) : '')

    const base = item.exercise.rx[phase]
    if (!base) continue

    if (deload && base.skipOnDeload) continue
    if (options.scrimmage && item.jumpBlock) continue

    let rx: Rx = base
    if (base.easierThroughWeek && week <= base.easierThroughWeek.week) {
      rx = { ...rx, sets: base.easierThroughWeek.sets, reps: base.easierThroughWeek.reps }
    }
    if (deload) rx = { ...rx, sets: deloadSets(rx.sets) }
    if (options.scrimmage && item.fewerOnScrimmage) rx = { ...rx, sets: Math.max(1, rx.sets - 1) }

    out.push({ exercise: item.exercise, rx, label, perSide: rx.perSide ?? Boolean(item.exercise.perSide), isTest: false })
  }
  return out
}

export { PROGRAM_WEEKS }

/** Where a date falls in the season, and what is planned for it. Pure functions. */
import { addDays, fromDateKey } from './dates'
import {
  PROGRAM_WEEK_STARTS_ON,
  PROGRAM_WEEKS,
  SEASON,
  SESSIONS,
  SESSION_ORDER,
  TESTS,
  type Block,
  type BlockInfo,
  type Exercise,
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
 * Returns 0 or less before the season starts, and more than PROGRAM_WEEKS after it ends.
 */
export function programWeek(startDate: DateKey, date: DateKey): number {
  return Math.floor(daysBetween(startDate, date) / 7) + 1
}

/** First and last day (inclusive) of the program week containing `date`. */
export function programWeekRange(startDate: DateKey, date: DateKey): { start: DateKey; end: DateKey } {
  const start = addDays(startDate, (programWeek(startDate, date) - 1) * 7)
  return { start, end: addDays(start, 6) }
}

/** First and last day (inclusive) of a program week. */
export function weekDates(startDate: DateKey, week: number): { start: DateKey; end: DateKey } {
  const start = addDays(startDate, (week - 1) * 7)
  return { start, end: addDays(start, 6) }
}

/** The program-week start day (Sunday) on or before `date`. */
export function programWeekStartOnOrBefore(date: DateKey): DateKey {
  const offset = (fromDateKey(date).getDay() - PROGRAM_WEEK_STARTS_ON + 7) % 7
  return addDays(date, -offset)
}

export interface WeekInfo {
  /** 1-based program week, clamped to 1..PROGRAM_WEEKS for planning. */
  week: number
  info: BlockInfo
  /** Block whose prescriptions apply (the taper uses block 6). */
  block: Block
  weekInBlock: number
  /** First program week of this block. */
  blockStartWeek: number
  deload: boolean
  /** Tests on Sunday (deload weeks). */
  test: boolean
  /** No gym this week: home routine only (Tết). */
  home: boolean
  taper: boolean
}

/** Everything about a program week: block, deload, test, Tết, taper. Out-of-range weeks clamp. */
export function weekInfo(rawWeek: number): WeekInfo {
  const week = Math.min(Math.max(rawWeek, 1), PROGRAM_WEEKS)
  let first = 1
  for (const info of SEASON) {
    if (week < first + info.weeks) {
      const weekInBlock = week - first + 1
      const deload = info.deloadWeek === weekInBlock
      const taper = info.block === 'taper'
      return {
        week,
        info,
        block: taper ? 6 : (info.block as Block),
        weekInBlock,
        blockStartWeek: first,
        deload,
        test: deload,
        home: info.homeWeek === weekInBlock,
        taper,
      }
    }
    first += info.weeks
  }
  throw new Error('unreachable: SEASON covers every week')
}

export const isDeloadWeek = (week: number) => weekInfo(week).deload
export const isTestWeek = (week: number) => weekInfo(week).test

/** The gym session planned for a weekday, or null on volleyball / football / rest days. */
export function plannedSessionKey(date: DateKey): SessionKey | null {
  const weekday = fromDateKey(date).getDay()
  return SESSION_ORDER.find((k) => SESSIONS[k].weekday === weekday) ?? null
}

export interface PlannedExercise {
  exercise: Exercise
  rx: Rx
  /** "Warm-up", "A", "B", ... "I2", a group like "Finisher", or "Test 1", "Test 2", ... */
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

/** Taper: volume cut by half, never fewer than one set. */
export function taperSets(sets: number): number {
  return Math.max(1, Math.ceil(sets / 2))
}

export interface PlanOptions {
  /** Scrimmage Sunday: drop the jump block, one set fewer on the strength work. */
  scrimmage?: boolean
}

/** The exercises to do for a session in a given program week, in order. */
export function planSession(key: SessionKey, rawWeek: number, options: PlanOptions = {}): PlannedExercise[] {
  const w = weekInfo(rawWeek)
  const items = SESSIONS[key].items
  const out: PlannedExercise[] = []

  for (const item of items.filter((i) => i.exercise.warmup)) {
    const rx = item.exercise.rx[w.block]
    if (rx) out.push({ exercise: item.exercise, rx, label: 'Warm-up', perSide: false, isTest: false })
  }

  // Tests come right after the warm-up on Sunday of each deload week.
  if (key === 'lower' && w.test) {
    TESTS.forEach((exercise, i) => {
      const rx = exercise.rx[w.block]!
      out.push({ exercise, rx, label: `Test ${i + 1}`, perSide: Boolean(exercise.perSide), isTest: true })
    })
  }

  // Letters are assigned across the whole sheet before anything is skipped (other blocks, deload,
  // scrimmage), so they always match the program sheet. Grouped items ("Finisher") get no letter.
  let letter = -1
  let sub = 1
  for (const item of items.filter((i) => !i.exercise.warmup)) {
    let label: string
    if (item.group) {
      label = item.group
    } else {
      if (item.phaseAlternative) {
        // same letter as the exercise it replaces
      } else if (item.continuesPrevious && letter >= 0) {
        sub++
      } else {
        letter++
        sub = 1
      }
      label = String.fromCharCode(65 + letter) + (sub > 1 ? String(sub) : '')
    }

    const base = item.exercise.rx[w.block]
    if (!base) continue
    if (w.deload && base.skipOnDeload) continue
    if (options.scrimmage && item.jumpBlock) continue

    let rx: Rx = base
    if (base.easierThroughWeek && w.week <= base.easierThroughWeek.week) {
      rx = { ...rx, sets: base.easierThroughWeek.sets, reps: base.easierThroughWeek.reps }
    }
    if (w.deload) rx = { ...rx, sets: deloadSets(rx.sets) }
    if (w.taper) rx = { ...rx, sets: taperSets(rx.sets) }
    if (options.scrimmage && item.fewerOnScrimmage) rx = { ...rx, sets: Math.max(1, rx.sets - 1) }

    out.push({ exercise: item.exercise, rx, label, perSide: rx.perSide ?? Boolean(item.exercise.perSide), isTest: false })
  }
  return out
}

export { PROGRAM_WEEKS }

/** "Block 1 · Volume" or "Taper". */
export function blockTitle(w: WeekInfo): string {
  return w.taper ? 'Taper' : `Block ${w.block} · ${w.info.name}`
}

/** "Week 3", or "Baseline week" for the week before week 1, or "Pre-season" before that. */
export function weekLabel(week: number): string {
  if (week >= 1) return `Week ${week}`
  return week === 0 ? 'Baseline week' : 'Pre-season'
}

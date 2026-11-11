import type { DateKey } from './types'

/**
 * Date helpers. All calendar dates are local "YYYY-MM-DD" strings in the device's time zone.
 * Never use `toISOString()` to build a date key: it converts to UTC and gives the wrong day
 * late in the evening or early in the morning.
 */

/** Weeks start on Monday. */
export const WEEK_STARTS_ON = 1

const pad = (n: number) => String(n).padStart(2, '0')

export function toDateKey(date: Date): DateKey {
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}`
}

export function todayKey(): DateKey {
  return toDateKey(new Date())
}

/** Parses a date key as local midnight (not UTC midnight, which `new Date("YYYY-MM-DD")` would give). */
export function fromDateKey(key: DateKey): Date {
  const [y, m, d] = key.split('-').map(Number)
  return new Date(y, m - 1, d)
}

export function addDays(key: DateKey, days: number): DateKey {
  const d = fromDateKey(key)
  d.setDate(d.getDate() + days)
  return toDateKey(d)
}

/** The first and last day (inclusive) of the week containing `key`. */
export function weekRange(key: DateKey): { start: DateKey; end: DateKey } {
  const d = fromDateKey(key)
  const offset = (d.getDay() - WEEK_STARTS_ON + 7) % 7
  const start = addDays(key, -offset)
  return { start, end: addDays(start, 6) }
}

/** "Wed, 11 Nov" (order follows the device's locale). */
export function formatShortDate(key: DateKey): string {
  return fromDateKey(key).toLocaleDateString(undefined, { weekday: 'short', day: 'numeric', month: 'short' })
}

export function formatLongDate(key: DateKey): string {
  return fromDateKey(key).toLocaleDateString(undefined, {
    weekday: 'long',
    day: 'numeric',
    month: 'long',
  })
}

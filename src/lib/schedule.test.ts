import { describe, expect, it } from 'vitest'
import { addDays, toDateKey, weekRange } from './dates'
import { isProgramSession, sessionTitle } from './program'
import {
  daysBetween,
  deloadSets,
  isDeloadWeek,
  phaseForWeek,
  planSession,
  plannedSessionKey,
  programWeek,
  programWeekRange,
  programWeekStartOnOrBefore,
} from './schedule'

describe('dates', () => {
  it('builds local date keys, not UTC', () => {
    // 23:30 local on 11 Nov must still be the 11th whatever the time zone.
    expect(toDateKey(new Date(2026, 10, 11, 23, 30))).toBe('2026-11-11')
  })
  it('calendar weeks (habits) run Monday to Sunday', () => {
    expect(weekRange('2026-11-11')).toEqual({ start: '2026-11-09', end: '2026-11-15' })
    expect(weekRange('2026-11-16').start).toBe('2026-11-16')
  })
  it('counts days across month and daylight-saving boundaries', () => {
    expect(daysBetween('2026-10-24', '2026-11-02')).toBe(9)
    expect(daysBetween('2026-03-28', '2026-03-30')).toBe(2)
    expect(addDays('2026-12-31', 1)).toBe('2027-01-01')
  })
})

describe('program weeks (Sunday to Saturday)', () => {
  const start = '2026-10-25' // a Sunday

  it('numbers weeks from the start date', () => {
    expect(programWeek(start, '2026-10-25')).toBe(1)
    expect(programWeek(start, '2026-10-31')).toBe(1) // Saturday
    expect(programWeek(start, '2026-11-01')).toBe(2) // next Sunday
    expect(programWeek(start, '2026-11-16')).toBe(4)
    expect(programWeek(start, '2026-10-24')).toBe(0)
  })
  it('gives the program week range', () => {
    expect(programWeekRange(start, '2026-11-17')).toEqual({ start: '2026-11-15', end: '2026-11-21' })
  })
  it('finds the Sunday on or before a date', () => {
    expect(programWeekStartOnOrBefore('2026-10-26')).toBe('2026-10-25') // Monday -> day before
    expect(programWeekStartOnOrBefore('2026-11-15')).toBe('2026-11-15') // already Sunday
    expect(programWeekStartOnOrBefore('2026-11-21')).toBe('2026-11-15') // Saturday
  })
  it('maps weeks to phases and clamps outside 1–12', () => {
    expect([0, 1, 4, 5, 8, 9, 12, 15].map(phaseForWeek)).toEqual([1, 1, 1, 2, 2, 3, 3, 3])
  })
})

describe('the week', () => {
  it('has gym on Sunday, Monday and Tuesday only', () => {
    // 15 Nov 2026 is a Sunday
    const keys = [15, 16, 17, 18, 19, 20, 21].map((d) => plannedSessionKey(`2026-11-${d}`))
    expect(keys).toEqual(['lower', 'upper', 'resilience', null, null, null, null])
  })
  it('names current, old-plan and custom sessions', () => {
    expect(sessionTitle('lower')).toBe('Lower A — jumps and strength')
    expect(sessionTitle('mon')).toBe('Lower A — strength (old plan)')
    expect(sessionTitle('custom')).toBe('Custom workout')
    expect(isProgramSession('upper')).toBe(true)
    expect(isProgramSession('wed')).toBe(false)
    expect(isProgramSession('custom')).toBe(false)
  })
})

describe('Sunday — Lower A', () => {
  const plan = (w: number, scrimmage = false) => planSession('lower', w, { scrimmage })
  const byId = (w: number, id: string, scrimmage = false) => plan(w, scrimmage).find((p) => p.exercise.id === id)

  it('keeps the program sheet letters A–H in every phase', () => {
    expect(plan(2).map((p) => p.label)).toEqual(['Warm-up', 'A', 'B', 'C', 'D', 'E', 'F', 'G', 'H'])
    expect(byId(2, 'drop-landing')?.label).toBe('C')
    expect(byId(6, 'drop-jump')?.label).toBe('C')
    expect(byId(10, 'depth-jump')?.label).toBe('C')
    expect(byId(2, 'deadlift')?.label).toBe('D')
    expect(byId(6, 'overloaded-pull')?.label).toBe('E')
  })
  it('uses the new RDL 2 × 5 in phase 3', () => {
    expect(byId(10, 'rdl')?.rx).toMatchObject({ sets: 2, reps: 5 })
  })
  it('scrimmage: drops A–C and takes one set off D–H', () => {
    const p = plan(2, true)
    expect(p.map((x) => x.label)).toEqual(['Warm-up', 'D', 'E', 'F', 'G', 'H'])
    expect(byId(2, 'deadlift', true)?.rx.sets).toBe(3) // 4 -> 3
    expect(byId(10, 'rdl', true)?.rx.sets).toBe(1) // 2 -> 1
  })
  it('deload: fewer sets and no drop jumps; letters unchanged', () => {
    expect(isDeloadWeek(8)).toBe(true)
    expect(deloadSets(5)).toBe(3)
    expect(byId(8, 'drop-jump')).toBeUndefined()
    expect(byId(7, 'drop-jump')?.rx.sets).toBe(3)
    expect(byId(8, 'deadlift')).toMatchObject({ label: 'D', rx: { sets: 3 } }) // 5 -> 3
  })
  it('has the tests on Sunday of weeks 1, 4, 8 and 12', () => {
    const hasTests = (w: number) => plan(w).some((p) => p.isTest)
    expect([1, 2, 4, 8, 9, 12].map(hasTests)).toEqual([true, false, true, true, false, true])
    expect(planSession('upper', 1).some((p) => p.isTest)).toBe(false)
  })
  it('makes pogo hops per-leg only in phase 3', () => {
    expect(byId(2, 'pogo-hops')?.perSide).toBe(false)
    expect(byId(10, 'pogo-hops')?.perSide).toBe(true)
  })
})

describe('Monday — Upper + rotation', () => {
  it('has the new power moves and the finisher, A–M', () => {
    const p = planSession('upper', 2)
    expect(p.slice(1, 3).map((x) => x.exercise.id)).toEqual(['landmine-rotational-punch', 'db-snatch'])
    expect(p.at(-1)).toMatchObject({ label: 'M', exercise: { id: 'upper-triceps' } })
    expect(p.find((x) => x.exercise.id === 'db-snatch')?.perSide).toBe(true)
  })
})

describe('Tuesday — resilience', () => {
  const byId = (w: number, id: string) => planSession('resilience', w).find((p) => p.exercise.id === id)
  it('starts Nordics at 2 × 3 in weeks 1–2, then 3 × 4', () => {
    expect(byId(1, 'nordic-curl')?.rx).toMatchObject({ sets: 2, reps: 3 })
    expect(byId(2, 'nordic-curl')?.rx).toMatchObject({ sets: 2, reps: 3 })
    expect(byId(3, 'nordic-curl')?.rx).toMatchObject({ sets: 3, reps: 4 })
    expect(byId(6, 'nordic-curl')?.rx).toMatchObject({ sets: 3, reps: 5 })
  })
  it('labels the calf pair I and I2, arm swing J', () => {
    expect(byId(2, 'seated-calf-raise')?.label).toBe('I')
    expect(byId(2, 'sl-calf-raise-failure')?.label).toBe('I2')
    expect(byId(2, 'arm-swing-drill')?.label).toBe('J')
  })
  it('lateral hop: line hop in phase 1, skater bound and stick later', () => {
    expect(byId(2, 'line-hop-stick')?.label).toBe('A')
    expect(byId(6, 'skater-bound-stick')?.label).toBe('A')
    expect(byId(10, 'skater-bound-stick')?.rx.reps).toBe(6)
  })
})

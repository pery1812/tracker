import { describe, expect, it } from 'vitest'
import { addDays, toDateKey, weekRange } from './dates'
import { daysBetween, deloadSets, isDeloadWeek, phaseForWeek, planSession, plannedSessionKey, programWeek } from './schedule'

describe('dates', () => {
  it('builds local date keys, not UTC', () => {
    // 23:30 local on 11 Nov must still be the 11th whatever the time zone.
    expect(toDateKey(new Date(2026, 10, 11, 23, 30))).toBe('2026-11-11')
  })
  it('weeks run Monday to Sunday', () => {
    expect(weekRange('2026-11-11')).toEqual({ start: '2026-11-09', end: '2026-11-15' })
    expect(weekRange('2026-11-15')).toEqual({ start: '2026-11-09', end: '2026-11-15' })
    expect(weekRange('2026-11-16').start).toBe('2026-11-16')
  })
  it('counts days across month and daylight-saving boundaries', () => {
    expect(daysBetween('2026-10-24', '2026-11-02')).toBe(9)
    expect(daysBetween('2026-03-28', '2026-03-30')).toBe(2)
    expect(addDays('2026-12-31', 1)).toBe('2027-01-01')
  })
})

describe('program schedule', () => {
  const start = '2026-10-26' // a Monday

  it('numbers weeks from the start date', () => {
    expect(programWeek(start, '2026-10-26')).toBe(1)
    expect(programWeek(start, '2026-11-01')).toBe(1)
    expect(programWeek(start, '2026-11-02')).toBe(2)
    expect(programWeek(start, '2026-11-11')).toBe(3)
    expect(programWeek(start, '2026-10-25')).toBe(0)
  })

  it('maps weeks to phases and clamps outside 1–12', () => {
    expect([0, 1, 4, 5, 8, 9, 12, 15].map(phaseForWeek)).toEqual([1, 1, 1, 2, 2, 3, 3, 3])
  })

  it('knows which session is planned on each weekday', () => {
    expect(plannedSessionKey('2026-11-09')).toBe('mon')
    expect(plannedSessionKey('2026-11-10')).toBe('tue')
    expect(plannedSessionKey('2026-11-11')).toBe('wed')
    expect(plannedSessionKey('2026-11-12')).toBeNull() // football
    expect(plannedSessionKey('2026-11-14')).toBe('sat')
    expect(plannedSessionKey('2026-11-15')).toBeNull()
  })

  it('swaps the isometric between phases', () => {
    const ids = (w: number) => planSession('mon', w).map((p) => p.exercise.id)
    expect(ids(1)).toContain('wall-sit')
    expect(ids(1)).not.toContain('overloaded-pull')
    expect(ids(5)).toContain('overloaded-pull')
    expect(planSession('mon', 2).find((p) => p.exercise.id === 'deadlift')?.rx.text).toBe('4 × 6, RPE 7')
    expect(planSession('mon', 6).find((p) => p.exercise.id === 'deadlift')?.rx.text).toBe('5 × 4, RPE 8')
  })

  it('labels exercises A, B, C after the warm-up', () => {
    const labels = planSession('mon', 2).map((p) => p.label)
    expect(labels[0]).toBe('Warm-up')
    expect(labels.slice(1, 4)).toEqual(['A', 'B', 'C'])
  })

  it('cuts sets on deload weeks and drops depth work', () => {
    expect(isDeloadWeek(4)).toBe(true)
    expect(deloadSets(5)).toBe(3)
    expect(deloadSets(1)).toBe(1)
    const week8 = planSession('wed', 8)
    expect(week8.find((p) => p.exercise.id === 'drop-jump')).toBeUndefined()
    expect(planSession('wed', 7).find((p) => p.exercise.id === 'drop-jump')?.rx.sets).toBe(3)
    expect(planSession('mon', 8).find((p) => p.exercise.id === 'deadlift')?.rx.sets).toBe(3) // 5 -> 3
  })

  it('adds tests on Wednesday of weeks 1, 4, 8 and 12 only', () => {
    const hasTests = (w: number) => planSession('wed', w).some((p) => p.isTest)
    expect([1, 2, 4, 8, 9, 12].map(hasTests)).toEqual([true, false, true, true, false, true])
    expect(planSession('mon', 1).some((p) => p.isTest)).toBe(false)
  })

  it('makes pogo hops per-leg only in phase 3', () => {
    expect(planSession('wed', 2).find((p) => p.exercise.id === 'pogo-hops')?.perSide).toBe(false)
    expect(planSession('wed', 10).find((p) => p.exercise.id === 'pogo-hops')?.perSide).toBe(true)
  })
})

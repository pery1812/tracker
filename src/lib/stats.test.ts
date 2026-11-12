import { describe, expect, it } from 'vitest'
import { getExercise } from './program'
import { dailyStreaks, describeSets, exerciseProgress, recentDays, recentWeeks, suggestIncrease, weeklyStreaks } from './stats'
import type { WorkoutSession, WorkoutSet } from './types'

const set = (d: string[]) => new Set(d)

describe('daily streaks', () => {
  it('counts back from today when done today', () => {
    expect(dailyStreaks(set(['2026-11-09', '2026-11-10', '2026-11-11']), '2026-11-11')).toEqual({ current: 3, best: 3 })
  })
  it('does not break just because today is not done yet', () => {
    expect(dailyStreaks(set(['2026-11-09', '2026-11-10']), '2026-11-11').current).toBe(2)
  })
  it('breaks after a missed day and remembers the best run', () => {
    const s = dailyStreaks(set(['2026-11-01', '2026-11-02', '2026-11-03', '2026-11-04', '2026-11-10']), '2026-11-11')
    expect(s).toEqual({ current: 1, best: 4 })
  })
  it('handles month boundaries', () => {
    expect(dailyStreaks(set(['2026-10-31', '2026-11-01']), '2026-11-01').current).toBe(2)
  })
  it('is zero with no data', () => {
    expect(dailyStreaks(set([]), '2026-11-11')).toEqual({ current: 0, best: 0 })
  })
})

describe('weekly streaks (3× per week)', () => {
  // Weeks starting 26 Oct, 2 Nov, 9 Nov (current, today = Wed 11 Nov).
  const lastTwoWeeksMet = ['2026-10-26', '2026-10-28', '2026-10-30', '2026-11-02', '2026-11-03', '2026-11-05']
  it('counts full weeks; an unfinished current week does not break it', () => {
    expect(weeklyStreaks(set([...lastTwoWeeksMet, '2026-11-09']), 3, '2026-11-11')).toEqual({ current: 2, best: 2 })
  })
  it('includes the current week once the target is hit', () => {
    const s = weeklyStreaks(set([...lastTwoWeeksMet, '2026-11-09', '2026-11-10', '2026-11-11']), 3, '2026-11-11')
    expect(s.current).toBe(3)
  })
  it('breaks on a missed week', () => {
    const s = weeklyStreaks(set(['2026-10-26', '2026-10-27', '2026-10-28', '2026-11-09']), 3, '2026-11-11')
    expect(s).toEqual({ current: 0, best: 1 })
  })
  it('reports recent weeks hit', () => {
    expect(recentWeeks(set(lastTwoWeeksMet), 3, '2026-11-11', '2026-10-01')).toEqual({ hit: 2, of: 4 })
    expect(recentWeeks(set(lastTwoWeeksMet), 3, '2026-11-11', '2026-11-04')).toEqual({ hit: 1, of: 1 })
  })
})

describe('recent days', () => {
  it('only counts days since the habit was created', () => {
    expect(recentDays(set(['2026-11-10', '2026-11-11']), '2026-11-11', '2026-11-09')).toEqual({ done: 2, of: 3 })
    expect(recentDays(set(['2026-11-11']), '2026-11-11', '2026-01-01').of).toBe(30)
  })
})

const s = (over: Partial<WorkoutSet>): WorkoutSet => ({
  id: Math.random().toString(),
  sessionId: 's1',
  exerciseId: 'deadlift',
  setNumber: 1,
  side: null,
  reps: null,
  weightKg: null,
  durationS: null,
  lengthCm: null,
  pain: null,
  createdAt: '',
  ...over,
})

describe('workout sets', () => {
  const deadlift = getExercise('deadlift')!
  it('summarises same-weight sets compactly', () => {
    const sets = [1, 2, 3, 4].map((n) => s({ setNumber: n, weightKg: 100, reps: n === 4 ? 5 : 6 }))
    expect(describeSets(deadlift, sets)).toBe('100 kg × 6, 6, 6, 5')
  })
  it('suggests adding weight only when every set hit the target reps', () => {
    const rx = { sets: 4, reps: 6, text: '' }
    const all6 = [1, 2, 3, 4].map((n) => s({ setNumber: n, weightKg: 100, reps: 6 }))
    expect(suggestIncrease(deadlift, rx, all6)).toBe(true)
    expect(suggestIncrease(deadlift, rx, [...all6.slice(0, 3), s({ setNumber: 4, weightKg: 100, reps: 5 })])).toBe(false)
    expect(suggestIncrease(deadlift, rx, all6.slice(0, 3))).toBe(false) // fewer sets than planned
  })
  it('tracks the best set per session, per side when asked', () => {
    const sessions: WorkoutSession[] = [
      { id: 'a', date: '2026-11-02', sessionKind: 'mon', extraExerciseIds: [], kneePain: null, kneePainNextMorning: null, notes: '', createdAt: '' },
      { id: 'b', date: '2026-11-09', sessionKind: 'mon', extraExerciseIds: [], kneePain: null, kneePainNextMorning: null, notes: '', createdAt: '' },
    ]
    const sets = [
      s({ sessionId: 'a', weightKg: 90, reps: 6 }),
      s({ sessionId: 'a', weightKg: 95, reps: 5 }),
      s({ sessionId: 'b', weightKg: 100, reps: 6 }),
    ]
    expect(exerciseProgress(deadlift, sessions, sets).map((p) => p.value)).toEqual([95, 100])
    const calf = getExercise('sl-calf-raise-failure')!
    const calfSets = [
      s({ sessionId: 'a', exerciseId: calf.id, side: 'left', reps: 18 }),
      s({ sessionId: 'a', exerciseId: calf.id, side: 'right', reps: 24 }),
    ]
    expect(exerciseProgress(calf, sessions, calfSets, 'left')).toEqual([{ date: '2026-11-02', value: 18, detail: '18' }])
  })
})

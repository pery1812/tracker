import { describe, expect, it } from 'vitest'
import { chartableExercises, makeExerciseLookup, matchesQuery, nameTaken, pickerGroups, plannedExtra } from './exercises'
import type { Exercise } from './program'

const swim: Exercise = { id: 'custom-1', name: 'Swim', fields: ['sec'], custom: true, rx: {} }
const hipThrust: Exercise = { id: 'custom-2', name: 'Hip thrust', fields: ['kg', 'reps'], custom: true, rx: {} }
const lunge: Exercise = { id: 'custom-3', name: 'Walking lunge', fields: ['kg', 'reps'], perSide: true, custom: true, rx: {} }
const mobility: Exercise = { id: 'custom-4', name: 'Hip mobility', fields: [], custom: true, rx: {} }

describe('exercise lookup and search', () => {
  it('finds program and custom exercises by id', () => {
    const find = makeExerciseLookup([swim])
    expect(find('deadlift')?.name).toBe('Barbell deadlift from the floor')
    expect(find('custom-1')).toBe(swim)
    expect(find('nope')).toBeUndefined()
  })
  it('matches every word, ignoring case and punctuation', () => {
    expect(matchesQuery(hipThrust, 'HIP')).toBe(true)
    expect(matchesQuery(hipThrust, 'thrust hip')).toBe(true)
    expect(matchesQuery(hipThrust, 'hip curl')).toBe(false)
    expect(matchesQuery({ ...hipThrust, name: 'Single-leg calf raise' }, 'single leg')).toBe(true)
  })
  it('detects duplicate names', () => {
    expect(nameTaken([swim], '  SWIM ')).toBe(true)
    expect(nameTaken([swim], 'Swim sprints')).toBe(false)
  })
})

describe('picker groups', () => {
  it('lists your exercises first, then program days, without warm-ups or tests', () => {
    const groups = pickerGroups([swim, hipThrust], new Set(), '')
    expect(groups[0]).toEqual({ title: 'Your exercises', exercises: [hipThrust, swim] })
    const all = groups.flatMap((g) => g.exercises.map((e) => e.id))
    expect(all).toContain('deadlift')
    expect(all).not.toContain('joint-routine')
    expect(all.some((x) => x.startsWith('test-'))).toBe(false)
  })
  it('leaves out exercises already in the session and filters by search', () => {
    const groups = pickerGroups([swim], new Set(['deadlift', 'custom-1']), 'dead')
    const all = groups.flatMap((g) => g.exercises.map((e) => e.id))
    expect(all).not.toContain('deadlift')
    expect(all).toContain('rdl') // "Romanian deadlift"
    expect(groups.find((g) => g.title === 'Your exercises')).toBeUndefined()
  })
})

describe('added exercises', () => {
  it('uses the program prescription for the current phase when there is one', () => {
    const find = makeExerciseLookup([])
    expect(plannedExtra(find('deadlift')!, 2).rx.text).toBe('4 × 6, RPE 7')
    expect(plannedExtra(find('deadlift')!, 6).rx.sets).toBe(5)
  })
  it('falls back to 3 sets for your own exercises, 1 for mark-done ones', () => {
    expect(plannedExtra(hipThrust, 2).rx).toEqual({ sets: 3, text: 'Your exercise' })
    expect(plannedExtra(mobility, 2).rx.sets).toBe(1)
    expect(plannedExtra(lunge, 2).perSide).toBe(true)
    expect(plannedExtra(hipThrust, 2).added).toBe(true)
  })
  it('a program exercise outside its phase still gets a plan', () => {
    const find = makeExerciseLookup([])
    expect(plannedExtra(find('wall-sit')!, 6).rx.sets).toBe(3) // wall sit is phase 1 only
  })
  it('includes your own exercises with numbers in the charts, not mark-done ones', () => {
    const ids = chartableExercises([swim, mobility]).map((e) => e.id)
    expect(ids).toContain('custom-1')
    expect(ids).not.toContain('custom-4')
    expect(ids).not.toContain('test-knee-pain')
  })
})

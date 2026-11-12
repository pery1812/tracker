/** Looking up exercises across the program and your own custom ones. Pure functions. */
import { SESSIONS, SESSION_ORDER, programExercises, type Exercise } from './program'
import { phaseForWeek, type PlannedExercise } from './schedule'
import type { Field } from './types'

/** Your own exercises have ids 'custom-<uuid>' so they can never clash with program ids. */
export const CUSTOM_ID_PREFIX = 'custom-'

/** Choices for "what do you log?" when creating an exercise. */
export const FIELD_PRESETS: { label: string; hint: string; fields: Field[] }[] = [
  { label: 'Weight × reps', hint: 'e.g. hip thrust 60 kg × 8', fields: ['kg', 'reps'] },
  { label: 'Reps', hint: 'e.g. push-ups, jumps', fields: ['reps'] },
  { label: 'Time', hint: 'e.g. plank, swim (seconds, up to 60 min)', fields: ['sec'] },
  { label: 'Height or distance', hint: 'in cm, e.g. broad jump', fields: ['cm'] },
  { label: 'Just mark done', hint: 'e.g. mobility, stretching', fields: [] },
]

/** Finds an exercise by id among your own first, then the program. */
export function makeExerciseLookup(custom: Exercise[]): (id: string) => Exercise | undefined {
  const byId = new Map<string, Exercise>()
  for (const e of programExercises()) byId.set(e.id, e)
  for (const e of custom) byId.set(e.id, e)
  return (id) => byId.get(id)
}

const normalise = (s: string) => s.toLowerCase().normalize('NFKD').replace(/[^a-z0-9]+/g, ' ').trim()

export function matchesQuery(exercise: Exercise, query: string): boolean {
  const q = normalise(query)
  if (!q) return true
  const name = normalise(exercise.name)
  return q.split(' ').every((word) => name.includes(word))
}

/** True when your own exercises already include this exact name (ignoring case and spacing). */
export function nameTaken(custom: Exercise[], name: string): boolean {
  const n = normalise(name)
  return custom.some((e) => normalise(e.name) === n)
}

export interface PickerGroup {
  title: string
  exercises: Exercise[]
}

/**
 * Exercises you can add to a session, grouped: your own first, then each program day.
 * Warm-ups, tests and anything already in the session are left out.
 */
export function pickerGroups(custom: Exercise[], excludeIds: Set<string>, query: string): PickerGroup[] {
  const keep = (e: Exercise) => !excludeIds.has(e.id) && matchesQuery(e, query)
  const groups: PickerGroup[] = [
    { title: 'Your exercises', exercises: [...custom].sort((a, b) => a.name.localeCompare(b.name)).filter(keep) },
    ...SESSION_ORDER.map((k) => ({
      title: `Program · ${SESSIONS[k].title}`,
      exercises: SESSIONS[k].exercises.filter((e) => !e.warmup).filter(keep),
    })),
  ]
  return groups.filter((g) => g.exercises.length > 0)
}

/**
 * An exercise added by hand: uses the program's prescription for this phase when it has one,
 * otherwise 3 sets (1 for "just mark done") with nothing pre-filled except your last numbers.
 */
export function plannedExtra(exercise: Exercise, week: number): PlannedExercise {
  const rx = exercise.rx[phaseForWeek(week)]
  const perSide = rx?.perSide ?? Boolean(exercise.perSide)
  return {
    exercise,
    rx: rx ?? {
      sets: exercise.fields.length ? 3 : 1,
      text: exercise.custom ? 'Your exercise' : 'Added (not in this phase’s plan)',
    },
    label: '+',
    perSide,
    isTest: false,
    added: true,
  }
}

/** Exercises that can have a progress chart: anything with a number logged, tests excluded. */
export function chartableExercises(custom: Exercise[]): Exercise[] {
  return [...programExercises(), ...custom].filter((e) => e.fields.length > 0 && !e.id.startsWith('test-'))
}

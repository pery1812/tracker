import { useCallback } from 'react'
import * as storage from '../lib/storage'
import type { DateKey, WorkoutSessionUpdate, WorkoutSet, WorkoutSetInput } from '../lib/types'
import { useLiveQuery } from './useLiveQuery'

export function useProgramSettings() {
  const { data, reload } = useLiveQuery(() => storage.getProgramSettings(), [], ['program_settings'])
  const saveStart = useCallback(
    async (date: DateKey) => {
      await storage.saveProgramStart(date)
      reload()
    },
    [reload],
  )
  // `undefined` while loading, `null` when not set yet.
  return { settings: data, saveStart }
}

/** Sessions in a date range plus all their sets. */
export function useWorkoutHistory(from: DateKey, to: DateKey) {
  const { data } = useLiveQuery(
    async () => {
      const sessions = await storage.listWorkoutSessions(from, to)
      const sets = await storage.listWorkoutSets(sessions.map((s) => s.id))
      return { sessions, sets }
    },
    [from, to],
    ['workout_sessions', 'workout_sets'],
  )
  return data
}

/** One session and its sets, with optimistic set logging. */
export function useWorkoutSession(id: string) {
  const { data, setData, reload } = useLiveQuery(
    async () => {
      const session = await storage.getWorkoutSession(id)
      const sets = session ? await storage.listWorkoutSets([id]) : []
      return { session, sets }
    },
    [id],
    ['workout_sessions', 'workout_sets'],
  )

  const patchSets = useCallback(
    (fn: (sets: WorkoutSet[]) => WorkoutSet[]) => setData((d) => (d ? { ...d, sets: fn(d.sets) } : d)),
    [setData],
  )

  const addSet = useCallback(
    async (input: WorkoutSetInput) => {
      const temp: WorkoutSet = { ...input, id: `pending-${Math.random()}`, createdAt: new Date().toISOString() }
      patchSets((sets) => [...sets, temp])
      try {
        const saved = await storage.addWorkoutSet(input)
        patchSets((sets) => sets.map((s) => (s.id === temp.id ? saved : s)))
      } catch (err) {
        patchSets((sets) => sets.filter((s) => s.id !== temp.id))
        throw err
      }
    },
    [patchSets],
  )

  const deleteSet = useCallback(
    async (set: WorkoutSet) => {
      if (set.id.startsWith('pending-')) return
      patchSets((sets) => sets.filter((s) => s.id !== set.id))
      try {
        await storage.deleteWorkoutSet(set.id)
      } catch (err) {
        patchSets((sets) => [...sets, set])
        throw err
      }
    },
    [patchSets],
  )

  const updateSession = useCallback(
    async (update: WorkoutSessionUpdate) => {
      setData((d) => (d?.session ? { ...d, session: { ...d.session, ...update } } : d))
      try {
        await storage.updateWorkoutSession(id, update)
      } catch (err) {
        reload()
        throw err
      }
    },
    [id, setData, reload],
  )

  const deleteSession = useCallback(() => storage.deleteWorkoutSession(id), [id])

  return { session: data?.session, sets: data?.sets ?? [], loading: data === undefined, addSet, deleteSet, updateSession, deleteSession }
}

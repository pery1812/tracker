import { useCallback, useEffect, useState } from 'react'
import * as storage from '../lib/storage'
import type { Habit, HabitInput } from '../lib/types'

/**
 * Loads habits and exposes create/update/delete. All persistence goes through lib/storage.
 * Changes made on another device arrive via storage.subscribeToChanges.
 */
export function useHabits() {
  const [habits, setHabits] = useState<Habit[]>([])
  const [loading, setLoading] = useState(true)
  // Bumped to trigger a reload (after a mutation, or a change from another device).
  const [version, setVersion] = useState(0)
  const reload = useCallback(() => setVersion((v) => v + 1), [])

  useEffect(() => {
    let cancelled = false
    storage.listHabits().then((rows) => {
      if (cancelled) return
      setHabits(rows)
      setLoading(false)
    })
    return () => {
      cancelled = true
    }
  }, [version])

  useEffect(() => storage.subscribeToChanges('habits', reload), [reload])

  const createHabit = useCallback(
    async (input: HabitInput) => {
      await storage.createHabit(input)
      reload()
    },
    [reload],
  )

  const updateHabit = useCallback(
    async (id: string, input: HabitInput) => {
      await storage.updateHabit(id, input)
      reload()
    },
    [reload],
  )

  const deleteHabit = useCallback(
    async (id: string) => {
      await storage.deleteHabit(id)
      reload()
    },
    [reload],
  )

  return { habits, loading, createHabit, updateHabit, deleteHabit, reload }
}

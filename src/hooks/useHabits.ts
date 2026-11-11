import { useCallback, useEffect, useState } from 'react'
import * as storage from '../lib/storage'
import type { Habit, HabitInput } from '../lib/types'

/** Loads habits and exposes create/update/delete. All persistence goes through lib/storage. */
export function useHabits() {
  const [habits, setHabits] = useState<Habit[]>([])
  const [loading, setLoading] = useState(true)
  // Bumped after each mutation to trigger a reload.
  const [version, setVersion] = useState(0)

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

  const createHabit = useCallback(async (input: HabitInput) => {
    await storage.createHabit(input)
    setVersion((v) => v + 1)
  }, [])

  const updateHabit = useCallback(async (id: string, input: HabitInput) => {
    await storage.updateHabit(id, input)
    setVersion((v) => v + 1)
  }, [])

  const deleteHabit = useCallback(async (id: string) => {
    await storage.deleteHabit(id)
    setVersion((v) => v + 1)
  }, [])

  return { habits, loading, createHabit, updateHabit, deleteHabit }
}

import { useCallback, useEffect, useState } from 'react'
import * as storage from '../lib/storage'
import type { Completion, DateKey } from '../lib/types'

/** Loads completion records for an inclusive date range and exposes add/remove. */
export function useCompletions(from: DateKey, to: DateKey) {
  const [completions, setCompletions] = useState<Completion[]>([])
  // Bumped after each mutation to trigger a reload.
  const [version, setVersion] = useState(0)

  useEffect(() => {
    let cancelled = false
    storage.listCompletions(from, to).then((rows) => {
      if (!cancelled) setCompletions(rows)
    })
    return () => {
      cancelled = true
    }
  }, [from, to, version])

  const addCompletion = useCallback(async (habitId: string, date: DateKey) => {
    await storage.addCompletion(habitId, date)
    setVersion((v) => v + 1)
  }, [])

  const deleteCompletion = useCallback(async (id: string) => {
    await storage.deleteCompletion(id)
    setVersion((v) => v + 1)
  }, [])

  return { completions, addCompletion, deleteCompletion }
}

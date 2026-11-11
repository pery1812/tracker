import { useCallback, useEffect, useState } from 'react'
import * as storage from '../lib/storage'
import type { Completion, DateKey } from '../lib/types'

/**
 * Loads completion records for an inclusive date range and exposes add/remove.
 * Taps update the screen immediately (optimistic), then the list is reloaded from the server.
 * Changes made on another device arrive via storage.subscribeToChanges.
 */
export function useCompletions(from: DateKey, to: DateKey) {
  const [completions, setCompletions] = useState<Completion[]>([])
  // Bumped to trigger a reload (after a mutation, or a change from another device).
  const [version, setVersion] = useState(0)
  const reload = useCallback(() => setVersion((v) => v + 1), [])

  useEffect(() => {
    let cancelled = false
    storage.listCompletions(from, to).then((rows) => {
      if (!cancelled) setCompletions(rows)
    })
    return () => {
      cancelled = true
    }
  }, [from, to, version])

  useEffect(() => storage.subscribeToChanges('completions', reload), [reload])

  const addCompletion = useCallback(
    async (habitId: string, date: DateKey) => {
      const temp: Completion = { id: `pending-${habitId}-${date}`, habitId, date, createdAt: new Date().toISOString() }
      setCompletions((prev) => [...prev, temp])
      try {
        await storage.addCompletion(habitId, date)
        reload()
      } catch (err) {
        // Put the screen back as it was so it never shows a tap that wasn't saved.
        setCompletions((prev) => prev.filter((c) => c.id !== temp.id))
        throw err
      }
    },
    [reload],
  )

  const deleteCompletion = useCallback(
    async (id: string) => {
      // A tap that hasn't finished saving yet has no real id; it will reappear on reload.
      if (id.startsWith('pending-')) return
      const removed = completions.find((c) => c.id === id)
      setCompletions((prev) => prev.filter((c) => c.id !== id))
      try {
        await storage.deleteCompletion(id)
        reload()
      } catch (err) {
        if (removed) setCompletions((prev) => [...prev, removed])
        throw err
      }
    },
    [completions, reload],
  )

  return { completions, addCompletion, deleteCompletion }
}

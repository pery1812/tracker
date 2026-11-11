import { useCallback, useEffect, useState, type DependencyList } from 'react'
import { subscribeToChanges } from '../lib/storage'

type SyncedTable = Parameters<typeof subscribeToChanges>[0]

/**
 * Runs `load` (a storage call), re-runs it when `deps` change, after `reload()`, and whenever
 * one of `tables` changes on any device. Errors surface in the global ErrorBanner.
 */
export function useLiveQuery<T>(load: () => Promise<T>, deps: DependencyList, tables: SyncedTable[]) {
  const [data, setData] = useState<T | undefined>(undefined)
  const [version, setVersion] = useState(0)
  const reload = useCallback(() => setVersion((v) => v + 1), [])

  useEffect(() => {
    let cancelled = false
    load().then((result) => {
      if (!cancelled) setData(result)
    })
    return () => {
      cancelled = true
    }
    // `load` is recreated every render; `deps` says when it actually changes.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [...deps, version])

  const tableKey = tables.join(',')
  useEffect(() => {
    const unsubscribers = tableKey.split(',').map((t) => subscribeToChanges(t as SyncedTable, reload))
    return () => unsubscribers.forEach((u) => u())
  }, [tableKey, reload])

  return { data, setData, reload }
}

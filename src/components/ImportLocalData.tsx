import { useEffect, useState } from 'react'
import { discardLocalData, getLocalDataToImport, importLocalData } from '../lib/storage'

/** Offers a one-time copy of habits saved in this browser before the move to Supabase. */
export function ImportLocalData() {
  const [counts, setCounts] = useState<{ habits: number; completions: number } | null>(null)
  const [busy, setBusy] = useState(false)

  useEffect(() => {
    getLocalDataToImport().then((c) => setCounts(c.habits > 0 ? c : null))
  }, [])

  if (!counts) return null

  async function handleImport() {
    setBusy(true)
    try {
      await importLocalData()
      window.location.reload()
    } catch (err) {
      setBusy(false)
      throw err
    }
  }

  return (
    <div className="mb-6 rounded-2xl bg-sky-50 p-4 text-sm text-sky-950 ring-1 ring-sky-200 dark:bg-sky-950 dark:text-sky-50 dark:ring-sky-900">
      <p className="mb-3">
        This device has <strong>{counts.habits}</strong> habit{counts.habits === 1 ? '' : 's'} and{' '}
        <strong>{counts.completions}</strong> completion{counts.completions === 1 ? '' : 's'} saved from before syncing.
        Copy them to your account?
      </p>
      <div className="flex gap-2">
        <button
          type="button"
          disabled={busy}
          onClick={handleImport}
          className="rounded-lg bg-sky-600 px-4 py-2.5 font-semibold text-white disabled:opacity-50"
        >
          {busy ? 'Importing…' : 'Import'}
        </button>
        <button
          type="button"
          disabled={busy}
          onClick={() => {
            discardLocalData()
            setCounts(null)
          }}
          className="rounded-lg px-4 py-2.5 font-semibold text-sky-800 dark:text-sky-200"
        >
          Discard
        </button>
      </div>
    </div>
  )
}

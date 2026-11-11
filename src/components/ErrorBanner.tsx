import { useEffect, useState } from 'react'

/**
 * Shows any failed save or load (e.g. no signal on the phone) instead of failing silently.
 * Storage functions throw on error; anything not caught by a page ends up here.
 */
export function ErrorBanner() {
  const [message, setMessage] = useState<string | null>(null)

  useEffect(() => {
    const onRejection = (e: PromiseRejectionEvent) => {
      const reason = e.reason as { message?: string } | undefined
      setMessage(reason?.message || 'Something went wrong')
    }
    window.addEventListener('unhandledrejection', onRejection)
    return () => window.removeEventListener('unhandledrejection', onRejection)
  }, [])

  if (!message) return null

  return (
    <div
      role="alert"
      className="fixed inset-x-4 top-[max(1rem,env(safe-area-inset-top))] z-30 mx-auto flex max-w-md items-start gap-3 rounded-2xl bg-red-600 p-4 text-sm text-white shadow-lg"
    >
      <p className="flex-1">
        <strong className="block">Couldn't sync</strong>
        {message}
      </p>
      <button type="button" onClick={() => setMessage(null)} className="font-semibold underline">
        Dismiss
      </button>
    </div>
  )
}

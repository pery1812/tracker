import { useState, type FormEvent } from 'react'
import { signIn } from '../lib/auth'
import { isSupabaseConfigured } from '../lib/supabase'

export function SignInPage() {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [busy, setBusy] = useState(false)

  async function handleSubmit(e: FormEvent) {
    e.preventDefault()
    setBusy(true)
    setError(null)
    try {
      await signIn(email.trim(), password)
      // useSession picks up the new session and the app renders.
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Sign-in failed')
      setBusy(false)
    }
  }

  const input =
    'w-full rounded-xl border border-slate-300 bg-transparent px-4 py-3 text-base outline-none focus:border-slate-900 dark:border-slate-700 dark:focus:border-white'

  return (
    <main className="flex min-h-dvh items-center justify-center px-4 py-10">
      <div className="w-full max-w-sm">
        <h1 className="mb-1 text-3xl font-bold tracking-tight">Habit Tracker</h1>
        <p className="mb-8 text-slate-500 dark:text-slate-400">Sign in to sync your phone and laptop.</p>

        {!isSupabaseConfigured ? (
          <div className="rounded-2xl bg-amber-50 p-5 text-sm text-amber-900 ring-1 ring-amber-200 dark:bg-amber-950 dark:text-amber-100 dark:ring-amber-900">
            <p className="mb-2 font-semibold">Supabase isn't connected yet.</p>
            <p>
              Copy <code>.env.example</code> to <code>.env.local</code>, fill in your project URL and publishable key,
              then restart <code>npm run dev</code>. On Vercel, add the same two variables in Project Settings →
              Environment Variables and redeploy.
            </p>
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="flex flex-col gap-4">
            <input
              type="email"
              autoComplete="email"
              required
              placeholder="Email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className={input}
            />
            <input
              type="password"
              autoComplete="current-password"
              required
              placeholder="Password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className={input}
            />
            {error && <p className="text-sm text-red-600 dark:text-red-400">{error}</p>}
            <button
              type="submit"
              disabled={busy}
              className="mt-2 w-full rounded-xl bg-slate-900 py-3.5 font-semibold text-white disabled:opacity-40 dark:bg-white dark:text-slate-900"
            >
              {busy ? 'Signing in…' : 'Sign in'}
            </button>
          </form>
        )}
      </div>
    </main>
  )
}

import type { Session } from '@supabase/supabase-js'
import { useEffect, useState } from 'react'
import { getSession, onSessionChange } from '../lib/auth'

/** `undefined` while checking, `null` when signed out. */
export function useSession(): Session | null | undefined {
  const [session, setSession] = useState<Session | null | undefined>(undefined)

  useEffect(() => {
    let cancelled = false
    getSession().then((s) => {
      if (!cancelled) setSession(s)
    })
    const unsubscribe = onSessionChange((s) => setSession(s))
    return () => {
      cancelled = true
      unsubscribe()
    }
  }, [])

  return session
}

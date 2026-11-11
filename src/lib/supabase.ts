import { createClient } from '@supabase/supabase-js'

const url = import.meta.env.VITE_SUPABASE_URL as string | undefined
const key = import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY as string | undefined

/** False when .env.local (or the Vercel env vars) are missing; the app shows setup instructions instead. */
export const isSupabaseConfigured = Boolean(url && key)

// The placeholder values only keep createClient from throwing; nothing is called while unconfigured.
export const supabase = createClient(url || 'http://localhost', key || 'missing-key', {
  auth: {
    // supabase-js keeps the login session in localStorage itself, so you stay signed in.
    persistSession: true,
    autoRefreshToken: true,
  },
})

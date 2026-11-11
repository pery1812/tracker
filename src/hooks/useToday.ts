import { useEffect, useState } from 'react'
import { todayKey } from '../lib/dates'
import type { DateKey } from '../lib/types'

/**
 * Today's local date key. Re-checks when the tab becomes visible again and once a minute,
 * so a page left open overnight (common on a phone) rolls over to the new day.
 */
export function useToday(): DateKey {
  const [today, setToday] = useState(todayKey)

  useEffect(() => {
    const check = () => setToday(todayKey())
    const timer = window.setInterval(check, 60_000)
    document.addEventListener('visibilitychange', check)
    return () => {
      window.clearInterval(timer)
      document.removeEventListener('visibilitychange', check)
    }
  }, [])

  return today
}

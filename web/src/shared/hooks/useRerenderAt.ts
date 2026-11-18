import { useEffect, useState } from 'react'

// Windows are open intervals (start, end), so wake just past the edge.
const PAST_EDGE_MS = 500
// setTimeout overflows above 2^31-1 ms (~24.8 days) and would fire at once.
const MAX_DELAY_MS = 2 ** 31 - 1

/**
 * Re-renders the caller once the clock passes each of `times` (ISO strings),
 * and whenever the page returns to the foreground. Screens that read
 * `new Date()` while rendering — "is the round open yet?" — then flip at the
 * opening second instead of waiting for a refresh. The foreground check covers
 * phones, which pause timers while the PWA sits in the background.
 */
export function useRerenderAt(times: readonly string[]): void {
  const [tick, setTick] = useState(0)
  const key = times.join('|')

  useEffect(() => {
    const now = Date.now()
    const next = Math.min(
      ...key
        .split('|')
        .map((time) => new Date(time).getTime() + PAST_EDGE_MS)
        .filter((wake) => Number.isFinite(wake) && wake > now),
    )
    if (!Number.isFinite(next)) return
    const timer = setTimeout(() => setTick((n) => n + 1), Math.min(next - now, MAX_DELAY_MS))
    return () => clearTimeout(timer)
  }, [key, tick])

  useEffect(() => {
    const onVisible = () => {
      if (document.visibilityState === 'visible') setTick((n) => n + 1)
    }
    document.addEventListener('visibilitychange', onVisible)
    return () => document.removeEventListener('visibilitychange', onVisible)
  }, [])
}

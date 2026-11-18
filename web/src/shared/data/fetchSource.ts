import { apiGet } from '../api/http'
import type { LiveSource } from './live'

/**
 * How often a mounted screen reads again. Firestore pushed every change; the
 * REST server does not, so a screen left open learns of a change (the round
 * being closed, say) at the next refresh instead of at once.
 */
const REFRESH_MS = 30_000

/**
 * A `LiveSource` that reads `path` from the student server: once when the
 * first reader arrives, then every `REFRESH_MS` and whenever the tab becomes
 * visible again. The server answers in the screen types
 * (`shared/types`), so there is no mapping step.
 *
 * A refresh that fails keeps the last value on screen; only a failed first
 * read is reported as an error.
 */
export function fetchSource<T>(path: string): LiveSource<T> {
  return ({ next, fail }) => {
    let stopped = false
    let hasValue = false

    const stop = () => {
      stopped = true
      clearInterval(timer)
      document.removeEventListener('visibilitychange', onVisible)
    }
    const read = () => {
      apiGet<T>(path).then(
        (data) => {
          if (stopped) return
          hasValue = true
          next(data)
        },
        (error) => {
          if (stopped || hasValue) return
          stop()
          fail(error instanceof Error ? error : new Error(String(error)))
        },
      )
    }
    const onVisible = () => {
      if (document.visibilityState === 'visible') read()
    }

    const timer = setInterval(read, REFRESH_MS)
    document.addEventListener('visibilitychange', onVisible)
    read()
    return stop
  }
}

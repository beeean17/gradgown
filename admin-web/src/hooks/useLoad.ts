import { useCallback, useEffect, useState } from 'react'
import type { LoadState } from '../contracts/admin-view.ts'
import { errorMessage } from '../data/format.ts'
export function useLoad<T>(loader: () => Promise<T>) {
  const [state, setState] = useState<LoadState<T>>({ status: 'loading' })
  const [revision, setRevision] = useState(0)
  useEffect(() => {
    let stale = false
    setState({ status: 'loading' })
    loader().then(data => { if (!stale) setState({ status: 'ready', data }) }).catch(error => { if (!stale) setState({ status: 'error', message: errorMessage(error) }) })
    return () => { stale = true }
  }, [loader, revision])
  return { state, refresh: useCallback(() => setRevision(n => n + 1), []) }
}

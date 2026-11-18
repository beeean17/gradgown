import { useEffect, useState } from 'react'
/** The value once it has stopped changing: a search box asks the server when typing pauses, not on every key. */
export function useDebounced<T>(value: T, delay = 300): T {
  const [settled, setSettled] = useState(value)
  useEffect(() => { const timer = setTimeout(() => setSettled(value), delay); return () => clearTimeout(timer) }, [value, delay])
  return settled
}

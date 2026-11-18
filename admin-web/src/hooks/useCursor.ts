import { useState } from 'react'
/**
 * Where a list the server pages by cursor is. A cursor belongs to the query that produced it,
 * so `key` names that query: once it changes, the list is back on its first page.
 */
export function useCursor(key: string) {
  const [position, setPosition] = useState<{ key: string; cursor: string | null; page: number }>({ key, cursor: null, page: 1 })
  const { cursor, page } = position.key === key ? position : { cursor: null, page: 1 }
  return { cursor, page, first: () => setPosition({ key, cursor: null, page: 1 }), next: (nextCursor: string) => setPosition({ key, cursor: nextCursor, page: page + 1 }) }
}

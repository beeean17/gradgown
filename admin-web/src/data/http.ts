/**
 * An answer that is not a success. `code` is the server's error code
 * (docs/contracts/web-api.md "오류"), or `unavailable` when no such answer came back.
 */
export class ApiError extends Error {
  readonly code: string
  readonly status: number
  constructor(code: string, message: string, status: number) {
    super(message)
    this.name = 'ApiError'
    this.code = code
    this.status = status
  }
}

/** A query string from the values that are set. `0` is a value; null, undefined and '' are not. */
export function query(params: Record<string, string | number | null | undefined>): string {
  const search = new URLSearchParams()
  for (const [name, value] of Object.entries(params)) if (value !== null && value !== undefined && value !== '') search.set(name, String(value))
  const text = search.toString()
  return text ? `?${text}` : ''
}

/**
 * One JSON request to the admin server. Paths are relative (`/api/...`): the Vite dev server
 * proxies them (vite.config.ts), so the session cookie stays same-origin.
 */
export async function request<T>(method: 'GET' | 'POST' | 'PUT', path: string, body?: unknown): Promise<T> {
  const init: RequestInit = body === undefined
    ? { method, credentials: 'same-origin', headers: { Accept: 'application/json' } }
    : { method, credentials: 'same-origin', headers: { Accept: 'application/json', 'Content-Type': 'application/json' }, body: JSON.stringify(body) }
  let response: Response
  try { response = await fetch(path, init) } catch { throw new ApiError('unavailable', '', 0) }
  const text = await response.text()
  let data: unknown
  try { data = JSON.parse(text) } catch { /* Not JSON: the proxy answering for a server that is not running. */ }
  if (response.ok && data !== undefined) return data as T
  const error: { code?: unknown; message?: unknown } = data && typeof data === 'object' ? data : {}
  throw new ApiError(typeof error.code === 'string' ? error.code : 'unavailable', typeof error.message === 'string' ? error.message : '', response.status)
}

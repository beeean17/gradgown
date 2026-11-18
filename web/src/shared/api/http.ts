/**
 * Calls to the student server (docs/contracts/web-api.md). The paths are
 * relative: the Vite dev server proxies `/api` to the server, so the session
 * cookie is a same-origin cookie.
 */

/** A request the server answered with an error body, or could not answer. */
export class ApiError extends Error {
  /** HTTP status; 0 when no response arrived. */
  readonly status: number
  /** The `code` of the error body (`already-exists`, …); '' when there was none. */
  readonly code: string
  readonly operationId: string

  constructor(status: number, code: string, message: string, operationId = '') {
    super(message)
    this.status = status
    this.code = code
    this.operationId = operationId
  }
}

/** Fired when a request that needs a session finds none (the server restarted, or signed out elsewhere). */
export const SESSION_LOST_EVENT = 'grad42:session-lost'

const text = (value: unknown): string => (typeof value === 'string' ? value : '')

async function request<T>(method: string, path: string, body?: unknown): Promise<T> {
  let response: Response
  try {
    response = await fetch(path, {
      method,
      credentials: 'same-origin',
      headers: body === undefined ? { Accept: 'application/json' } : { Accept: 'application/json', 'Content-Type': 'application/json' },
      body: body === undefined ? undefined : JSON.stringify(body),
    })
  } catch {
    throw new ApiError(0, '', '서버에 연결하지 못했어요.')
  }

  const raw = await response.text()
  let payload: unknown = null
  try {
    payload = raw ? JSON.parse(raw) : null
  } catch {
    // Not JSON: the dev proxy answers in plain text when the server is down.
    payload = null
  }

  if (!response.ok) {
    const error = payload && typeof payload === 'object' ? (payload as Record<string, unknown>) : {}
    if (response.status === 401 && !path.startsWith('/api/auth/') && path !== '/api/me') {
      window.dispatchEvent(new Event(SESSION_LOST_EVENT))
    }
    throw new ApiError(response.status, text(error.code), text(error.message), text(error.operationId))
  }
  return payload as T
}

export function apiGet<T>(path: string): Promise<T> {
  return request<T>('GET', path)
}

export function apiSend<T>(method: 'POST' | 'PUT', path: string, body: unknown): Promise<T> {
  return request<T>(method, path, body)
}

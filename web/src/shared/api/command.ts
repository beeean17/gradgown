import { ApiError, apiSend } from './http'
import { currentUser } from '../auth/useAuth'
import { refreshLive } from '../data/live'

/**
 * The student's one write path. Reservations and St:talk registrations are
 * both written by a command of the student server that validates, audits and
 * de-duplicates in one transaction; this module is the part of sending one
 * that does not depend on the domain. In the original service the commands
 * were Firebase callables (`reservationCommand`, `mentoringCommand`); the error
 * codes are the same, so the classification below did not change.
 */

export interface CommandResponse {
  success: true
  operationId: string
  status: 'reserved' | 'cancelled'
  replayed: boolean
}

/**
 * - `rejected`: the server read the request and said no (period closed, slot
 *   gone, already reserved, stale version). Safe to show and correct.
 * - `unknown`: the request may or may not have been applied (network drop,
 *   timeout). Re-sending with the SAME operation id is safe — the server
 *   replays a finished success instead of creating a second document.
 * - `failed`: the server failed and said so; a new attempt needs a new id.
 */
export type CommandFailureKind = 'rejected' | 'unknown' | 'failed'

export class CommandError extends Error {
  readonly kind: CommandFailureKind
  readonly code: string
  readonly operationId: string

  constructor(kind: CommandFailureKind, code: string, message: string, operationId: string) {
    super(message)
    this.kind = kind
    this.code = code
    this.operationId = operationId
  }
}

/** 16–128 chars of `[A-Za-z0-9_-]`, as the server requires. Also the new document id. */
export function newOperationId(): string {
  return crypto.randomUUID()
}

/**
 * What to tell the student about a failed command. `failed` carries the
 * request id so operations can find it in the audit log; `unknown` keeps the
 * operation id so a retry replays instead of duplicating.
 */
export function describeCommandError(
  error: unknown,
  fallback = '요청을 처리하지 못했어요. 잠시 후 다시 시도해 주세요.',
): { message: string; keepOperation: boolean } {
  if (error instanceof CommandError) {
    return {
      message: error.kind === 'failed' ? `${error.message} (요청 ID ${error.operationId})` : error.message,
      keepOperation: error.kind === 'unknown',
    }
  }
  return { message: fallback, keepOperation: false }
}

function classify(error: unknown, operationId: string, unknownMessage: string): CommandError {
  // An `ApiError` without a code did not come from the server's own error
  // handler: there was no connection, or the dev proxy reported that the server
  // is down. Whether the command ran is then unknown.
  const code = error instanceof ApiError ? error.code : ''
  const serverMessage = error instanceof ApiError ? error.message : ''
  const isTransport = code === 'internal' && serverMessage === ''

  if (isTransport || code === 'unavailable' || code === 'deadline-exceeded' || code === '') {
    return new CommandError('unknown', code || 'network', unknownMessage, operationId)
  }
  if (code === 'aborted' && /처리 중/.test(serverMessage)) {
    // The first attempt with this id is still running on the server.
    return new CommandError('unknown', code, '앞선 요청을 처리하고 있어요. 잠시 후 내 신청을 확인해 주세요.', operationId)
  }
  if (code === 'unauthenticated') {
    return new CommandError(
      'rejected',
      code,
      '로그인 상태나 보안 확인이 만료되었어요. 페이지를 새로고침한 뒤 다시 시도해 주세요.',
      operationId,
    )
  }
  if (code === 'internal') {
    return new CommandError('failed', code, serverMessage, operationId)
  }
  return new CommandError('rejected', code, serverMessage || '요청을 처리하지 못했어요.', operationId)
}

/** Where each command of the original callables lives on the student server. */
const ROUTES: Record<string, { method: 'POST' | 'PUT'; path: (id: string) => string }> = {
  'reservation.create': { method: 'POST', path: () => '/api/gown/reservations' },
  'reservation.update': { method: 'PUT', path: (id) => `/api/gown/reservations/${id}` },
  'reservation.cancel': { method: 'POST', path: (id) => `/api/gown/reservations/${id}/cancel` },
  'mentoring.create': { method: 'POST', path: () => '/api/mentoring/registrations' },
  'mentoring.update': { method: 'PUT', path: (id) => `/api/mentoring/registrations/${id}` },
  'mentoring.cancel': { method: 'POST', path: (id) => `/api/mentoring/registrations/${id}/cancel` },
}

/**
 * Sends one command to the student server and returns its success body, or
 * throws a classified `CommandError`.
 *
 * The request keeps the shape the callables took (`action`, `key`, `version`,
 * `input`), so the callers did not change. Here the action picks the route and
 * the key becomes the ID in the path, as docs/contracts/web-api.md lays out.
 *
 * Whatever the outcome, the user's lists are read again afterwards. Firestore
 * pushed the new row (or, after a conflict, the newer version) by itself; a
 * REST server has to be asked.
 *
 * A `failed-precondition` means the round or event is not what this screen
 * shows (closed meanwhile, window over, slot removed), so those settings are
 * read again as well instead of waiting for the next periodic refresh.
 */
export async function sendCommand<R extends CommandResponse>(
  request: Record<string, unknown> & { operationId: string },
  unknownMessage: string,
): Promise<R> {
  const user = currentUser()
  if (!user) throw new CommandError('rejected', 'unauthenticated', '로그인이 필요해요.', request.operationId)

  const { action, key, ...body } = request
  const route = ROUTES[String(action)]
  if (!route) throw new CommandError('rejected', 'invalid-argument', '요청을 처리하지 못했어요.', request.operationId)
  const id = key && typeof key === 'object' ? String(Object.values(key)[0] ?? '') : ''

  let settingsChanged = false
  try {
    return await apiSend<R>(route.method, route.path(encodeURIComponent(id)), body)
  } catch (error) {
    const failure = classify(error, request.operationId, unknownMessage)
    settingsChanged = failure.code === 'failed-precondition'
    throw failure
  } finally {
    refreshLive(
      (liveKey) => liveKey.startsWith(`user:${user.uid}:`) || (settingsChanged && liveKey.startsWith('doc:settings/')),
    )
  }
}

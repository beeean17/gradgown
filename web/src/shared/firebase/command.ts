import { httpsCallable } from 'firebase/functions'
import { firebase, startAppCheck } from './runtime'
import { currentFirebaseUser } from '../auth/useAuth'
import { ensureProfile } from '../auth/profile'

/**
 * The student's one write path. Reservations and St:talk registrations are
 * both written by a server command (`reservationCommand`, `mentoringCommand`)
 * that validates, audits and de-duplicates in one transaction; this module is
 * the part of calling one that does not depend on the domain.
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
  const raw = typeof error === 'object' && error && 'code' in error ? String((error as { code: unknown }).code) : ''
  const code = raw.replace(/^functions\//, '')
  const serverMessage = error instanceof Error ? error.message : ''
  // The callable client reports a dropped connection as a bare `internal`.
  const isTransport = code === 'internal' && (serverMessage === 'internal' || serverMessage === '')

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

/**
 * Sends one command. Guarantees the preconditions every command shares —
 * a signed-in user, their `users/{uid}` profile, an App Check token — and
 * turns a thrown callable error into a classified `CommandError`.
 */
export async function sendCommand<R extends CommandResponse>(
  functionName: string,
  request: Record<string, unknown> & { operationId: string },
  unknownMessage: string,
): Promise<R> {
  const user = currentFirebaseUser()
  if (!user) throw new CommandError('rejected', 'unauthenticated', '로그인이 필요해요.', request.operationId)
  try {
    // The command refuses accounts without `users/{uid}`; never race its creation.
    await ensureProfile(user)
  } catch {
    throw new CommandError('failed', 'profile', '사용자 정보를 준비하지 못했어요. 새로고침 후 다시 시도해 주세요.', request.operationId)
  }
  // The command rejects calls without an App Check token; usually it started
  // when the session did, this covers a command sent before that.
  startAppCheck()
  const call = httpsCallable<typeof request, R>(firebase().functions, functionName, { timeout: 60_000 })
  try {
    const result = await call(request)
    return result.data
  } catch (error) {
    throw classify(error, request.operationId, unknownMessage)
  }
}

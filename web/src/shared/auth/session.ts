import { ApiError, apiGet, apiSend } from '../api/http'
import { stopLive } from '../data/live'
import { PATHS } from '../../app/routes/paths'
import { announceSignedOut, currentUser, freezeAuth, setSignedIn, type Me } from './useAuth'

/**
 * Test login (docs/decisions/test-login.md). The login screen lists the seeded
 * student accounts and signs in as the one picked. There is no password and
 * no Google account: authentication is not what this project is about.
 */

/** A seeded account the login screen offers. */
export interface TestAccount {
  email: string
  role: string
}

export class SignInError extends Error {}

export function listTestAccounts(): Promise<TestAccount[]> {
  return apiGet<TestAccount[]>('/api/auth/accounts')
}

/** Signs in as the account and updates the auth state every screen reads. */
export async function signInAs(email: string): Promise<void> {
  try {
    setSignedIn(await apiSend<Me>('POST', '/api/auth/login', { email }))
  } catch (error) {
    const reason = error instanceof ApiError ? error.message : ''
    throw new SignInError(reason || '로그인하지 못했어요. 잠시 후 다시 시도해 주세요.')
  }
}

/**
 * Signs out and reloads at the home screen, so every screen starts again as a
 * guest. The user's streams are closed first: they would only fail with 401
 * once the session is gone.
 */
export async function signOutAndReload(): Promise<void> {
  const uid = currentUser()?.uid
  freezeAuth()
  if (uid) stopLive((key) => key.includes(`user:${uid}:`))
  try {
    await apiSend('POST', '/api/auth/logout', {})
    announceSignedOut()
  } catch (error) {
    console.error('[grad42] 로그아웃하지 못했습니다.', error)
  }
  window.location.replace(PATHS.home)
}

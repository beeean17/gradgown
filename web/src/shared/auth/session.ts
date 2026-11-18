import {
  browserPopupRedirectResolver,
  GoogleAuthProvider,
  getRedirectResult,
  signInWithPopup,
  signInWithRedirect,
  signOut,
} from 'firebase/auth'
import { firebase } from '../firebase/runtime'
import { stopLive } from '../data/live'
import { PATHS } from '../../app/routes/paths'
import { safeRedirectTo } from '../../app/routes/redirectTo'
import { currentFirebaseUser, freezeAuth } from './useAuth'

export type SignInOutcome = 'signed-in' | 'redirecting' | 'cancelled'

/** A sign-in failure with a message that can be shown as-is. */
export class SignInError extends Error {}

const RETURN_KEY = 'grad42:return-to'

const CANCELLED = new Set(['auth/popup-closed-by-user', 'auth/cancelled-popup-request', 'auth/user-cancelled'])
const NEEDS_REDIRECT = new Set([
  'auth/popup-blocked',
  'auth/operation-not-supported-in-this-environment',
  'auth/web-storage-unsupported',
])

function errorCode(error: unknown): string {
  return typeof error === 'object' && error && 'code' in error ? String((error as { code: unknown }).code) : ''
}

function messageFor(code: string): string {
  switch (code) {
    case 'auth/network-request-failed':
      return '네트워크 연결을 확인한 뒤 다시 시도해 주세요.'
    case 'auth/too-many-requests':
      return '로그인 시도가 많아요. 잠시 후 다시 시도해 주세요.'
    case 'auth/user-disabled':
      return '사용이 중지된 계정이에요. 인스타그램(@grad_seoultech)으로 문의해 주세요.'
    case 'auth/unauthorized-domain':
      return '이 주소에서는 로그인할 수 없어요. 총졸업준비위원회에 알려 주세요.'
    default:
      return '로그인하지 못했어요. 잠시 후 다시 시도해 주세요.'
  }
}

function provider() {
  const google = new GoogleAuthProvider()
  google.setCustomParameters({ prompt: 'select_account' })
  return google
}

function storage(): Storage | null {
  try {
    return window.sessionStorage
  } catch {
    return null
  }
}

/**
 * Popup first, because it never leaves the page. Popups are blocked often
 * enough on phones that a blocked popup falls back to a full-page redirect;
 * the redirect drops in-memory state, so the destination is parked in
 * sessionStorage and restored by `completeRedirectSignIn` on the way back.
 */
export async function signInWithGoogle(returnTo?: string): Promise<SignInOutcome> {
  const { auth, config } = firebase()
  if (!config.redirectSignIn) {
    try {
      await signInWithPopup(auth, provider(), browserPopupRedirectResolver)
      return 'signed-in'
    } catch (error) {
      const code = errorCode(error)
      if (CANCELLED.has(code)) return 'cancelled'
      if (!NEEDS_REDIRECT.has(code)) throw new SignInError(messageFor(code))
    }
  }
  storage()?.setItem(RETURN_KEY, safeRedirectTo(returnTo ?? `${location.pathname}${location.search}`))
  try {
    await signInWithRedirect(auth, provider(), browserPopupRedirectResolver)
  } catch (error) {
    storage()?.removeItem(RETURN_KEY)
    throw new SignInError(messageFor(errorCode(error)))
  }
  return 'redirecting'
}

type RedirectOutcome = { returnTo: string | null; error: string | null }
let redirectOutcome: Promise<RedirectOutcome> | null = null

/**
 * Reads the outcome of a redirect sign-in once per page load. The session
 * itself is restored by `onAuthStateChanged`; this only recovers where the
 * student was headed and any error the provider reported. Memoised: a second
 * caller (StrictMode's re-run effect, a remount) gets the same answer instead
 * of an empty one after the first consumed the stored destination.
 */
export function completeRedirectSignIn(): Promise<RedirectOutcome> {
  redirectOutcome ??= readRedirectOutcome()
  return redirectOutcome
}

async function readRedirectOutcome(): Promise<RedirectOutcome> {
  const store = storage()
  const saved = store?.getItem(RETURN_KEY) ?? null
  // Every redirect this app starts parks its destination first, so without one
  // there is no result to read — and asking would load the sign-in iframe.
  if (store && saved === null) return { returnTo: null, error: null }
  try {
    const result = await getRedirectResult(firebase().auth, browserPopupRedirectResolver)
    if (!result) return { returnTo: null, error: null }
    storage()?.removeItem(RETURN_KEY)
    return { returnTo: saved ? safeRedirectTo(saved) : null, error: null }
  } catch (error) {
    storage()?.removeItem(RETURN_KEY)
    return { returnTo: null, error: messageFor(errorCode(error)) }
  }
}

/**
 * Ends the session and reloads at home. The reload is what makes sign-out
 * whole: every cached stream, profile and screen starts over signed out. The
 * old page goes quiet first — auth stops publishing and the user's listeners
 * close with their readers left on the last value — so it holds still until
 * the new page paints instead of flashing a login prompt or spinners.
 *
 * A failed sign-out still reloads: the page comes back signed in, intact.
 */
export async function signOutAndReload(): Promise<void> {
  const uid = currentFirebaseUser()?.uid
  freezeAuth()
  if (uid) stopLive((key) => key.includes(uid))
  try {
    await signOut(firebase().auth)
  } catch (error) {
    console.error('[grad42] 로그아웃하지 못했습니다.', error)
  }
  window.location.replace(PATHS.home)
}

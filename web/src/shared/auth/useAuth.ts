import { useSyncExternalStore } from 'react'
import { ApiError, apiGet, SESSION_LOST_EVENT } from '../api/http'

/**
 * Who is signed in, read from the student server's session (`GET /api/me`).
 * There is no Google sign-in here: the server signs in one of the seeded test
 * accounts (docs/decisions/test-login.md), and the session lives in a cookie.
 */

export type AuthStatus = 'loading' | 'authenticated' | 'guest'

export interface AuthUser {
  uid: string
  email: string
  /** Test accounts have no display name; kept so the screens need no change. */
  displayName: string
}

export interface AuthState {
  status: AuthStatus
  user: AuthUser | null
}

/** The answer of `GET /api/me` and `POST /api/auth/login`. */
export interface Me {
  uid: string
  email: string
  role: string
}

const LOADING: AuthState = { status: 'loading', user: null }
const GUEST: AuthState = { status: 'guest', user: null }

let state: AuthState = LOADING
let started = false
// Set once sign-out begins: the page is about to reload, and the screen must
// not flash the guest state on the way out.
let frozen = false
const listeners = new Set<() => void>()

/**
 * The tabs of one browser share the session cookie, so signing in or out in
 * one tab changes who every other tab is. Firebase Auth told the other tabs;
 * here each tab writes the session's user under this key, and a tab that sees
 * it change to someone else starts again (see `start`).
 */
const SESSION_USER_KEY = 'grad42:session-user'

function announceSession(uid: string) {
  try {
    window.localStorage.setItem(SESSION_USER_KEY, uid)
  } catch {
    // No storage (private mode): the tabs stay unsynchronised.
  }
}

/** Tells the other tabs that this browser's session ended. */
export function announceSignedOut() {
  announceSession('')
}

function publish(next: AuthState) {
  if (frozen) return
  state = next
  listeners.forEach((listener) => listener())
}

/** Takes the server's answer as the signed-in user. */
export function setSignedIn(me: Me) {
  publish({ status: 'authenticated', user: { uid: me.uid, email: me.email, displayName: '' } })
  announceSession(me.uid)
}

function start() {
  if (started) return
  started = true
  apiGet<Me>('/api/me').then(setSignedIn, (error) => {
    if (error instanceof ApiError && error.status === 401) {
      announceSignedOut()
    } else {
      console.error('[grad42] 로그인 상태를 확인하지 못했습니다.', error)
    }
    publish(GUEST)
  })
  window.addEventListener(SESSION_LOST_EVENT, () => {
    publish(GUEST)
    announceSignedOut()
  })
  // Another tab signed in or out. Reload, as sign-out does, so that no screen
  // keeps one account's name or half-filled form over another account's data.
  window.addEventListener('storage', (event) => {
    if (event.key !== SESSION_USER_KEY || event.newValue === null) return
    if (event.newValue !== (state.user?.uid ?? '')) window.location.reload()
  })
}

function subscribe(listener: () => void): () => void {
  start()
  listeners.add(listener)
  return () => listeners.delete(listener)
}

function getSnapshot(): AuthState {
  start()
  return state
}

/** Stops auth updates from reaching the screens (see `signOutAndReload`). */
export function freezeAuth() {
  frozen = true
}

/** The signed-in user right now, for code outside React (commands, sign-out). */
export function currentUser(): AuthUser | null {
  return state.user
}

export function useAuth(): AuthState {
  return useSyncExternalStore(subscribe, getSnapshot, () => LOADING)
}

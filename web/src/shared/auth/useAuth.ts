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

function publish(next: AuthState) {
  if (frozen) return
  state = next
  listeners.forEach((listener) => listener())
}

/** Takes the server's answer as the signed-in user. */
export function setSignedIn(me: Me) {
  publish({ status: 'authenticated', user: { uid: me.uid, email: me.email, displayName: '' } })
}

function start() {
  if (started) return
  started = true
  apiGet<Me>('/api/me').then(setSignedIn, (error) => {
    if (!(error instanceof ApiError && error.status === 401)) {
      console.error('[grad42] 로그인 상태를 확인하지 못했습니다.', error)
    }
    publish(GUEST)
  })
  window.addEventListener(SESSION_LOST_EVENT, () => publish(GUEST))
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

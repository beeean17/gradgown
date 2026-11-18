import { useSyncExternalStore } from 'react'
import { onAuthStateChanged, type User } from 'firebase/auth'
import { firebase, startAppCheckWhenIdle } from '../firebase/runtime'
import { ensureProfile } from './profile'

/**
 * `loading` is Firebase's real first state: the session is restored after the
 * first render, and route guards must wait rather than redirect.
 */
export type AuthStatus = 'loading' | 'authenticated' | 'guest'

/** The signed-in Google account. The email is the only identity the UI shows. */
export interface AuthUser {
  uid: string
  email: string
  displayName: string
}

export interface AuthState {
  status: AuthStatus
  user: AuthUser | null
}

const LOADING: AuthState = { status: 'loading', user: null }
const GUEST: AuthState = { status: 'guest', user: null }

let state: AuthState = LOADING
let currentUser: User | null = null
let started = false
let frozen = false
const listeners = new Set<() => void>()

function start() {
  if (started) return
  started = true
  onAuthStateChanged(firebase().auth, (user) => {
    if (frozen) return
    currentUser = user
    state = user
      ? {
          status: 'authenticated',
          user: { uid: user.uid, email: user.email ?? '', displayName: user.displayName ?? '' },
        }
      : GUEST
    if (user) {
      ensureProfile(user).catch((error) => console.error('[grad42] 사용자 프로필을 준비하지 못했습니다.', error))
      // Only a signed-in student can send a reservation command, the one call
      // that needs an App Check token.
      startAppCheckWhenIdle()
    }
    listeners.forEach((listener) => listener())
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

/**
 * Stops publishing auth changes for the rest of this page. Sign-out reloads
 * the page, and until the new one paints the old one should stay as it was —
 * not react to its own sign-out by bouncing to the login prompt.
 */
export function freezeAuth() {
  frozen = true
}

/** Firebase's own user object, for code that needs a token or the profile promise. */
export function currentFirebaseUser(): User | null {
  return currentUser
}

/**
 * Auth is a subscription, not a value read at render time: signing in from a
 * dialog has to update the shell, the guards and the page at once.
 */
export function useAuth(): AuthState {
  return useSyncExternalStore(subscribe, getSnapshot, () => LOADING)
}

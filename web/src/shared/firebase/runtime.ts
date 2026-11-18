import { initializeApp, type FirebaseApp } from 'firebase/app'
import { initializeAppCheck, ReCaptchaEnterpriseProvider } from 'firebase/app-check'
import {
  browserLocalPersistence,
  browserSessionPersistence,
  connectAuthEmulator,
  indexedDBLocalPersistence,
  initializeAuth,
  type Auth,
} from 'firebase/auth'
import { connectFirestoreEmulator, getFirestore, type Firestore } from 'firebase/firestore'
import { connectFunctionsEmulator, getFunctions, type Functions } from 'firebase/functions'
import { readConfig, type FirebaseClientConfig } from './config'

export interface FirebaseRuntime {
  auth: Auth
  db: Firestore
  functions: Functions
  config: FirebaseClientConfig
}

let runtime: FirebaseRuntime | null = null
let failure: Error | null = null
let app: FirebaseApp | null = null
let appCheckStarted = false

function create(): FirebaseRuntime {
  const config = readConfig(import.meta.env, import.meta.env.PROD, window.location.hostname)
  app = initializeApp(config.firebase)
  // App Check is not started here: see startAppCheck.
  // getAuth's own persistence, without its popup/redirect resolver: on phones
  // and Safari that resolver loads the sign-in iframe and gapi (~135KB) on
  // every page. session.ts hands it to the calls that sign in instead.
  const auth = initializeAuth(app, {
    persistence: [indexedDBLocalPersistence, browserLocalPersistence, browserSessionPersistence],
  })
  auth.languageCode = 'ko'
  const db = getFirestore(app)
  const functions = getFunctions(app, config.region)
  if (config.emulator) {
    connectAuthEmulator(auth, `http://127.0.0.1:${config.ports.auth}`, { disableWarnings: true })
    connectFirestoreEmulator(db, '127.0.0.1', config.ports.firestore)
    connectFunctionsEmulator(functions, '127.0.0.1', config.ports.functions)
  }
  return { auth, db, functions, config }
}

/**
 * The single Firebase app for the page, created on first use. A missing or
 * unsafe config throws here — `main.tsx` catches it once and shows a setup
 * screen instead of letting every screen fail on its own.
 */
export function firebase(): FirebaseRuntime {
  if (runtime) return runtime
  if (failure) throw failure
  try {
    runtime = create()
    return runtime
  } catch (error) {
    failure = error instanceof Error ? error : new Error(String(error))
    throw failure
  }
}

/**
 * Starts App Check (reCAPTCHA Enterprise) once. Only `reservationCommand`
 * enforces it; Firestore and Auth run unenforced (checked 2026-11-05). Started
 * with the app, it held the page's first Firestore read behind reCAPTCHA's
 * download, run and token exchange: the first Listen request left at ~9.9s on
 * a throttled phone. So guests never load it, and a signed-in session starts
 * it once the page is idle (startAppCheckWhenIdle), well before any command.
 * The command calls it again in case that has not happened yet.
 */
export function startAppCheck(): void {
  const { config } = firebase()
  if (appCheckStarted || config.emulator || !app) return
  appCheckStarted = true
  initializeAppCheck(app, {
    provider: new ReCaptchaEnterpriseProvider(config.appCheckKey),
    isTokenAutoRefreshEnabled: true,
  })
}

/** startAppCheck after the first content, when the browser has a moment. */
export function startAppCheckWhenIdle(): void {
  if (appCheckStarted) return
  if (typeof window.requestIdleCallback === 'function') {
    window.requestIdleCallback(() => startAppCheck(), { timeout: 3000 })
  } else {
    window.setTimeout(startAppCheck, 2000)
  }
}

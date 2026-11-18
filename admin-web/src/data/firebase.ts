import { initializeApp } from 'firebase/app'
import { initializeAppCheck, ReCaptchaEnterpriseProvider } from 'firebase/app-check'
import { getAuth, connectAuthEmulator, browserSessionPersistence, setPersistence } from 'firebase/auth'
import { getFirestore, connectFirestoreEmulator } from 'firebase/firestore'
import { getFunctions, connectFunctionsEmulator } from 'firebase/functions'
import { getStorage, connectStorageEmulator } from 'firebase/storage'
import { readConfig } from './config.ts'

export function createRuntime() {
  const config = readConfig(import.meta.env, import.meta.env.PROD, window.location.hostname)
  const app = initializeApp(config.firebase, 'grad42-admin')
  if (!config.emulator) initializeAppCheck(app, { provider: new ReCaptchaEnterpriseProvider(config.appCheckKey), isTokenAutoRefreshEnabled: true })
  const auth = getAuth(app), db = getFirestore(app), functions = getFunctions(app, config.region), storage = getStorage(app)
  if (config.emulator) {
    connectAuthEmulator(auth, `http://127.0.0.1:${config.ports.auth}`, { disableWarnings: true })
    connectFirestoreEmulator(db, '127.0.0.1', config.ports.firestore)
    connectFunctionsEmulator(functions, '127.0.0.1', config.ports.functions)
    connectStorageEmulator(storage, '127.0.0.1', config.ports.storage)
  }
  return { auth, db, functions, storage, config, access: new EventTarget(), ready: setPersistence(auth, browserSessionPersistence) }
}
export type Runtime = ReturnType<typeof createRuntime>

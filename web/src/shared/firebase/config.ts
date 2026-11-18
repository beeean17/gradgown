/**
 * Reads the student app's Firebase settings from Vite env. Everything here is
 * public web config — server secrets never belong in `VITE_*` variables.
 *
 * The rules mirror admin-web's: emulators only on a localhost dev server with a
 * `demo-` project (so a misconfigured build can never point real users at a
 * local backend), and App Check is mandatory against real Firebase because
 * `reservationCommand` enforces it.
 */
export interface FirebaseClientConfig {
  emulator: boolean
  environment: string
  firebase: {
    apiKey: string
    authDomain: string
    projectId: string
    appId: string
    storageBucket: string
    messagingSenderId?: string
  }
  appCheckKey: string
  /**
   * Emulator-only: skip the popup and use the redirect flow. Browser panes
   * without `window.opener` cannot finish a popup, and this is also the path
   * in-app browsers take in production, so it is worth exercising directly.
   */
  redirectSignIn: boolean
  region: string
  ports: { auth: number; firestore: number; functions: number }
}

const LOCAL_HOSTS = ['localhost', '127.0.0.1', '[::1]']

export function readConfig(
  env: Record<string, string | undefined>,
  production: boolean,
  hostname: string,
): FirebaseClientConfig {
  const emulator = env.VITE_USE_FIREBASE_EMULATOR === 'true'
  const required = [
    'VITE_FIREBASE_API_KEY',
    'VITE_FIREBASE_AUTH_DOMAIN',
    'VITE_FIREBASE_PROJECT_ID',
    'VITE_FIREBASE_APP_ID',
    'VITE_FIREBASE_STORAGE_BUCKET',
  ]
  const missing = required.filter((key) => !env[key]?.trim())
  if (missing.length) {
    throw new Error(`Firebase 연결 설정이 필요합니다: ${missing.join(', ')}. web/.env.example을 참고해 주세요.`)
  }
  if (emulator && (production || !LOCAL_HOSTS.includes(hostname) || !env.VITE_FIREBASE_PROJECT_ID!.startsWith('demo-'))) {
    throw new Error('에뮬레이터는 localhost 개발 서버와 demo- 프로젝트에서만 사용할 수 있습니다.')
  }
  if (!emulator && !env.VITE_APP_CHECK_SITE_KEY?.trim()) {
    throw new Error('App Check site key(VITE_APP_CHECK_SITE_KEY)를 설정해 주세요.')
  }

  const port = (name: string, fallback: number) => {
    const value = Number(env[name] || fallback)
    if (!Number.isInteger(value) || value < 1024 || value > 65535) throw new Error(`${name} 포트를 확인해 주세요.`)
    return value
  }

  return {
    emulator,
    environment: emulator ? 'emulator' : env.VITE_ENVIRONMENT || 'production',
    firebase: {
      apiKey: env.VITE_FIREBASE_API_KEY!,
      authDomain: env.VITE_FIREBASE_AUTH_DOMAIN!,
      projectId: env.VITE_FIREBASE_PROJECT_ID!,
      appId: env.VITE_FIREBASE_APP_ID!,
      storageBucket: env.VITE_FIREBASE_STORAGE_BUCKET!,
      ...(env.VITE_FIREBASE_MESSAGING_SENDER_ID ? { messagingSenderId: env.VITE_FIREBASE_MESSAGING_SENDER_ID } : {}),
    },
    appCheckKey: env.VITE_APP_CHECK_SITE_KEY?.trim() ?? '',
    redirectSignIn: emulator && env.VITE_AUTH_REDIRECT_ONLY === 'true',
    region: env.VITE_FIREBASE_FUNCTIONS_REGION || 'asia-northeast3',
    ports: {
      auth: port('VITE_AUTH_EMULATOR_PORT', 9198),
      firestore: port('VITE_FIRESTORE_EMULATOR_PORT', 8188),
      functions: port('VITE_FUNCTIONS_EMULATOR_PORT', 5101),
    },
  }
}

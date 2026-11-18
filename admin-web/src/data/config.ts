export function readConfig(env: Record<string, string | undefined>, production: boolean, hostname: string) {
  const emulator = env.VITE_USE_FIREBASE_EMULATOR === 'true'
  const required = ['VITE_FIREBASE_API_KEY', 'VITE_FIREBASE_AUTH_DOMAIN', 'VITE_FIREBASE_PROJECT_ID', 'VITE_FIREBASE_APP_ID', 'VITE_FIREBASE_STORAGE_BUCKET']
  const missing = required.filter(key => !env[key]?.trim())
  if (missing.length) throw new Error(`Firebase 연결 설정이 필요합니다: ${missing.join(', ')}. admin-web/.env.example을 참고해 .env.local을 설정해 주세요.`)
  if (emulator && (production || !['localhost', '127.0.0.1', '[::1]'].includes(hostname) || !env.VITE_FIREBASE_PROJECT_ID!.startsWith('demo-')))
    throw new Error('에뮬레이터는 localhost 개발 서버와 demo- 프로젝트에서만 사용할 수 있습니다.')
  if (!emulator && !env.VITE_APP_CHECK_SITE_KEY) throw new Error('관리자 웹앱의 App Check site key를 설정해 주세요.')
  if (!emulator && env.VITE_ENVIRONMENT === 'local') throw new Error('실제 Firebase 연결은 staging 또는 production 환경으로 명시해 주세요.')
  if (!emulator && !['staging', 'production'].includes(env.VITE_ENVIRONMENT || '')) throw new Error('실제 Firebase 환경을 staging 또는 production으로 지정해 주세요.')
  const port = (name: string, fallback: number) => {
    const value = Number(env[name] || fallback)
    if (!Number.isInteger(value) || value < 1024 || value > 65535) throw new Error(`${name} 포트를 확인해 주세요.`)
    return value
  }
  return {
    emulator, environment: emulator ? 'Emulator' : env.VITE_ENVIRONMENT!,
    firebase: { apiKey: env.VITE_FIREBASE_API_KEY!, authDomain: env.VITE_FIREBASE_AUTH_DOMAIN!, projectId: env.VITE_FIREBASE_PROJECT_ID!, appId: env.VITE_FIREBASE_APP_ID!, storageBucket: env.VITE_FIREBASE_STORAGE_BUCKET! },
    appCheckKey: env.VITE_APP_CHECK_SITE_KEY || '', region: env.VITE_FIREBASE_FUNCTIONS_REGION || 'us-central1',
    ports: { auth: port('VITE_AUTH_EMULATOR_PORT', 9198), firestore: port('VITE_FIRESTORE_EMULATOR_PORT', 8188), functions: port('VITE_FUNCTIONS_EMULATOR_PORT', 5101), storage: port('VITE_STORAGE_EMULATOR_PORT', 9298) },
  }
}

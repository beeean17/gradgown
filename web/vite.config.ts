import { defineConfig, loadEnv } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'

/**
 * A production bundle without these would boot into the "연결 설정" error
 * screen, so a deploy fails here instead of after it ships. They are read from
 * `.env.production(.local)` or the host's build environment (e.g. Cloudflare
 * Pages variables). `npm run build:check` builds in emulator mode for CI-less
 * local verification without real config.
 */
const REQUIRED_PRODUCTION_ENV = [
  'VITE_FIREBASE_API_KEY',
  'VITE_FIREBASE_AUTH_DOMAIN',
  'VITE_FIREBASE_PROJECT_ID',
  'VITE_FIREBASE_APP_ID',
  'VITE_FIREBASE_STORAGE_BUCKET',
  'VITE_APP_CHECK_SITE_KEY',
]

// https://vite.dev/config/
export default defineConfig(({ command, mode }) => {
  if (command === 'build' && mode === 'production') {
    const env = loadEnv(mode, process.cwd(), 'VITE_')
    const missing = REQUIRED_PRODUCTION_ENV.filter((key) => !env[key]?.trim())
    if (missing.length > 0) {
      throw new Error(`운영 빌드에 필요한 Firebase 설정이 없습니다: ${missing.join(', ')} (web/.env.example 참고)`)
    }
    if (env.VITE_USE_FIREBASE_EMULATOR === 'true') {
      throw new Error('운영 빌드에서 VITE_USE_FIREBASE_EMULATOR=true 는 허용되지 않습니다.')
    }
  }
  return {
    plugins: [react(), tailwindcss()],
  }
})

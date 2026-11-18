import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'

// The whole design system — scale, tokens, base, component overrides, motion —
// assembled in the correct layer order. See design/index.css.
import './design/index.css'
import App from './app/App.tsx'
import { SetupErrorPage } from './app/SetupErrorPage.tsx'
import { firebase } from './shared/firebase/runtime.ts'
import { prefetchPeriod } from './features/reservation/periodPrefetch.ts'

// Initialise Firebase (and App Check) before the first render so every screen
// can assume a runtime; a bad config is caught once, here.
let setupError: Error | null = null
try {
  firebase()
  prefetchPeriod()
} catch (error) {
  setupError = error instanceof Error ? error : new Error(String(error))
  console.error('[grad42] Firebase 설정 오류', setupError)
}

createRoot(document.getElementById('root')!).render(
  <StrictMode>{setupError ? <SetupErrorPage error={setupError} /> : <App />}</StrictMode>,
)

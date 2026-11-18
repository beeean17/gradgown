import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'

// The whole design system — scale, tokens, base, component overrides, motion —
// assembled in the correct layer order. See design/index.css.
import './design/index.css'
import App from './app/App.tsx'

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <App />
  </StrictMode>,
)

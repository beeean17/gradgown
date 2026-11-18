import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'

export default defineConfig({
  plugins: [react(), tailwindcss()],
  // Local only (docs/decisions/local-only.md). The app calls relative /api paths and the dev
  // server passes them to the admin server, so the session cookie stays same-origin.
  // 5173 and 8080 belong to the student web and the student server.
  server: { host: '127.0.0.1', port: 5174, strictPort: true, proxy: { '/api': 'http://127.0.0.1:8081' } },
  build: { sourcemap: false },
})

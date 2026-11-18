import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'

// The student web talks to the student server (docs/contracts/web-api.md).
// The dev server proxies /api to it, so the browser sees one origin and the
// session cookie needs no CORS setup.
const STUDENT_SERVER = 'http://127.0.0.1:8080'

export default defineConfig({
  plugins: [react(), tailwindcss()],
  server: {
    host: '127.0.0.1',
    port: 5173,
    strictPort: true,
    proxy: { '/api': STUDENT_SERVER },
  },
  preview: {
    host: '127.0.0.1',
    port: 4173,
    proxy: { '/api': STUDENT_SERVER },
  },
})

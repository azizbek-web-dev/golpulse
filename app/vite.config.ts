import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

export default defineConfig({
  plugins: [react()],
  // GitHub Pages loyiha yo'li: https://azizbek-web-dev.github.io/golpulse/
  base: '/golpulse/',
  server: { port: 5173 },
})

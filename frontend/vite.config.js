import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// https://vite.dev/config/
export default defineConfig({
  plugins: [react()],
  test: {
    environment: 'jsdom',
    setupFiles: './src/test/setup.js',
    testTimeout: 15000,
    env: { VITE_POLL_INTERVAL_MS: '100' },
  },
})

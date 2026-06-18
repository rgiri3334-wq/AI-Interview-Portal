import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// https://vitejs.dev/config/
export default defineConfig({
  plugins: [react()],
  server: {
    port: 5173,
    open: true,
    fs: {
      allow: [
        '..',
        'c:/Users/Niraj Singh/.gemini/antigravity/brain'
      ]
    }
  },
  build: {
    chunkSizeWarningLimit: 3000,
  },
})

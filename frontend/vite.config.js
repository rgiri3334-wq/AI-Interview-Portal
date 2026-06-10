import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// https://vitejs.dev/config/
export default defineConfig({
  plugins: [react()],
  server: {
    port: 5173,
    open: true,  // Auto-open browser on npm run dev
    fs: {
      allow: [
        '..', // Allow serving files from one level up to the project root
        'c:/Users/Niraj Singh/.gemini/antigravity/brain' // Allow external image
      ]
    }
  },
  build: {
    chunkSizeWarningLimit: 3000,
  }
})

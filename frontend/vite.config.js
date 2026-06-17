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
    rollupOptions: {
      output: {
        manualChunks: {
          // Force THREE.js and @react-three/* into their own chunk.
          // This is the root-cause fix for the "Cannot access 'Mn' before initialization"
          // crash: it prevents Rollup from creating a circular init order between
          // the Three.js module graph and @monaco-editor/react.
          'vendor-three': [
            'three',
            '@react-three/fiber',
            '@react-three/drei',
          ],
          // Monaco Editor gets its own chunk so it's never in the same
          // execution context as the Three.js chunk during module initialization.
          'vendor-monaco': [
            '@monaco-editor/react',
          ],
          // Keep React and core vendor libraries together
          'vendor-react': [
            'react',
            'react-dom',
            'react-router-dom',
            'framer-motion',
          ],
        },
      },
    },
  },
})

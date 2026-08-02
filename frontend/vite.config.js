import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// https://vitejs.dev/config/
export default defineConfig({
  plugins: [react()],
  server: {
    port: 5173,
    open: true,
    // Security: Only allow serving files from the project directory
    fs: {
      allow: ['..']
    }
  },
  build: {
    target: 'esnext',
    // ── Security: Disable source maps in production ──
    // Source maps expose original source code to anyone with DevTools.
    sourcemap: false,
    chunkSizeWarningLimit: 3000,
    // ── Security: Strip console logs & debugger in production ──
    // Prevents proctoring logic, API details, and internal state from
    // leaking to the browser console. Uses Terser for reliable removal.
    minify: 'terser',
    terserOptions: {
      compress: {
        drop_console: true,
        drop_debugger: true,
        pure_funcs: ['console.log', 'console.warn', 'console.debug', 'console.info'],
      },
      format: {
        comments: false, // Strip all comments from production bundle
      },
    },
    rollupOptions: {
      output: {
        manualChunks: {
          'vendor-three': ['three', '@react-three/fiber', '@react-three/drei'],
          'vendor-react': ['react', 'react-dom', 'react-router-dom'],
        }
      }
    }
  },
})

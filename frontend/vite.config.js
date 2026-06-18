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
    rollupOptions: {
      output: {
        manualChunks(id) {
          // Isolate Three.js / @react-three/* into their own chunk.
          // Root-cause fix for "Cannot access 'Tn' before initialization":
          // prevents Rollup creating a circular init order between the
          // Three.js module graph and @monaco-editor/react.
          if (
            id.includes('node_modules/three/') ||
            id.includes('node_modules/@react-three/')
          ) {
            return 'vendor-three';
          }
          // Monaco Editor gets its own chunk — completely separate from Three.js.
          if (
            id.includes('node_modules/@monaco-editor/') ||
            id.includes('node_modules/monaco-editor/')
          ) {
            return 'vendor-monaco';
          }
          // Avatar3D + AvatarRig (which import @react-three/*) get their own chunk
          // so they never co-initialize with Monaco in the main bundle.
          if (
            id.includes('src/components/Avatar3D') ||
            id.includes('src/components/AvatarRig')
          ) {
            return 'chunk-avatar';
          }
          // NOTE: Do NOT catch-all other node_modules — Rollup will
          // create a vendor chunk that cross-references vendor-three,
          // creating a circular chunk warning. Let Rollup manage the rest.
        },
      },
    },
  },
})

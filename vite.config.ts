import { fileURLToPath } from 'node:url'

import tailwindcss from '@tailwindcss/vite'
import react from '@vitejs/plugin-react'
import { defineConfig } from 'vite'
// https://vite.dev/config/

export default defineConfig({
  plugins: [react(), tailwindcss()],
  assetsInclude: ['**/*.wasm'],
  publicDir: 'public',

  resolve: {
    alias: {
      '@warmBuild': fileURLToPath(new URL('wasm-build/out/canvaskit.js', import.meta.url)),
      'wasmBuild': fileURLToPath(new URL('wasm-build/out', import.meta.url)),
    },
  },
})

import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// Minimal Vite config — a stand-in for the kind of config Lovable/Bolt/v0 emit.
// The injected `cap:build` script forces `--base ./` at build time (D-03), so we do
// NOT set a base here on purpose — the engine never mutates vite.config.
export default defineConfig({
  plugins: [react()],
})

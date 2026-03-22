import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'

// https://vite.dev/config/
export default defineConfig({
  plugins: [react(), tailwindcss()],
  // GitHub Pages uses the repository name as the URL path
  base: '/SyntraAI_LocalAI_Agent/',
  build: {
    // Output directly to the /docs folder in the repository root for seamless GS Pages deployment
    outDir: '../docs',
    emptyOutDir: true,
  }
})

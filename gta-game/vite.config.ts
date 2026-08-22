import { defineConfig } from 'vite'

const GH_PAGES = process.env.GH_PAGES === '1'

export default defineConfig({
  // GitHub Pages hosts the repo under /arena-city-try/ (only for Pages builds)
  base: GH_PAGES ? '/arena-city-try/' : '/',
  server: {
    host: '0.0.0.0',
    port: 7777,
    // Sandbox preview serves the app from a host different from localhost
    allowedHosts: true,
  },
  build: {
    target: 'es2022',
    chunkSizeWarningLimit: 1500,
  },
})

import { defineConfig, loadEnv } from 'vite'
import react from '@vitejs/plugin-react'
import fs from 'node:fs'
import { fileURLToPath } from 'node:url'

const swPath = fileURLToPath(new URL('./src/sw.js', import.meta.url))

// Serves src/sw.js at /sw.js in dev and emits it to dist/sw.js on build,
// so the service worker can control the whole site scope.
function serviceWorkerPlugin() {
  return {
    name: 'civicconnect-service-worker',
    configureServer(server) {
      server.middlewares.use('/sw.js', (req, res) => {
        res.setHeader('Content-Type', 'application/javascript')
        res.setHeader('Service-Worker-Allowed', '/')
        res.end(fs.readFileSync(swPath, 'utf-8'))
      })
    },
    generateBundle() {
      this.emitFile({ type: 'asset', fileName: 'sw.js', source: fs.readFileSync(swPath, 'utf-8') })
    },
  }
}

export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, process.cwd(), '')
  return {
    plugins: [react(), serviceWorkerPlugin()],
    server: {
      port: 5173,
      proxy: {
        '/api': {
          target: env.VITE_PROXY_TARGET || 'http://127.0.0.1:5000',
          changeOrigin: true,
        },
      },
    },
    preview: { port: 4173 },
    build: { chunkSizeWarningLimit: 900 },
  }
})

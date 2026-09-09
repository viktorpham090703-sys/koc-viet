import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

export default defineConfig(() => {
  const apiTarget = process.env.VITE_API_PROXY_TARGET || 'http://127.0.0.1:3000'
  return {
    plugins: [react()],
    server: {
      port: 5173,
      proxy: {
        '/api': {
          target: apiTarget,
          changeOrigin: true,
          configure: (proxy) => {
            proxy.on('error', (err, _req, res) => {
              console.warn('[vite-proxy] proxy connection error:', err.message)
              if (res && typeof (res as any).writeHead === 'function' && !(res as any).headersSent) {
                ;(res as any).writeHead(502, { 'Content-Type': 'application/json' })
                ;(res as any).end(JSON.stringify({ error: 'Proxy error', message: err.message }))
              }
            })
          },
        },
      },
    },
  }
})

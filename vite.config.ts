import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// https://vite.dev/config/
export default defineConfig({
  plugins: [react()],
  server: {
    proxy: {
      '/ords': {
        target: 'https://paas.nalsoft.net:4443',
        changeOrigin: true,
        secure: false,
        configure: (proxy, _options) => {
          proxy.on('proxyReq', (proxyReq, req, _res) => {
            console.log('[Proxy] Request:', req.method, req.url, '→', proxyReq.path);
          });
          proxy.on('proxyRes', (proxyRes, req, _res) => {
            console.log('[Proxy] Response:', proxyRes.statusCode, req.url);
          });
          proxy.on('error', (err, req, _res) => {
            console.error('[Proxy] Error:', err.message, req.url);
          });
        },
      },
    },
  },
})

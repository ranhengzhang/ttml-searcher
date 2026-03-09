import { defineConfig } from "vite";
import vue from "@vitejs/plugin-vue";
import AutoImport from 'unplugin-auto-import/vite'
import Components from 'unplugin-vue-components/vite'
import { ElementPlusResolver } from 'unplugin-vue-components/resolvers'

export default defineConfig({
  plugins: [
      vue(),
      AutoImport({
          resolvers: [ElementPlusResolver()],
      }),
      Components({
          resolvers: [ElementPlusResolver()],
      })
  ],
  server: {
    port: 1420,
    strictPort: true,
    proxy: {
      '/api/proxy': {
        target: 'http://localhost:1420',
        configure: (proxy, options) => {
          proxy.on('proxyReq', (proxyReq, req, res) => {
            const url = new URL(req.url || '', 'http://localhost:1420')
            const targetUrl = url.searchParams.get('url')
            if (targetUrl) {
              proxyReq.setHeader('host', new URL(targetUrl).host)
            }
          })
        },
        bypass: async (req, res, options) => {
          const url = new URL(req.url || '', 'http://localhost:1420')
          const targetUrl = url.searchParams.get('url')
          
          if (!targetUrl) {
            res.statusCode = 400
            res.end(JSON.stringify({ error: 'Missing url parameter' }))
            return false
          }

          try {
            const decodedUrl = decodeURIComponent(targetUrl)
            const response = await fetch(decodedUrl, {
              headers: {
                'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
              },
            })
            const content = await response.text()
            res.statusCode = 200
            res.setHeader('Content-Type', 'application/json')
            res.end(JSON.stringify({
              status_code: response.status,
              content: content,
            }))
          } catch (error: any) {
            res.statusCode = 500
            res.end(JSON.stringify({
              status_code: 0,
              content: `Request error: ${error.message}`,
            }))
          }
          return false
        },
      },
    },
  },
});

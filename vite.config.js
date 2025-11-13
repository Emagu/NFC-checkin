import { defineConfig } from 'vite'
import vue from '@vitejs/plugin-vue'
import { fileURLToPath, URL } from 'node:url'

export default defineConfig({
  plugins: [vue()],
  resolve: {
    alias: {
      '@': fileURLToPath(new URL('./src', import.meta.url))
    }
  },
  server: {
    port: 5173
  },
  build: {
    // 確保 public 目錄中的文件被正確複製
    rollupOptions: {
      output: {
        // 確保 service-worker.js 和 manifest.json 不被處理
        assetFileNames: (assetInfo) => {
          if (assetInfo.name === 'service-worker.js' || assetInfo.name === 'manifest.json') {
            return '[name][extname]'
          }
          return 'assets/[name]-[hash][extname]'
        }
      }
    }
  },
  publicDir: 'public'
})

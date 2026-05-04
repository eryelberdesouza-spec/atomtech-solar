import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import path from 'path'

export default defineConfig({
  plugins: [react()],
  resolve: {
    alias: {
      '@atomtech/shared': path.resolve(__dirname, '../../packages/shared/src/index.ts'),
      '@atomtech/api': path.resolve(__dirname, '../api/src/index.ts'),
    },
  },
  server: {
    port: 5173,
    proxy: {
      '/trpc': {
        target: 'http://localhost:3001',
        changeOrigin: true,
      },
    },
  },
  optimizeDeps: {
    exclude: ['@atomtech/shared', '@atomtech/api'],
  },
})

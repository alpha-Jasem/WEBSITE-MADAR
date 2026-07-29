import path from 'path'
import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

export default defineConfig({
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './src'),
      '@dv3': path.resolve(__dirname, './src/dashboard-v3'),
    },
  },
  plugins: [react()],
  server: {
    port: 5173,
  },
  build: {
    rollupOptions: {
      output: {
        manualChunks(id: string) {
          if (id.includes('node_modules')) {
            if (id.includes('recharts')) return 'recharts'
            if (id.includes('framer-motion')) return 'framer'
            if (id.includes('react-router') || id.includes('/react/') || id.includes('/react-dom/')) return 'react-vendor'
            if (id.includes('@supabase/supabase-js')) return 'supabase'
          }
          return undefined
        },
      },
    },
  },
})

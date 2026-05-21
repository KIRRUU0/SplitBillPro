import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// https://vite.dev/config/
export default defineConfig({
  plugins: [react()],
  build: {
    rollupOptions: {
      output: {
        manualChunks(id) {
          if (id.includes('node_modules')) {
            if (id.includes('tesseract.js')) {
              return 'ocr-tesseract';
            }
            if (id.includes('@supabase')) {
              return 'supabase-db';
            }
            if (id.includes('lucide-react')) {
              return 'icons-lucide';
            }
            return 'vendor-libs';
          }
        }
      }
    }
  }
})

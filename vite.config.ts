import { defineConfig, type Plugin } from 'vite'
import react from '@vitejs/plugin-react'
import fs from 'node:fs'
import path from 'node:path'

// Custom plugin to inline CSS files into index.html to remove render-blocking stylesheet requests
const inlineCSSPlugin = (): Plugin => ({
  name: 'inline-css-plugin',
  closeBundle() {
    const htmlPath = path.join(process.cwd(), 'dist/index.html')
    if (fs.existsSync(htmlPath)) {
      let html = fs.readFileSync(htmlPath, 'utf-8')
      const assetsDir = path.join(process.cwd(), 'dist/assets')
      if (fs.existsSync(assetsDir)) {
        const files = fs.readdirSync(assetsDir)
        const cssFiles = files.filter(f => f.endsWith('.css'))
        let cssContent = ''
        for (const cssFile of cssFiles) {
          const cssPath = path.join(assetsDir, cssFile)
          cssContent += fs.readFileSync(cssPath, 'utf-8')
          try {
            fs.unlinkSync(cssPath)
          } catch (e) {
            console.error(`Failed to delete CSS file: ${cssPath}`, e)
          }
        }
        
        if (cssContent) {
          // Remove all stylesheet link tags referencing CSS files
          html = html.replace(/<link[^>]*href="[^"]*\.css"[^>]*>/gi, '')
          // Inject styles into head
          html = html.replace('</head>', `<style>${cssContent}</style></head>`)
          fs.writeFileSync(htmlPath, html, 'utf-8')
        }
      }
    }
  }
})

// https://vite.dev/config/
export default defineConfig({
  plugins: [react(), inlineCSSPlugin()],
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

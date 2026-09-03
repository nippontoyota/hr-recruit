import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'
import legacy from '@vitejs/plugin-legacy'
import path from 'node:path'

// https://vite.dev/config/
export default defineConfig({
  plugins: [
    react(),
    tailwindcss(),
    // Modern browsers keep the existing optimized ES module bundle untouched.
    // Older browsers (see package.json "browserslist") get a separate, Babel-transpiled
    // nomodule bundle with only the polyfills their target actually needs — this is what
    // fixes "Iterator is not defined" on older PCs without shimming Iterator globally for
    // every visitor.
    legacy({
      targets: ['Chrome >= 60', 'Edge >= 79', 'Firefox >= 60', 'Safari >= 12'],
    }),
  ],
  resolve: {
    alias: {
      '@': path.resolve(__dirname, 'src'),
    },
  },
  optimizeDeps: {
    include: ['docx-preview', 'pdfjs-dist'],
  },
  server: {
    proxy: {
      '/api': {
        target: 'http://127.0.0.1:8000',
        changeOrigin: true,
      },
    },
  },
})

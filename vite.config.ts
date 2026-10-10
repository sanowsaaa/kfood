import { defineConfig, loadEnv } from 'vite'
import react from '@vitejs/plugin-react-swc'
import { fileURLToPath } from 'node:url'
import { productSitemapPlugin } from './scripts/productSitemap.ts'

export default defineConfig(({ mode }) => {
  const env = { ...loadEnv(mode, process.cwd(), 'VITE_'), ...process.env };
  return {
  plugins: [react(), productSitemapPlugin({ supabaseUrl: env.VITE_PUBLIC_SUPABASE_URL, anonKey: env.VITE_PUBLIC_SUPABASE_ANON_KEY, siteUrl: env.VITE_SITE_URL })],
  resolve: { alias: { '@': fileURLToPath(new URL('./src', import.meta.url)) } },
  base: '/',
  define: {
    __BASE_PATH__: JSON.stringify('/'),
  },
  build: {
    minify: 'terser',
    terserOptions: {
      compress: {
        drop_console: true,
        drop_debugger: true,
        pure_funcs: ['console.log', 'console.info', 'console.debug'],
        passes: 2,
        dead_code: true,
        unused: true,
      },
      mangle: { safari10: true },
      format: { comments: false }
    },
    cssMinify: 'lightningcss',
    cssCodeSplit: true,
    rollupOptions: {
      output: {
        onlyExplicitManualChunks: true,
        manualChunks(id) {
          // React core
          if (id.includes('node_modules/react/') || id.includes('node_modules/react-dom/') || id.includes('node_modules/scheduler/')) {
            return 'react-core';
          }
          // Router
          if (id.includes('react-router-dom') || id.includes('react-router/')) {
            return 'react-router';
          }
          // Supabase
          if (id.includes('@supabase/')) {
            return 'supabase';
          }
          // Animations
          if (id.includes('framer-motion')) {
            return 'framer-motion';
          }
          // Admin pages - отделен chunk, зарежда се само при нужда
          if (id.includes('/pages/admin/')) {
            return 'admin';
          }
          // Checkout pages
          if (id.includes('/pages/checkout') || id.includes('/pages/cod-checkout') || id.includes('/pages/payment')) {
            return 'checkout';
          }
          // Blog pages
          if (id.includes('/pages/blog/')) {
            return 'blog';
          }
        },
        chunkFileNames: 'assets/js/[name]-[hash].js',
        entryFileNames: 'assets/js/[name]-[hash].js',
        assetFileNames: 'assets/[ext]/[name]-[hash].[ext]'
      }
    },
    chunkSizeWarningLimit: 800,
    sourcemap: false,
    assetsInlineLimit: 4096,
    reportCompressedSize: false,
    // Target modern browsers за по-малък bundle
    target: 'es2020',
  },
  optimizeDeps: {
    include: ['react', 'react-dom', 'react-router-dom', '@supabase/supabase-js'],
  },
  server: {
    port: 3000,
    strictPort: false,
    host: true,
  }
  }
})

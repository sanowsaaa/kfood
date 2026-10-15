import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react-swc';
import { fileURLToPath } from 'node:url';

// Separate opt-in build; normal Readdy/Vite publishing stays unchanged.
export default defineConfig({
  plugins: [react()],
  resolve: { alias: { '@': fileURLToPath(new URL('./src', import.meta.url)) } },
  // CartProvider is reused for identical markup. Server effects/actions do not
  // run. The HTML loader has independent, anonymous fetch credentials.
  define: {
    'import.meta.env.VITE_PUBLIC_SUPABASE_URL': JSON.stringify('https://render-only.invalid'),
    'import.meta.env.VITE_PUBLIC_SUPABASE_ANON_KEY': JSON.stringify('render-only-public-key'),
    'import.meta.env.VITE_SITE_URL': JSON.stringify('https://k-foodvelikotarnovo.com'),
  },
  build: { ssr: 'server/entry-product.tsx', outDir: '.seo-pilot/server', emptyOutDir: true, copyPublicDir: false,
    rollupOptions: { output: { entryFileNames: 'entry.mjs' } } },
});

import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import { VitePWA } from 'vite-plugin-pwa';

// https://vitejs.dev/config/
export default defineConfig({
  plugins: [
    react(),
    VitePWA({
      base: '/tonal-explorer/',
      registerType: 'autoUpdate',
      includeAssets: ['icon-192.webp', 'icon-512.webp'],
      manifest: {
        name: 'Tonal Explorer',
        short_name: 'TonalExplorer',
        description: 'Music Training Assistant',
        theme_color: '#1e293b',
        background_color: '#f8fafc',
        display: 'standalone',
        scope: '/tonal-explorer/',
        start_url: '/tonal-explorer/',
        icons: [
          {
            src: 'icon-192.webp',
            sizes: '192x192',
            type: 'image/webp',
            purpose: 'any maskable',
          },
          {
            src: 'icon-512.webp',
            sizes: '512x512',
            type: 'image/webp',
            purpose: 'any maskable',
          },
        ],
      },
      workbox: {
        globPatterns: ['**/*.{js,css,html,webp,svg}'],
        navigateFallback: 'index.html',
        navigateFallbackDenylist: [/^\/__supabase__/],
      },
    }),
  ],
  base: '/tonal-explorer/',
  optimizeDeps: {
    exclude: ['lucide-react'],
  },
});

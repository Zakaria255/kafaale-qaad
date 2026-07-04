import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import { VitePWA } from 'vite-plugin-pwa';

export default defineConfig({
  plugins: [
    react(),
    VitePWA({
      // Keep the app fresh: new SW activates as soon as it's ready.
      registerType: 'autoUpdate',
      // Auto-inject the SW registration script — no changes needed in main.jsx.
      injectRegister: 'auto',
      // Reuse the existing hand-tuned public/manifest.json (icons, shortcuts, etc.)
      // instead of generating a new one.
      manifest: false,
      includeAssets: [
        'manifest.json',
        'assets/brand/favicon.ico',
        'assets/brand/kafaala-qaad-hope-icon-32.png',
        'assets/brand/kafaala-qaad-hope-icon-192.png',
        'assets/brand/kafaala-qaad-hope-icon-512.png',
      ],
      workbox: {
        // Precache only the app shell (code) — never the multi-MB hero images.
        globPatterns: ['**/*.{js,css,html}'],
        navigateFallback: '/index.html',
        // Don't hijack API calls with the SPA fallback.
        navigateFallbackDenylist: [/^\/api/],
        cleanupOutdatedCaches: true,
        clientsClaim: true,
        runtimeCaching: [
          {
            // App images (hero art, brand, same-origin media).
            urlPattern: ({ request }) => request.destination === 'image',
            handler: 'CacheFirst',
            options: {
              cacheName: 'kq-images',
              expiration: { maxEntries: 80, maxAgeSeconds: 60 * 60 * 24 * 30 },
              cacheableResponse: { statuses: [0, 200] },
            },
          },
          {
            // Google Fonts stylesheets.
            urlPattern: ({ url }) => url.origin === 'https://fonts.googleapis.com',
            handler: 'StaleWhileRevalidate',
            options: { cacheName: 'kq-google-fonts-css' },
          },
          {
            // Google Fonts font files.
            urlPattern: ({ url }) => url.origin === 'https://fonts.gstatic.com',
            handler: 'CacheFirst',
            options: {
              cacheName: 'kq-google-fonts-files',
              expiration: { maxEntries: 20, maxAgeSeconds: 60 * 60 * 24 * 365 },
              cacheableResponse: { statuses: [0, 200] },
            },
          },
        ],
      },
      // Allow testing the install prompt during `vite dev` too.
      devOptions: { enabled: true, type: 'module' },
    }),
  ],
  server: {
    port: 5174,
    host: true,
    proxy: {
      '/api': { target: 'http://localhost:4000', changeOrigin: true },
    },
  },
  build: {
    outDir: 'dist',
  },
});

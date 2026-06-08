import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'
import { VitePWA } from 'vite-plugin-pwa'

export default defineConfig({
  server: {
    proxy: {
      '/api': 'http://localhost:8787',
    },
  },
  plugins: [
    react(),
    tailwindcss(),
    VitePWA({
      // 'prompt' so a new version waits for an explicit tap (the in-app Update
      // banner) instead of silently swapping under the user.
      registerType: 'prompt',
      includeAssets: ['favicon.svg', 'pwa-192.png', 'pwa-512.png', 'pwa-512-maskable.png', 'apple-touch-icon.png', 'push-sw.js'],
      workbox: {
        // Pull in the push/notificationclick handlers (background reminders).
        importScripts: ['push-sw.js'],
      },
      manifest: {
        name: 'Elevate',
        short_name: 'Elevate',
        description: 'Ankle weight upper body workouts',
        theme_color: '#FAF7F2',
        background_color: '#FAF7F2',
        display: 'standalone',
        orientation: 'portrait',
        start_url: '/',
        icons: [
          { src: 'favicon.svg', sizes: 'any', type: 'image/svg+xml' },
          { src: 'pwa-192.png', sizes: '192x192', type: 'image/png' },
          { src: 'pwa-512.png', sizes: '512x512', type: 'image/png' },
          { src: 'pwa-512-maskable.png', sizes: '512x512', type: 'image/png', purpose: 'maskable' },
        ],
      },
    }),
  ],
})

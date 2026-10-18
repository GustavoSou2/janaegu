import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import { VitePWA } from 'vite-plugin-pwa';

export default defineConfig({
  plugins: [
    react(),
    VitePWA({
      registerType: 'autoUpdate',
      includeAssets: ['favicon.svg', 'convite-compartilhar.jpg'],
      manifest: {
        name: 'Janaina & Gustavo — 18.12.2026',
        short_name: 'J & G',
        description: 'Confirmação de presença do casamento de Janaina e Gustavo.',
        theme_color: '#0A0A0A',
        background_color: '#F4F4F5',
        display: 'standalone',
        start_url: '/',
        icons: [
          { src: '/icons/icon-192.png', sizes: '192x192', type: 'image/png' },
          { src: '/icons/icon-512.png', sizes: '512x512', type: 'image/png' },
          { src: '/icons/icon-512-maskable.png', sizes: '512x512', type: 'image/png', purpose: 'maskable' }
        ]
      },
      workbox: {
        globPatterns: ['**/*.{js,css,html,svg,png,jpg,jpeg,ico}'],
        navigateFallbackDenylist: [/^\/admin/]
      }
    })
  ]
});

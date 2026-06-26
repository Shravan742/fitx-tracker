import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'
import { VitePWA } from 'vite-plugin-pwa'

// https://vite.dev/config/
export default defineConfig(({ command }) => ({
  base: command === 'build' ? '/fitx-tracker/' : '/',
  plugins: [
    react(),
    tailwindcss(),
    VitePWA({
      registerType: 'autoUpdate',
      includeAssets: ['favicon.svg'],
      manifest: {
        name: 'GymOS',
        short_name: 'GymOS',
        start_url: '.',
        display: 'standalone',
        background_color: '#0a0d0a',
        theme_color: '#0a0d0a',
        icons: [],
      },
      workbox: {
        globPatterns: ['**/*.{js,css,html,svg,png,jpg,jpeg}'],
        navigateFallbackDenylist: [/^\/img\//],
      },
    }),
  ],
}))

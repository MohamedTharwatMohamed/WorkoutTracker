import { defineConfig } from 'vitest/config';
import react from '@vitejs/plugin-react';
import tailwindcss from '@tailwindcss/vite';
import { VitePWA } from 'vite-plugin-pwa';

const appBuild = process.env.APP_BUILD ?? process.env.GITHUB_SHA ?? 'dev';

export default defineConfig({
  plugins: [
    react(),
    tailwindcss(),
    VitePWA({
      registerType: 'prompt',
      injectRegister: false,
      manifest: {
        name: 'Workout Tracker',
        short_name: 'Workout',
        display: 'standalone',
        orientation: 'portrait',
        start_url: '/',
        theme_color: '#0b0d10',
        background_color: '#0b0d10',
        icons: [
          { src: '/icons/icon-192.png', sizes: '192x192', type: 'image/png' },
          { src: '/icons/icon-512.png', sizes: '512x512', type: 'image/png' },
          {
            src: '/icons/icon-512-maskable.png',
            sizes: '512x512',
            type: 'image/png',
            purpose: 'maskable',
          },
        ],
      },
      workbox: {
        globPatterns: [
          '**/*.{js,css,html}',
          'catalog/*.json',
          'images/**/*.{webp,svg}',
          'fonts/*.woff2',
          'icons/*.png',
        ],
        navigateFallback: '/index.html',
      },
    }),
  ],
  define: {
    __APP_BUILD__: JSON.stringify(appBuild),
    __BUILD_TIME__: JSON.stringify(new Date().toISOString()),
  },
  test: {
    environment: 'jsdom',
    setupFiles: ['src/test/setup.ts'],
    include: ['src/**/*.test.{ts,tsx}', 'scripts/**/*.test.mjs'],
    coverage: {
      provider: 'v8',
      include: ['src/**'],
      thresholds: {
        'src/domain/**': { lines: 90, branches: 85 },
        'src/data/**': { lines: 80 },
        'src/db/**': { lines: 80 },
      },
    },
  },
});

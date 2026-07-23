import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import { VitePWA } from 'vite-plugin-pwa'

// アクセント色（藍）と背景（紙）はデザイントークンと一致させる
const THEME_COLOR = '#2F5D8A'
const BACKGROUND_COLOR = '#E7EBE9'

export default defineConfig({
  plugins: [
    react(),
    VitePWA({
      // 新 SW 検出時にアプリ内トーストで再読み込みを促す（自動リロードしない）
      registerType: 'prompt',
      injectRegister: null,
      includeAssets: ['favicon.svg', 'apple-touch-icon.png', 'fonts/*.woff2'],
      manifest: {
        name: 'Δ TaskLab',
        short_name: 'TaskLab',
        description: '計画と実測のズレ（Δ）を計測し、タスク構成を改善するアプリ',
        lang: 'ja',
        dir: 'ltr',
        start_url: '/?source=pwa',
        scope: '/',
        display: 'standalone',
        orientation: 'portrait',
        theme_color: THEME_COLOR,
        background_color: BACKGROUND_COLOR,
        icons: [
          { src: 'icons/icon-192.png', sizes: '192x192', type: 'image/png', purpose: 'any' },
          { src: 'icons/icon-512.png', sizes: '512x512', type: 'image/png', purpose: 'any' },
          { src: 'icons/icon-maskable-512.png', sizes: '512x512', type: 'image/png', purpose: 'maskable' },
        ],
      },
      workbox: {
        // アプリシェル（HTML / JS / CSS / フォント / アイコン）をプリキャッシュ
        globPatterns: ['**/*.{js,css,html,woff2,png,svg,ico,webmanifest}'],
        // SPA: ナビゲーションリクエストは index.html にフォールバック
        navigateFallback: 'index.html',
        cleanupOutdatedCaches: true,
        clientsClaim: true,
        // skipWaiting はユーザー操作時に messageSkipWaiting で明示的に行う
        skipWaiting: false,
      },
      devOptions: {
        enabled: false,
      },
    }),
  ],
})

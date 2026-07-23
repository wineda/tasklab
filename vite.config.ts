import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import { VitePWA } from 'vite-plugin-pwa'

// アクセント色（藍）と背景（紙）はデザイントークンと一致させる
const THEME_COLOR = '#2F5D8A'
const BACKGROUND_COLOR = '#E7EBE9'

// GitHub Pages（プロジェクトサイト）は /<repo>/ 配下で配信されるため base を合わせる。
// 独自ドメイン等でルート配信する場合は BASE_PATH=/ を渡す（env で上書き可）。
const BASE_PATH = process.env.BASE_PATH ?? '/tasklab/'

export default defineConfig({
  base: BASE_PATH,
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
        start_url: `${BASE_PATH}?source=pwa`,
        scope: BASE_PATH,
        id: BASE_PATH,
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
        // SPA: ナビゲーションリクエストは index.html にフォールバック（base 配下）
        navigateFallback: `${BASE_PATH}index.html`,
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

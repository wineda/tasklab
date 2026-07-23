// Service Worker 登録と更新通知（仕様書 §6.3）
// 新 SW 検出時にコールバックを発火。ユーザー操作で skipWaiting → リロード。

import { registerSW } from 'virtual:pwa-register'

type NeedRefreshHandler = (reload: () => void) => void

let pendingReload: (() => void) | null = null
let pendingHandler: NeedRefreshHandler | null = null

export function onNeedRefresh(handler: NeedRefreshHandler): void {
  pendingHandler = handler
  // 登録前に更新が検出済みだった場合に備える
  if (pendingReload) handler(pendingReload)
}

export function initServiceWorker(): void {
  const updateSW = registerSW({
    immediate: true,
    onNeedRefresh() {
      const reload = () => updateSW(true) // skipWaiting → コントローラ変更でリロード
      pendingReload = reload
      pendingHandler?.(reload)
    },
    onOfflineReady() {
      // 初回キャッシュ完了。特に通知は不要。
    },
  })
}

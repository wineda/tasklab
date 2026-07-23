import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import App from './App'
import { initServiceWorker } from './sw-update'
import './styles.css'

// ブラウザによるデータ削除を抑制（仕様書 §6.4）
if (navigator.storage?.persist) {
  navigator.storage.persist().catch(() => {})
}

initServiceWorker()

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <App />
  </StrictMode>,
)

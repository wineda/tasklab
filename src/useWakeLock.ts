// 画面スリープ抑止（Screen Wake Lock API）
// トグルで ON にしている間、画面が自動で暗くならないようにする。
// タブが非表示になるとブラウザ側でロックが解除されるため、再表示時に自動で再取得する。
import { useCallback, useEffect, useRef, useState } from 'react'

export function useWakeLock() {
  const supported = typeof navigator !== 'undefined' && 'wakeLock' in navigator
  const [active, setActive] = useState(false)
  const sentinelRef = useRef<WakeLockSentinel | null>(null)
  const wantRef = useRef(false) // ユーザーが ON を意図しているか

  const acquire = useCallback(async (): Promise<boolean> => {
    if (!supported) return false
    try {
      const s = await navigator.wakeLock.request('screen')
      sentinelRef.current = s
      s.addEventListener('release', () => {
        sentinelRef.current = null
        // ユーザーが OFF にした場合以外（システム解除）は、再表示時の再取得に任せる
        if (!wantRef.current) setActive(false)
      })
      return true
    } catch {
      return false
    }
  }, [supported])

  const toggle = useCallback(async () => {
    if (wantRef.current) {
      wantRef.current = false
      setActive(false)
      try {
        await sentinelRef.current?.release()
      } catch {
        // すでに解除済みなど
      }
      sentinelRef.current = null
    } else {
      wantRef.current = true
      const ok = await acquire()
      setActive(ok)
      if (!ok) wantRef.current = false
    }
  }, [acquire])

  // タブが再表示されたら再取得
  useEffect(() => {
    if (!supported) return
    const onVisibility = () => {
      if (document.visibilityState === 'visible' && wantRef.current && !sentinelRef.current) {
        acquire().then((ok) => {
          if (!ok) {
            wantRef.current = false
            setActive(false)
          }
        })
      }
    }
    document.addEventListener('visibilitychange', onVisibility)
    return () => document.removeEventListener('visibilitychange', onVisibility)
  }, [supported, acquire])

  // アンマウント時に解放
  useEffect(
    () => () => {
      wantRef.current = false
      sentinelRef.current?.release().catch(() => {})
      sentinelRef.current = null
    },
    [],
  )

  return { supported, active, toggle }
}

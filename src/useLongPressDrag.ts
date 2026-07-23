// 長押しドラッグ並べ替え（仕様書 §4.3）
import { useCallback, useEffect, useRef, useState } from 'react'

const LONG_PRESS_MS = 380
const MOVE_CANCEL_PX = 10

interface Options {
  itemCount: number
  onMove: (from: number, to: number) => void
  disabled?: boolean
}

interface DragApi {
  containerRef: React.RefObject<HTMLDivElement>
  onRowPointerDown: (index: number) => (e: React.PointerEvent) => void
  draggingIndex: number | null // ドラッグ成立中の行
  pendingIndex: number | null // 長押し待機中の行（ハイライト用）
}

export function useLongPressDrag({ itemCount, onMove, disabled }: Options): DragApi {
  const containerRef = useRef<HTMLDivElement>(null)
  const [draggingIndex, setDraggingIndex] = useState<number | null>(null)
  const [pendingIndex, setPendingIndex] = useState<number | null>(null)

  // ミュータブルなドラッグ状態
  const state = useRef({
    pointerId: -1,
    startX: 0,
    startY: 0,
    timer: 0 as number | ReturnType<typeof setTimeout>,
    dragging: false,
    currentIndex: -1,
  })

  const cleanup = useCallback(() => {
    const s = state.current
    clearTimeout(s.timer as number)
    s.pointerId = -1
    s.dragging = false
    s.currentIndex = -1
    document.body.classList.remove('dragging-active')
    setDraggingIndex(null)
    setPendingIndex(null)
  }, [])

  // ドラッグ中のみページスクロールを抑止（touchmove preventDefault）
  useEffect(() => {
    const handler = (e: TouchEvent) => {
      if (state.current.dragging) e.preventDefault()
    }
    document.addEventListener('touchmove', handler, { passive: false })
    return () => document.removeEventListener('touchmove', handler)
  }, [])

  const findTargetIndex = useCallback((clientY: number): number => {
    const container = containerRef.current
    if (!container) return state.current.currentIndex
    const rows = container.querySelectorAll<HTMLElement>('[data-drag-row]')
    for (let i = 0; i < rows.length; i++) {
      const r = rows[i].getBoundingClientRect()
      const center = r.top + r.height / 2
      if (clientY < center) return i
    }
    return rows.length - 1
  }, [])

  const onPointerMove = useCallback(
    (e: PointerEvent) => {
      const s = state.current
      if (s.pointerId !== e.pointerId) return

      if (!s.dragging) {
        // 待機中: 10px 超動いたらスクロールと判定して中止
        const dx = e.clientX - s.startX
        const dy = e.clientY - s.startY
        if (Math.hypot(dx, dy) > MOVE_CANCEL_PX) {
          cleanup()
        }
        return
      }

      // ドラッグ中: 行中心を跨いだらリアルタイム入れ替え
      const target = findTargetIndex(e.clientY)
      if (target !== -1 && target !== s.currentIndex) {
        onMove(s.currentIndex, target)
        s.currentIndex = target
        setDraggingIndex(target)
      }
    },
    [cleanup, findTargetIndex, onMove],
  )

  const onPointerUp = useCallback(() => {
    cleanup()
  }, [cleanup])

  // グローバルリスナの付け外し
  useEffect(() => {
    window.addEventListener('pointermove', onPointerMove)
    window.addEventListener('pointerup', onPointerUp)
    window.addEventListener('pointercancel', onPointerUp)
    return () => {
      window.removeEventListener('pointermove', onPointerMove)
      window.removeEventListener('pointerup', onPointerUp)
      window.removeEventListener('pointercancel', onPointerUp)
    }
  }, [onPointerMove, onPointerUp])

  useEffect(() => cleanup, [cleanup])

  const onRowPointerDown = useCallback(
    (index: number) => (e: React.PointerEvent) => {
      if (disabled || itemCount < 2) return
      // 主ボタン（タッチ / 左クリック）のみ
      if (e.button !== 0 && e.pointerType === 'mouse') return
      const s = state.current
      s.pointerId = e.pointerId
      s.startX = e.clientX
      s.startY = e.clientY
      s.dragging = false
      s.currentIndex = index
      setPendingIndex(index)

      s.timer = setTimeout(() => {
        s.dragging = true
        setPendingIndex(null)
        setDraggingIndex(index)
        document.body.classList.add('dragging-active')
        // 振動フィードバック（対応端末のみ）
        navigator.vibrate?.(12)
      }, LONG_PRESS_MS)
    },
    [disabled, itemCount],
  )

  return { containerRef, onRowPointerDown, draggingIndex, pendingIndex }
}

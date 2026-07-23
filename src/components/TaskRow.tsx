// タスク行 + 長押しドラッグ並べ替え（仕様書 §3.2 / §4.2 / §4.3、モック TaskList/TaskRow 準拠）
import { useEffect, useRef, useState } from 'react'
import { COLORS } from '../constants'
import { signStr } from '../metrics'
import type { Task } from '../types'

const LONG_PRESS_MS = 380
const MOVE_TOLERANCE = 10

function scalePct(v: number, maxMin: number): string {
  return `${Math.max(2, (v / (maxMin || 1)) * 100)}%`
}

// --- 1 タスク行 ---
function TaskRow({
  task,
  index,
  maxMin,
  isDragging,
  isArmed,
  onRowDown,
  onName,
  onEstimate,
  onActual,
  onRemove,
}: {
  task: Task
  index: number
  maxMin: number
  isDragging: boolean
  isArmed: boolean
  onRowDown: (e: React.PointerEvent, id: string) => void
  onName: (id: string, v: string) => void
  onEstimate: (id: string, v: string) => void
  onActual: (id: string, v: string) => void
  onRemove: (id: string) => void
}) {
  const est = task.estimateMin
  const act = task.actualMin
  const hasAct = act != null
  const delta = hasAct ? act - est : null
  const dColor =
    delta == null ? COLORS.gray : delta > 0 ? COLORS.rose : delta < 0 ? COLORS.green : COLORS.inkSoft

  return (
    <div
      data-row
      onPointerDown={(e) => onRowDown(e, task.id)}
      onContextMenu={(e) => {
        if (isDragging || isArmed) e.preventDefault()
      }}
      style={{
        display: 'flex',
        alignItems: 'stretch',
        borderBottom: isDragging ? '1px solid transparent' : `1px solid ${COLORS.line}`,
        background: isDragging ? '#fff' : isArmed ? `${COLORS.accent}0a` : 'transparent',
        boxShadow: isDragging
          ? `0 14px 32px rgba(30,38,44,.22), 0 3px 8px rgba(30,38,44,.12), 0 0 0 1.5px ${COLORS.accent}55`
          : 'none',
        borderRadius: isDragging ? 12 : 0,
        position: 'relative',
        zIndex: isDragging ? 3 : 1,
        transform: isDragging ? 'scale(1.02) rotate(-0.4deg)' : 'none',
        transition:
          'box-shadow .15s ease, transform .15s ease, border-radius .15s ease, background-color .2s ease',
        WebkitUserSelect: 'none',
        userSelect: 'none',
        WebkitTouchCallout: 'none',
        cursor: isDragging ? 'grabbing' : 'default',
      }}
    >
      <div style={{ flex: 1, minWidth: 0, padding: '9px 12px' }}>
        {/* 1 行目: 連番 / 名前 / Δ / 削除 */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 7, marginBottom: 6 }}>
          <span className="tl-mono" style={{ fontSize: 10.5, color: COLORS.gray }}>
            {String(index + 1).padStart(2, '0')}
          </span>
          <input
            value={task.name}
            onChange={(e) => onName(task.id, e.target.value)}
            onPointerDown={(e) => e.stopPropagation()}
            placeholder="タスク名"
            aria-label="タスク名"
            style={{
              flex: 1,
              minWidth: 0,
              border: 'none',
              background: 'transparent',
              fontSize: 14,
              fontWeight: 500,
              color: COLORS.ink,
              padding: 0,
              WebkitUserSelect: 'text',
              userSelect: 'text',
            }}
          />
          <span className="tl-mono" style={{ fontSize: 12, fontWeight: 700, color: dColor }}>
            {delta == null ? '' : `Δ ${signStr(delta)}`}
          </span>
          <button
            className="tl-btn tl-ghost"
            onClick={() => onRemove(task.id)}
            onPointerDown={(e) => e.stopPropagation()}
            title="削除"
            aria-label="タスクを削除"
            style={{
              border: 'none',
              background: 'transparent',
              color: COLORS.gray,
              fontSize: 17,
              cursor: 'pointer',
              width: 24,
              height: 24,
              borderRadius: 6,
              padding: 0,
              lineHeight: 1,
            }}
          >
            ×
          </button>
        </div>

        {/* 2 行目: バー / 計画入力 / 実測入力 */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 9 }}>
          <div style={{ flex: 1, minWidth: 0 }}>
            <div
              style={{
                height: 5,
                background: `${COLORS.plan}18`,
                borderRadius: 3,
                overflow: 'hidden',
                marginBottom: 3,
              }}
            >
              <div
                className="tl-bar"
                style={{ width: scalePct(est, maxMin), height: '100%', background: COLORS.plan, borderRadius: 3 }}
              />
            </div>
            <div style={{ height: 5, background: `${COLORS.actual}18`, borderRadius: 3, overflow: 'hidden' }}>
              <div
                className="tl-bar"
                style={{
                  width: hasAct ? scalePct(act, maxMin) : '0%',
                  height: '100%',
                  background: COLORS.actual,
                  borderRadius: 3,
                }}
              />
            </div>
          </div>
          <input
            className="tl-input tl-mono"
            type="number"
            min="0"
            inputMode="numeric"
            value={est == null ? '' : est}
            onChange={(e) => onEstimate(task.id, e.target.value)}
            onPointerDown={(e) => e.stopPropagation()}
            placeholder="計画"
            title="計画（見積もり）を編集"
            style={{
              width: 50,
              padding: '6px 6px',
              textAlign: 'right',
              fontSize: 13,
              border: `1px solid ${COLORS.plan}44`,
              borderRadius: 7,
              background: `${COLORS.plan}08`,
              color: COLORS.plan,
              flexShrink: 0,
            }}
          />
          <span style={{ color: COLORS.line, flexShrink: 0 }}>/</span>
          <div style={{ display: 'flex', alignItems: 'center', gap: 4, flexShrink: 0 }}>
            <input
              className="tl-input tl-mono"
              type="number"
              min="0"
              inputMode="numeric"
              value={act == null ? '' : act}
              onChange={(e) => onActual(task.id, e.target.value)}
              onPointerDown={(e) => e.stopPropagation()}
              placeholder="実測"
              aria-label="実測（分）"
              style={{
                width: 50,
                padding: '6px 6px',
                textAlign: 'right',
                fontSize: 13,
                border: `1px solid ${COLORS.line}`,
                borderRadius: 7,
                background: '#fff',
                color: COLORS.actual,
              }}
            />
            <span style={{ fontSize: 10.5, color: COLORS.inkSoft }}>分</span>
          </div>
        </div>
      </div>
    </div>
  )
}

// --- 長押しドラッグ対応リスト ---
export function TaskList({
  tasks,
  maxMin,
  onName,
  onEstimate,
  onActual,
  onRemove,
  onReorder,
}: {
  tasks: Task[]
  maxMin: number
  onName: (id: string, v: string) => void
  onEstimate: (id: string, v: string) => void
  onActual: (id: string, v: string) => void
  onRemove: (id: string) => void
  onReorder: (next: Task[]) => void
}) {
  const [dragId, setDragId] = useState<string | null>(null)
  const [armedId, setArmedId] = useState<string | null>(null)
  const containerRef = useRef<HTMLDivElement>(null)
  const tasksRef = useRef(tasks)
  const pendRef = useRef<{ id: string; x: number; y: number; timer: number } | null>(null)
  tasksRef.current = tasks

  // ドラッグ中はページスクロールとテキスト選択を抑止
  useEffect(() => {
    if (!dragId) return
    const prevent = (e: TouchEvent) => e.preventDefault()
    document.addEventListener('touchmove', prevent, { passive: false })
    document.body.style.userSelect = 'none'
    return () => {
      document.removeEventListener('touchmove', prevent)
      document.body.style.userSelect = ''
    }
  }, [dragId])

  useEffect(
    () => () => {
      if (pendRef.current) clearTimeout(pendRef.current.timer)
    },
    [],
  )

  const findTarget = (clientY: number): number => {
    const rows = containerRef.current
      ? Array.from(containerRef.current.querySelectorAll<HTMLElement>('[data-row]'))
      : []
    for (let i = 0; i < rows.length; i++) {
      const r = rows[i].getBoundingClientRect()
      if (clientY < r.top + r.height / 2) return i
    }
    return rows.length - 1
  }

  const cancelPending = () => {
    if (pendRef.current) {
      clearTimeout(pendRef.current.timer)
      pendRef.current = null
    }
    setArmedId(null)
  }

  const handleRowDown = (e: React.PointerEvent, id: string) => {
    // 入力・ボタン上では長押し判定しない
    const el = e.target as HTMLElement
    if (el.closest && el.closest('input,button,textarea,select,a')) return
    cancelPending()
    const timer = window.setTimeout(() => {
      pendRef.current = null
      setArmedId(null)
      setDragId(id)
      navigator.vibrate?.(12)
    }, LONG_PRESS_MS)
    pendRef.current = { id, x: e.clientX, y: e.clientY, timer }
    setArmedId(id)
  }

  const handleMove = (e: React.PointerEvent) => {
    // 長押し待機中に動いたら＝スクロール。ドラッグ化を中止
    if (pendRef.current && !dragId) {
      const dx = e.clientX - pendRef.current.x
      const dy = e.clientY - pendRef.current.y
      if (Math.hypot(dx, dy) > MOVE_TOLERANCE) cancelPending()
      return
    }
    if (!dragId) return
    const list = tasksRef.current
    const cur = list.findIndex((t) => t.id === dragId)
    if (cur < 0) return
    const target = findTarget(e.clientY)
    if (target < 0 || target === cur) return
    const c = [...list]
    const [x] = c.splice(cur, 1)
    c.splice(target, 0, x)
    onReorder(c)
  }

  const handleUp = () => {
    cancelPending()
    if (dragId) setDragId(null)
  }

  return (
    <div ref={containerRef} onPointerMove={handleMove} onPointerUp={handleUp} onPointerCancel={handleUp}>
      {tasks.map((t, i) => (
        <TaskRow
          key={t.id}
          task={t}
          index={i}
          maxMin={maxMin}
          isDragging={dragId === t.id}
          isArmed={armedId === t.id && !dragId}
          onRowDown={handleRowDown}
          onName={onName}
          onEstimate={onEstimate}
          onActual={onActual}
          onRemove={onRemove}
        />
      ))}
    </div>
  )
}

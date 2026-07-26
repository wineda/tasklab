// タスク行 + 長押しドラッグ並べ替え + ストップウォッチ計測（仕様書 §3.2 / §4.2 / §4.3 / §9）
import { useEffect, useRef, useState } from 'react'
import { COLORS } from '../constants'
import { fmt, isSection, signStr } from '../metrics'
import type { SectionTotals } from '../metrics'
import type { Task } from '../types'

const LONG_PRESS_MS = 380
const MOVE_TOLERANCE = 10

function scalePct(v: number, maxMin: number): string {
  return `${Math.max(2, (v / (maxMin || 1)) * 100)}%`
}

// 経過秒 → mm:ss
function mmss(sec: number): string {
  const s = Math.max(0, Math.floor(sec))
  const m = Math.floor(s / 60)
  const ss = s % 60
  return `${m}:${String(ss).padStart(2, '0')}`
}

// --- 1 タスク行 ---
function TaskRow({
  task,
  index,
  maxMin,
  isDragging,
  isArmed,
  elapsedSec,
  running,
  canLink,
  linked,
  inGroup,
  onRowDown,
  onName,
  onEstimate,
  onActual,
  onRemove,
  onTimerToggle,
  onTimerReset,
  onToggleParallel,
}: {
  task: Task
  index: number
  maxMin: number
  isDragging: boolean
  isArmed: boolean
  elapsedSec: number | null // null = 未計測（タイマー未使用）
  running: boolean
  canLink: boolean // 直前タスクと並行にできる（先頭以外）
  linked: boolean // 直前タスクと並行（グループの2件目以降）
  inGroup: boolean // 2 件以上の並行グループに属する（左バー表示用）
  onRowDown: (e: React.PointerEvent, id: string) => void
  onName: (id: string, v: string) => void
  onEstimate: (id: string, v: string) => void
  onActual: (id: string, v: string) => void
  onRemove: (id: string) => void
  onTimerToggle: (id: string) => void
  onTimerReset: (id: string) => void
  onToggleParallel: (id: string) => void
}) {
  const est = task.estimateMin
  const act = task.actualMin
  const hasAct = act != null
  const delta = hasAct ? act - est : null
  const dColor =
    delta == null ? COLORS.gray : delta > 0 ? COLORS.rose : delta < 0 ? COLORS.green : COLORS.inkSoft
  const stop = (e: React.PointerEvent) => e.stopPropagation()

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
      {/* 並行グループの左バー */}
      {inGroup && (
        <div
          aria-hidden
          style={{ width: 3, alignSelf: 'stretch', background: COLORS.accent, flexShrink: 0 }}
        />
      )}
      <div style={{ flex: 1, minWidth: 0, padding: '9px 12px' }}>
        {/* 1 行目: 連番 / 名前 / Δ / 削除 */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 7, marginBottom: 6 }}>
          <span className="tl-mono" style={{ fontSize: 10.5, color: COLORS.gray }}>
            {String(index + 1).padStart(2, '0')}
          </span>
          <input
            value={task.name}
            onChange={(e) => onName(task.id, e.target.value)}
            onPointerDown={stop}
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
          {canLink && (
            <button
              className="tl-btn"
              onClick={() => onToggleParallel(task.id)}
              onPointerDown={stop}
              aria-label={linked ? '上のタスクとの並行を解除' : '上のタスクと並行にする'}
              aria-pressed={linked}
              title={linked ? '上のタスクと並行（タップで解除）' : '上のタスクと並行にする'}
              style={{
                flexShrink: 0,
                fontSize: 10.5,
                fontWeight: 700,
                lineHeight: 1,
                padding: '3px 8px',
                borderRadius: 999,
                cursor: 'pointer',
                border: `1px solid ${linked ? COLORS.accent : COLORS.line}`,
                background: linked ? COLORS.accent : '#fff',
                color: linked ? '#fff' : COLORS.gray,
              }}
            >
              ⇄ 並行
            </button>
          )}
          <span className="tl-mono" style={{ fontSize: 12, fontWeight: 700, color: dColor }}>
            {delta == null ? '' : `Δ ${signStr(delta)}`}
          </span>
          <button
            className="tl-btn tl-ghost"
            onClick={() => onRemove(task.id)}
            onPointerDown={stop}
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

        {/* 2 行目: バー / 計画入力 / 実測入力 / ストップウォッチ */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
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
            onPointerDown={stop}
            placeholder="計画"
            title="計画（見積もり）を編集"
            style={{
              width: 46,
              padding: '6px 5px',
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
          <input
            className="tl-input tl-mono"
            type="number"
            min="0"
            inputMode="numeric"
            value={act == null ? '' : act}
            onChange={(e) => onActual(task.id, e.target.value)}
            onPointerDown={stop}
            placeholder="実測"
            aria-label="実測（分）"
            style={{
              width: 46,
              padding: '6px 5px',
              textAlign: 'right',
              fontSize: 13,
              border: running ? `1px solid ${COLORS.actual}` : `1px solid ${COLORS.line}`,
              borderRadius: 7,
              background: running ? `${COLORS.actual}0e` : '#fff',
              color: COLORS.actual,
              flexShrink: 0,
            }}
          />
          <span style={{ fontSize: 10.5, color: COLORS.inkSoft, flexShrink: 0 }}>分</span>
          <button
            className="tl-btn"
            onClick={() => onTimerToggle(task.id)}
            onPointerDown={stop}
            aria-label={running ? '計測を一時停止' : '実測を計測開始'}
            title={running ? '一時停止' : 'ストップウォッチで実測を計測'}
            style={{
              width: 30,
              height: 30,
              flexShrink: 0,
              borderRadius: 8,
              border: `1px solid ${running ? COLORS.actual : COLORS.accent}`,
              background: running ? COLORS.actual : '#fff',
              color: running ? '#fff' : COLORS.accent,
              fontSize: 12,
              lineHeight: 1,
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              padding: 0,
            }}
          >
            {running ? '❚❚' : '▶'}
          </button>
        </div>

        {/* 3 行目（計測中／一時停止中のみ）: 経過時間 + リセット */}
        {elapsedSec != null && (
          <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginTop: 8, paddingLeft: 2 }}>
            <span
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: 6,
                fontSize: 12,
                fontWeight: 700,
                color: running ? COLORS.actual : COLORS.inkSoft,
              }}
            >
              <span
                className={running ? 'tl-pulse' : undefined}
                style={{
                  width: 7,
                  height: 7,
                  borderRadius: '50%',
                  background: running ? COLORS.actual : COLORS.gray,
                  display: 'inline-block',
                }}
              />
              <span className="tl-mono">{mmss(elapsedSec)}</span>
            </span>
            <span style={{ fontSize: 11, color: COLORS.gray }}>
              {running ? '計測中…（実測に自動反映）' : '一時停止中'}
            </span>
            <button
              className="tl-btn tl-ghost"
              onClick={() => onTimerReset(task.id)}
              onPointerDown={stop}
              style={{
                marginLeft: 'auto',
                border: `1px solid ${COLORS.line}`,
                background: '#fff',
                color: COLORS.inkSoft,
                fontSize: 11,
                fontWeight: 600,
                borderRadius: 7,
                padding: '4px 9px',
                cursor: 'pointer',
              }}
            >
              リセット
            </button>
          </div>
        )}
      </div>
    </div>
  )
}

// --- セクション見出し行 ---
function SectionRow({
  task,
  totals,
  isDragging,
  isArmed,
  onRowDown,
  onName,
  onRemove,
}: {
  task: Task
  totals: SectionTotals | undefined
  isDragging: boolean
  isArmed: boolean
  onRowDown: (e: React.PointerEvent, id: string) => void
  onName: (id: string, v: string) => void
  onRemove: (id: string) => void
}) {
  const t = totals ?? { count: 0, measured: 0, plan: 0, actual: 0, delta: 0 }
  const dColor = t.delta > 0 ? COLORS.rose : t.delta < 0 ? COLORS.green : COLORS.inkSoft
  const stop = (e: React.PointerEvent) => e.stopPropagation()

  return (
    <div
      data-row
      onPointerDown={(e) => onRowDown(e, task.id)}
      onContextMenu={(e) => {
        if (isDragging || isArmed) e.preventDefault()
      }}
      style={{
        display: 'flex',
        alignItems: 'center',
        gap: 8,
        padding: '8px 12px',
        background: isDragging ? '#fff' : isArmed ? `${COLORS.accent}14` : `${COLORS.accent}0a`,
        borderTop: `2px solid ${isDragging ? 'transparent' : COLORS.line}`,
        borderBottom: isDragging ? '1px solid transparent' : `1px solid ${COLORS.line}`,
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
      <span aria-hidden style={{ color: COLORS.accent, fontSize: 11, flexShrink: 0 }}>
        §
      </span>
      <input
        value={task.name}
        onChange={(e) => onName(task.id, e.target.value)}
        onPointerDown={stop}
        placeholder="セクション名"
        aria-label="セクション名"
        className="tl-disp"
        style={{
          flex: 1,
          minWidth: 0,
          border: 'none',
          background: 'transparent',
          fontSize: 13,
          fontWeight: 700,
          letterSpacing: '0.02em',
          color: COLORS.accent,
          padding: 0,
          WebkitUserSelect: 'text',
          userSelect: 'text',
        }}
      />
      {/* セクション合計（計画 / 実測 / Δ） */}
      <span
        className="tl-mono"
        style={{ fontSize: 11, color: COLORS.inkSoft, flexShrink: 0, display: 'flex', gap: 7 }}
      >
        <span style={{ color: COLORS.plan }}>{fmt(t.plan)}</span>
        <span style={{ color: COLORS.gray }}>/</span>
        <span style={{ color: COLORS.actual }}>{t.measured > 0 ? fmt(t.actual) : '—'}</span>
        {t.measured > 0 && (
          <span style={{ fontWeight: 700, color: dColor }}>Δ {signStr(t.delta)}</span>
        )}
      </span>
      <button
        className="tl-btn tl-ghost"
        onClick={() => onRemove(task.id)}
        onPointerDown={stop}
        title="セクションを削除（タスクは残ります）"
        aria-label="セクションを削除"
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
          flexShrink: 0,
        }}
      >
        ×
      </button>
    </div>
  )
}

// --- 長押しドラッグ対応リスト ---
export function TaskList({
  tasks,
  maxMin,
  runningId,
  elapsedMap,
  sectionTotals,
  onName,
  onEstimate,
  onActual,
  onRemove,
  onReorder,
  onTimerToggle,
  onTimerReset,
  onToggleParallel,
}: {
  tasks: Task[]
  maxMin: number
  runningId: string | null
  elapsedMap: Record<string, number | null>
  sectionTotals: Record<string, SectionTotals>
  onName: (id: string, v: string) => void
  onEstimate: (id: string, v: string) => void
  onActual: (id: string, v: string) => void
  onRemove: (id: string) => void
  onReorder: (next: Task[]) => void
  onTimerToggle: (id: string) => void
  onTimerReset: (id: string) => void
  onToggleParallel: (id: string) => void
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
      {(() => {
        let taskNo = 0
        return tasks.map((t, i) => {
          if (isSection(t)) {
            return (
              <SectionRow
                key={t.id}
                task={t}
                totals={sectionTotals[t.id]}
                isDragging={dragId === t.id}
                isArmed={armedId === t.id && !dragId}
                onRowDown={handleRowDown}
                onName={onName}
                onRemove={onRemove}
              />
            )
          }
          taskNo += 1
          const prev = i > 0 ? tasks[i - 1] : null
          const next = i < tasks.length - 1 ? tasks[i + 1] : null
          // 並行リンクはセクションをまたげない
          const canLink = prev != null && !isSection(prev)
          const linked = canLink && !!t.parallel
          const nextLinked = next != null && !isSection(next) && !!next.parallel
          return (
            <TaskRow
              key={t.id}
              task={t}
              index={taskNo - 1}
              maxMin={maxMin}
              isDragging={dragId === t.id}
              isArmed={armedId === t.id && !dragId}
              elapsedSec={elapsedMap[t.id] ?? null}
              running={runningId === t.id}
              canLink={canLink}
              linked={linked}
              inGroup={linked || nextLinked}
              onRowDown={handleRowDown}
              onName={onName}
              onEstimate={onEstimate}
              onActual={onActual}
              onRemove={onRemove}
              onTimerToggle={onTimerToggle}
              onTimerReset={onTimerReset}
              onToggleParallel={onToggleParallel}
            />
          )
        })
      })()}
    </div>
  )
}

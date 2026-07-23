// タスク行（仕様書 §3.2 / §4.2）
import { COLORS } from '../constants'
import { taskDelta, barPct, fmtSigned } from '../metrics'
import type { Task } from '../types'

export function TaskRow({
  index,
  task,
  barMaxValue,
  canReorder,
  isDragging,
  isPending,
  reducedMotion,
  onPointerDown,
  onName,
  onEstimate,
  onActual,
  onDelete,
}: {
  index: number
  task: Task
  barMaxValue: number
  canReorder: boolean
  isDragging: boolean
  isPending: boolean
  reducedMotion: boolean
  onPointerDown: (e: React.PointerEvent) => void
  onName: (v: string) => void
  onEstimate: (v: string) => void
  onActual: (v: string) => void
  onDelete: () => void
}) {
  const d = taskDelta(task)
  const dColor = d === null ? COLORS.gray : d > 0 ? COLORS.rose : d < 0 ? COLORS.green : COLORS.gray

  const floating: React.CSSProperties = isDragging
    ? {
        borderRadius: 12,
        boxShadow: '0 2px 6px rgba(0,0,0,0.10), 0 10px 24px rgba(0,0,0,0.16)',
        outline: `2px solid ${COLORS.accent}`,
        outlineOffset: -1,
        background: COLORS.surface,
        transform: reducedMotion ? undefined : 'scale(1.02) rotate(-0.4deg)',
        zIndex: 5,
        position: 'relative',
      }
    : {}

  return (
    <div
      data-drag-row
      style={{
        padding: '10px 4px',
        borderTop: index === 0 ? 'none' : `1px solid ${COLORS.line}`,
        background: isPending ? COLORS.accentSoft : 'transparent',
        transition: reducedMotion ? 'none' : 'background 120ms ease',
        touchAction: isDragging ? 'none' : 'auto',
        ...floating,
      }}
    >
      {/* 1 行目: グリップ / 連番 / 名前 / Δ / 削除 */}
      <div
        onPointerDown={onPointerDown}
        style={{
          display: 'flex',
          alignItems: 'center',
          gap: 8,
          // 長押し中に iOS のテキスト選択・コールアウトが割り込むのを防ぐ
          WebkitUserSelect: 'none',
          userSelect: 'none',
          WebkitTouchCallout: 'none',
          cursor: canReorder ? 'grab' : 'default',
        }}
      >
        {canReorder && (
          <span
            aria-hidden
            title="長押しで並べ替え"
            style={{
              flexShrink: 0,
              color: isDragging ? COLORS.accent : COLORS.gray,
              fontSize: 15,
              lineHeight: 1,
              letterSpacing: '-1px',
              width: 14,
              textAlign: 'center',
            }}
          >
            ⠿
          </span>
        )}
        <span
          className="mono"
          style={{ fontSize: 12, color: COLORS.gray, width: 18, textAlign: 'right', flexShrink: 0 }}
        >
          {index + 1}
        </span>
        <input
          value={task.name}
          onChange={(e) => onName(e.target.value)}
          onPointerDown={(e) => e.stopPropagation()}
          placeholder="タスク名"
          style={{
            flex: 1,
            minWidth: 0,
            border: 'none',
            borderBottom: `1px solid transparent`,
            background: 'transparent',
            fontSize: 14,
            fontWeight: 600,
            padding: '2px 0',
            color: COLORS.ink,
            // 親の user-select:none を打ち消して名前は編集・選択可能に
            WebkitUserSelect: 'text',
            userSelect: 'text',
          }}
        />
        <span
          className="mono"
          style={{ fontSize: 13, fontWeight: 700, color: dColor, flexShrink: 0 }}
        >
          {d === null ? '' : fmtSigned(d)}
        </span>
        <button
          onClick={onDelete}
          onPointerDown={(e) => e.stopPropagation()}
          aria-label="タスクを削除"
          style={{
            width: 28,
            height: 28,
            borderRadius: 8,
            border: 'none',
            background: 'transparent',
            color: COLORS.gray,
            fontSize: 16,
            flexShrink: 0,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
          }}
        >
          ×
        </button>
      </div>

      {/* 2 行目: バー + 計画入力 + 実測入力 + 単位 */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginTop: 8, paddingLeft: 26 }}>
        <div style={{ flex: 1, minWidth: 0, display: 'flex', flexDirection: 'column', gap: 3 }}>
          <Bar value={task.estimateMin} max={barMaxValue} color={COLORS.plan} />
          <Bar
            value={task.actualMin ?? 0}
            max={barMaxValue}
            color={COLORS.actual}
            faded={task.actualMin === null}
          />
        </div>
        <NumInput
          value={task.estimateMin}
          onChange={onEstimate}
          ariaLabel="計画（分）"
          accent={COLORS.plan}
        />
        <NumInput
          value={task.actualMin}
          onChange={onActual}
          ariaLabel="実測（分）"
          accent={COLORS.actual}
          placeholder="—"
        />
        <span style={{ fontSize: 11, color: COLORS.inkSoft, flexShrink: 0 }}>分</span>
      </div>
    </div>
  )
}

function Bar({
  value,
  max,
  color,
  faded,
}: {
  value: number
  max: number
  color: string
  faded?: boolean
}) {
  return (
    <div style={{ height: 4, borderRadius: 2, background: COLORS.line, overflow: 'hidden' }}>
      <div
        style={{
          height: '100%',
          width: `${barPct(value, max)}%`,
          background: color,
          opacity: faded ? 0.25 : 1,
          borderRadius: 2,
        }}
      />
    </div>
  )
}

function NumInput({
  value,
  onChange,
  ariaLabel,
  accent,
  placeholder,
}: {
  value: number | null
  onChange: (v: string) => void
  ariaLabel: string
  accent: string
  placeholder?: string
}) {
  return (
    <input
      value={value === null ? '' : String(value)}
      onChange={(e) => onChange(e.target.value)}
      onPointerDown={(e) => e.stopPropagation()}
      inputMode="numeric"
      aria-label={ariaLabel}
      placeholder={placeholder}
      style={{
        width: 44,
        flexShrink: 0,
        textAlign: 'right',
        border: `1px solid ${COLORS.line}`,
        borderRadius: 8,
        padding: '6px 6px',
        fontSize: 13,
        fontFamily: 'var(--font-mono)',
        color: accent,
        background: COLORS.surface,
        minHeight: 36,
      }}
    />
  )
}

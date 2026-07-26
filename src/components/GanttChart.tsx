// ガントチャート（計画 / 実測のタイムライン表示）
// 記載順に直列・並行グループは同時開始、という既存のスケジュール意味論を可視化する。
// レイアウト: タスク名をバーの上に置き、トラック（時間軸領域）は全幅を使う。
// ズーム: 「時間幅」で画面幅が表す時間を選択。ズーム中は横スクロールし、
// タスク名は position: sticky で左端に固定される。
import { useMemo, useState } from 'react'
import { COLORS } from '../constants'
import { computeSchedule, fmt } from '../metrics'
import type { GanttRow } from '../metrics'
import type { Task } from '../types'

// 目盛り間隔: 表示ウィンドウ内でラベルが 5 個以内に収まる「きり」のいい分数
function pickStep(windowMin: number): number {
  const steps = [1, 2, 5, 10, 15, 30, 60, 120, 240, 480, 960]
  for (const s of steps) if (windowMin / s <= 5) return s
  return 1920
}

// ズーム候補（画面幅が表す時間）。全体表示は null。
const ZOOM_OPTIONS: { label: string; min: number }[] = [
  { label: '1h', min: 60 },
  { label: '30m', min: 30 },
  { label: '15m', min: 15 },
]

// sticky なタスク名の最大幅（ビューポートからカード余白ぶんを引いた値）
const STICKY_MAX_W = 'min(86vw, 420px)'

export function GanttChart({ tasks, collapsible = true }: { tasks: Task[]; collapsible?: boolean }) {
  const [collapsed, setCollapsed] = useState(false)
  const [windowMin, setWindowMin] = useState<number | null>(null) // null = 全体
  const open = !collapsible || !collapsed
  const { rows, planEnd, actualEnd } = useMemo(() => computeSchedule(tasks), [tasks])
  const total = Math.max(planEnd, actualEnd, 1)

  // 実効ウィンドウ: 全体より広いズームは意味がないので全体にフォールバック
  const effWindow = windowMin != null && windowMin < total ? windowMin : total
  const zoomPct = (total / effWindow) * 100 // チャート内容の幅（スクロール親に対する %）
  const step = pickStep(effWindow)
  const ticks: number[] = []
  for (let v = step; v <= total; v += step) ticks.push(v)

  // 全体より狭いズームだけ提示（1 つも無ければセレクタ非表示）
  const zoomOptions = ZOOM_OPTIONS.filter((o) => o.min < total)

  return (
    <div
      style={{
        background: COLORS.surface,
        border: `1px solid ${COLORS.line}`,
        borderRadius: 12,
        marginBottom: 14,
        overflow: 'hidden',
      }}
    >
      <button
        className="tl-btn tl-ghost"
        onClick={() => collapsible && setCollapsed((v) => !v)}
        aria-expanded={open}
        disabled={!collapsible}
        style={{
          width: '100%',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          padding: '11px 14px',
          border: 'none',
          background: 'transparent',
          cursor: collapsible ? 'pointer' : 'default',
          opacity: 1,
        }}
      >
        <span
          className="tl-disp"
          style={{ fontSize: 12.5, fontWeight: 600, letterSpacing: '0.04em', color: COLORS.inkSoft }}
        >
          ガントチャート
        </span>
        <span style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          <span className="tl-mono" style={{ fontSize: 10, color: COLORS.gray }}>
            計画<span style={{ color: COLORS.plan }}> ■</span>　実測
            <span style={{ color: COLORS.actual }}> ■</span>
          </span>
          {collapsible && (
            <span style={{ color: COLORS.gray, fontSize: 11 }}>{open ? '▲' : '▼'}</span>
          )}
        </span>
      </button>

      {open && (
        <div style={{ borderTop: `1px solid ${COLORS.line}`, padding: '10px 14px 12px' }}>
          {/* 時間幅（ズーム）セレクタ */}
          {zoomOptions.length > 0 && (
            <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 10 }}>
              <span style={{ fontSize: 10.5, color: COLORS.gray, flexShrink: 0 }}>時間幅</span>
              <ZoomButton label="全体" selected={windowMin == null} onClick={() => setWindowMin(null)} />
              {zoomOptions.map((o) => (
                <ZoomButton
                  key={o.min}
                  label={o.label}
                  selected={windowMin === o.min}
                  onClick={() => setWindowMin(o.min)}
                />
              ))}
              {windowMin != null && (
                <span style={{ fontSize: 10, color: COLORS.gray, marginLeft: 'auto' }}>← 横スクロール →</span>
              )}
            </div>
          )}

          {/* スクロール領域（ズーム時のみ内容が広がる） */}
          <div style={{ overflowX: 'auto', WebkitOverflowScrolling: 'touch' }} data-gantt-scroll>
            <div style={{ width: `${zoomPct}%`, minWidth: '100%' }}>
              {/* 時間軸（0 起点、目盛りはグリッド線の真上に中央揃え） */}
              <div style={{ position: 'relative', height: 15 }}>
                <span
                  className="tl-mono"
                  style={{ position: 'absolute', left: 0, fontSize: 9.5, color: COLORS.gray, lineHeight: '15px' }}
                >
                  0
                </span>
                {ticks.map((v) => (
                  <span
                    key={v}
                    className="tl-mono"
                    style={{
                      position: 'absolute',
                      left: `${(v / total) * 100}%`,
                      // 終端のラベルは右揃えにして、はみ出しスクロールを防ぐ
                      transform: v / total > 0.97 ? 'translateX(-100%)' : 'translateX(-50%)',
                      fontSize: 9.5,
                      color: COLORS.gray,
                      whiteSpace: 'nowrap',
                      lineHeight: '15px',
                    }}
                  >
                    {fmt(v)}
                  </span>
                ))}
              </div>

              {/* 行 */}
              {rows.map((r) =>
                r.kind === 'section' ? (
                  <SectionLabelRow key={r.task.id} name={r.task.name} />
                ) : (
                  <TaskBarRow key={r.task.id} row={r} total={total} ticks={ticks} />
                ),
              )}
            </div>
          </div>

          {/* フッター: 終端の要約 */}
          <div
            className="tl-mono"
            style={{
              display: 'flex',
              justifyContent: 'flex-end',
              gap: 12,
              fontSize: 10,
              color: COLORS.inkSoft,
              marginTop: 8,
            }}
          >
            <span>
              計画 <span style={{ color: COLORS.plan, fontWeight: 700 }}>{fmt(planEnd)}</span>
            </span>
            {actualEnd > 0 && (
              <span>
                実測 <span style={{ color: COLORS.actual, fontWeight: 700 }}>{fmt(actualEnd)}</span>
              </span>
            )}
          </div>
        </div>
      )}
    </div>
  )
}

// --- ズームボタン ---
function ZoomButton({ label, selected, onClick }: { label: string; selected: boolean; onClick: () => void }) {
  return (
    <button
      className="tl-btn tl-mono"
      onClick={onClick}
      aria-pressed={selected}
      style={{
        fontSize: 10.5,
        fontWeight: 700,
        lineHeight: 1,
        padding: '5px 9px',
        borderRadius: 999,
        cursor: 'pointer',
        border: `1px solid ${selected ? COLORS.accent : COLORS.line}`,
        background: selected ? COLORS.accent : '#fff',
        color: selected ? '#fff' : COLORS.inkSoft,
        flexShrink: 0,
      }}
    >
      {label}
    </button>
  )
}

// --- セクション見出し（罫線付きディバイダ。名前は左端に固定）---
function SectionLabelRow({ name }: { name: string }) {
  return (
    <div
      style={{
        padding: '9px 0 4px',
        borderBottom: `1px solid ${COLORS.line}`,
        marginBottom: 2,
      }}
    >
      <span
        className="tl-disp"
        style={{
          position: 'sticky',
          left: 0,
          display: 'inline-block',
          fontSize: 11,
          fontWeight: 700,
          color: COLORS.accent,
          whiteSpace: 'nowrap',
          overflow: 'hidden',
          textOverflow: 'ellipsis',
          maxWidth: STICKY_MAX_W,
        }}
      >
        § {name || 'セクション'}
      </span>
    </div>
  )
}

// --- タスク 1 行（名前 + 数値は左端に固定 / 全幅トラックにバー 2 本）---
function TaskBarRow({ row, total, ticks }: { row: GanttRow; total: number; ticks: number[] }) {
  const pct = (v: number) => (v / total) * 100
  const measured = row.actualStart != null && row.actualDur != null
  const delta = measured ? (row.actualDur as number) - row.planDur : null
  const dColor =
    delta == null ? COLORS.gray : delta > 0 ? COLORS.rose : delta < 0 ? COLORS.green : COLORS.inkSoft

  return (
    <div style={{ padding: '5px 0 7px' }}>
      {/* 名前 + 数値（計画 → 実測）: ズーム中も sticky で左端に固定 */}
      <div
        style={{
          position: 'sticky',
          left: 0,
          display: 'flex',
          alignItems: 'baseline',
          gap: 8,
          marginBottom: 3,
          width: 'fit-content',
          maxWidth: STICKY_MAX_W,
        }}
      >
        <span
          style={{
            fontSize: 11.5,
            fontWeight: 500,
            color: COLORS.ink,
            whiteSpace: 'nowrap',
            overflow: 'hidden',
            textOverflow: 'ellipsis',
          }}
        >
          {row.task.name || '（無題）'}
        </span>
        <span className="tl-mono" style={{ fontSize: 9.5, color: COLORS.gray, flexShrink: 0 }}>
          <span style={{ color: COLORS.plan }}>{fmt(row.planDur)}</span>
          {measured && (
            <>
              {' → '}
              <span style={{ color: dColor, fontWeight: 700 }}>{fmt(row.actualDur as number)}</span>
            </>
          )}
        </span>
      </div>

      {/* トラック（背景 + 行内グリッド線 + バー） */}
      <div
        style={{
          position: 'relative',
          height: 16,
          background: '#EFF3F1',
          borderRadius: 4,
          overflow: 'hidden',
        }}
      >
        {ticks.map((v) => (
          <span
            key={v}
            aria-hidden
            style={{
              position: 'absolute',
              top: 0,
              bottom: 0,
              left: `${pct(v)}%`,
              width: 1,
              background: `${COLORS.line}AA`,
            }}
          />
        ))}
        {row.planDur > 0 && (
          <span
            data-gantt-plan={`${row.planStart}:${row.planDur}`}
            style={{
              position: 'absolute',
              top: 2,
              height: 5,
              borderRadius: 3,
              left: `${pct(row.planStart)}%`,
              width: `max(${pct(row.planDur)}%, 3px)`,
              background: COLORS.plan,
            }}
          />
        )}
        {measured && (row.actualDur as number) > 0 && (
          <span
            data-gantt-actual={`${row.actualStart}:${row.actualDur}`}
            style={{
              position: 'absolute',
              top: 9,
              height: 5,
              borderRadius: 3,
              left: `${pct(row.actualStart as number)}%`,
              width: `max(${pct(row.actualDur as number)}%, 3px)`,
              background: COLORS.actual,
            }}
          />
        )}
      </div>
    </div>
  )
}

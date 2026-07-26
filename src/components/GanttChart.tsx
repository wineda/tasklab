// ガントチャート（計画 / 実測のタイムライン表示）
// 記載順に直列・並行グループは同時開始、という既存のスケジュール意味論を可視化する。
import { useMemo, useState } from 'react'
import { COLORS } from '../constants'
import { computeSchedule, fmt } from '../metrics'
import type { Task } from '../types'

const LABEL_W = 92 // 左のタスク名カラム幅(px)

// 目盛り間隔: ラベルが 6 個以内に収まる「きり」のいい分数を選ぶ
function pickStep(total: number): number {
  const steps = [5, 10, 15, 30, 60, 120, 240, 480, 960]
  for (const s of steps) if (total / s <= 6) return s
  return 1920
}

export function GanttChart({ tasks, collapsible = true }: { tasks: Task[]; collapsible?: boolean }) {
  const [collapsed, setCollapsed] = useState(false)
  const open = !collapsible || !collapsed
  const schedule = useMemo(() => computeSchedule(tasks), [tasks])
  const { rows, planEnd, actualEnd } = schedule
  const total = Math.max(planEnd, actualEnd, 1)
  const step = pickStep(total)
  const ticks: number[] = []
  for (let v = step; v <= total; v += step) ticks.push(v)

  const pct = (v: number) => (v / total) * 100

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
        <div style={{ borderTop: `1px solid ${COLORS.line}`, padding: '8px 14px 12px' }}>
          {/* 本体（グリッド線は全行を貫く背景レイヤー） */}
          <div style={{ position: 'relative' }}>
            <div
              aria-hidden
              style={{ position: 'absolute', top: 0, bottom: 0, left: LABEL_W, right: 0 }}
            >
              {ticks.map((v) => (
                <div
                  key={v}
                  style={{
                    position: 'absolute',
                    top: 0,
                    bottom: 0,
                    left: `${pct(v)}%`,
                    width: 1,
                    background: `${COLORS.line}88`,
                  }}
                />
              ))}
            </div>

            {/* 時間軸 */}
            <div style={{ display: 'flex', height: 16, position: 'relative' }}>
              <div style={{ width: LABEL_W, flexShrink: 0 }} />
              <div style={{ flex: 1, position: 'relative' }}>
                {ticks.map((v) => (
                  <span
                    key={v}
                    className="tl-mono"
                    style={{
                      position: 'absolute',
                      left: `${pct(v)}%`,
                      transform: 'translateX(-100%)',
                      fontSize: 9,
                      color: COLORS.gray,
                      paddingRight: 3,
                      lineHeight: '16px',
                      whiteSpace: 'nowrap',
                    }}
                  >
                    {fmt(v)}
                  </span>
                ))}
              </div>
            </div>

            {/* 行 */}
            {rows.map((r) =>
              r.kind === 'section' ? (
                <div
                  key={r.task.id}
                  style={{ display: 'flex', alignItems: 'center', height: 18, position: 'relative' }}
                >
                  <span
                    className="tl-disp"
                    style={{
                      fontSize: 10.5,
                      fontWeight: 700,
                      color: COLORS.accent,
                      whiteSpace: 'nowrap',
                      overflow: 'hidden',
                      textOverflow: 'ellipsis',
                      maxWidth: '100%',
                    }}
                  >
                    § {r.task.name}
                  </span>
                </div>
              ) : (
                <div
                  key={r.task.id}
                  style={{ display: 'flex', alignItems: 'center', height: 26, position: 'relative' }}
                >
                  <span
                    style={{
                      width: LABEL_W,
                      flexShrink: 0,
                      fontSize: 11,
                      color: COLORS.ink,
                      whiteSpace: 'nowrap',
                      overflow: 'hidden',
                      textOverflow: 'ellipsis',
                      paddingRight: 8,
                    }}
                  >
                    {r.task.name || '（無題）'}
                  </span>
                  <div style={{ flex: 1, position: 'relative', height: '100%' }}>
                    {r.planDur > 0 && (
                      <div
                        data-gantt-plan={`${r.planStart}:${r.planDur}`}
                        style={{
                          position: 'absolute',
                          top: 6,
                          height: 5,
                          borderRadius: 3,
                          left: `${pct(r.planStart)}%`,
                          width: `max(${pct(r.planDur)}%, 2px)`,
                          background: COLORS.plan,
                        }}
                      />
                    )}
                    {r.actualStart != null && r.actualDur != null && r.actualDur > 0 && (
                      <div
                        data-gantt-actual={`${r.actualStart}:${r.actualDur}`}
                        style={{
                          position: 'absolute',
                          top: 14,
                          height: 5,
                          borderRadius: 3,
                          left: `${pct(r.actualStart)}%`,
                          width: `max(${pct(r.actualDur)}%, 2px)`,
                          background: COLORS.actual,
                        }}
                      />
                    )}
                  </div>
                </div>
              ),
            )}
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
              marginTop: 6,
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

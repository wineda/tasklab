// ラン一覧画面（ホーム）（仕様書 §3.1 / モック ListScreen 準拠）
import { COLORS } from '../constants'
import { computeMetrics, fmt } from '../metrics'
import type { Run } from '../types'
import { DeltaPill } from './common'

function mdate(ts: number): string {
  const d = new Date(ts)
  return `${d.getMonth() + 1}/${d.getDate()}`
}

const miniBtn: React.CSSProperties = {
  border: 'none',
  background: 'transparent',
  color: COLORS.inkSoft,
  fontSize: 13,
  fontWeight: 500,
  cursor: 'pointer',
  padding: '4px 6px',
  borderRadius: 6,
}

export function RunList({
  runs,
  onOpen,
  onNew,
  onDuplicate,
  onDelete,
  onOpenSettings,
}: {
  runs: Run[]
  onOpen: (id: string) => void
  onNew: () => void
  onDuplicate: (id: string) => void
  onDelete: (id: string) => void
  onOpenSettings: () => void
}) {
  return (
    <div className="tl-view">
      <header style={{ marginBottom: 18 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 9 }}>
          <span
            className="tl-disp"
            style={{ fontSize: 34, fontWeight: 700, color: COLORS.accent, lineHeight: 1 }}
          >
            Δ
          </span>
          <h1
            className="tl-disp"
            style={{ fontSize: 23, fontWeight: 600, margin: 0, letterSpacing: '-0.02em' }}
          >
            TaskLab
          </h1>
          <button
            className="tl-btn tl-ghost"
            onClick={onOpenSettings}
            aria-label="設定"
            title="設定"
            style={{
              marginLeft: 'auto',
              width: 38,
              height: 38,
              borderRadius: 10,
              border: `1px solid ${COLORS.line}`,
              background: COLORS.surface,
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              padding: 0,
            }}
          >
            <svg
              width="18"
              height="18"
              viewBox="0 0 24 24"
              fill="none"
              stroke={COLORS.inkSoft}
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
              aria-hidden="true"
            >
              <circle cx="12" cy="12" r="3" />
              <path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 1 1-2.83 2.83l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-4 0v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 1 1-2.83-2.83l.06-.06a1.65 1.65 0 0 0 .33-1.82 1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1 0-4h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 1 1 2.83-2.83l.06.06a1.65 1.65 0 0 0 1.82.33H9a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 4 0v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 1 1 2.83 2.83l-.06.06a1.65 1.65 0 0 0-.33 1.82V9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 0 4h-.09a1.65 1.65 0 0 0-1.51 1z" />
            </svg>
          </button>
        </div>
        <p style={{ margin: '7px 0 0 2px', fontSize: 13, color: COLORS.inkSoft }}>
          ランを選んでタスクを組み立て、計画と実測の
          <b style={{ color: COLORS.ink }}>ズレ（Δ）</b>を計測します。
        </p>
      </header>

      <button
        className="tl-btn"
        onClick={onNew}
        style={{
          width: '100%',
          padding: '15px',
          border: 'none',
          borderRadius: 12,
          background: COLORS.accent,
          color: '#fff',
          fontSize: 15,
          fontWeight: 600,
          cursor: 'pointer',
          marginBottom: 18,
          fontFamily: "'Space Grotesk',sans-serif",
        }}
      >
        ＋ 新しいランをつくる
      </button>

      {runs.length === 0 ? (
        <div
          style={{
            padding: '56px 20px',
            textAlign: 'center',
            color: COLORS.gray,
            border: `1px dashed ${COLORS.line}`,
            borderRadius: 14,
            background: COLORS.surface,
          }}
        >
          <div className="tl-disp" style={{ fontSize: 34, color: COLORS.line, marginBottom: 10 }}>
            Δ
          </div>
          <div style={{ fontSize: 13.5, lineHeight: 1.6 }}>
            まだランがありません。
            <br />
            「新しいランをつくる」から始めましょう。
          </div>
        </div>
      ) : (
        <div>
          <div
            className="tl-disp"
            style={{
              fontSize: 12,
              fontWeight: 600,
              letterSpacing: '0.06em',
              color: COLORS.inkSoft,
              margin: '0 2px 10px',
            }}
          >
            ラン一覧（{runs.length}）
          </div>
          {runs.map((r) => (
            <RunCard
              key={r.id}
              run={r}
              onOpen={onOpen}
              onDuplicate={onDuplicate}
              onDelete={onDelete}
            />
          ))}
        </div>
      )}
    </div>
  )
}

function RunCard({
  run,
  onOpen,
  onDuplicate,
  onDelete,
}: {
  run: Run
  onOpen: (id: string) => void
  onDuplicate: (id: string) => void
  onDelete: (id: string) => void
}) {
  const m = computeMetrics(run)
  const total = m.totalCount
  const done = m.measuredCount
  const delta = done ? m.delta : null
  const absDelta = done ? m.absSum : null

  return (
    <div
      className="tl-card"
      onClick={() => onOpen(run.id)}
      role="button"
      tabIndex={0}
      onKeyDown={(e) => (e.key === 'Enter' || e.key === ' ') && onOpen(run.id)}
      style={{
        background: COLORS.surface,
        border: `1px solid ${COLORS.line}`,
        borderRadius: 14,
        padding: '15px 16px',
        marginBottom: 11,
      }}
    >
      <div style={{ display: 'flex', alignItems: 'flex-start', gap: 10 }}>
        <div style={{ flex: 1, minWidth: 0 }}>
          <div
            className="tl-disp"
            style={{
              fontSize: 17,
              fontWeight: 600,
              color: COLORS.ink,
              overflow: 'hidden',
              textOverflow: 'ellipsis',
              whiteSpace: 'nowrap',
            }}
          >
            {run.name || '無題のラン'}
          </div>
          <div
            style={{
              fontSize: 13,
              color: run.description ? COLORS.inkSoft : COLORS.gray,
              marginTop: 4,
              lineHeight: 1.5,
              display: '-webkit-box',
              WebkitLineClamp: 2,
              WebkitBoxOrient: 'vertical',
              overflow: 'hidden',
            }}
          >
            {run.description || '説明なし'}
          </div>
        </div>
        <span className="tl-disp" style={{ fontSize: 22, color: COLORS.gray, lineHeight: 1 }}>
          ›
        </span>
      </div>

      <div
        style={{ display: 'flex', alignItems: 'center', gap: 10, marginTop: 12, flexWrap: 'wrap' }}
      >
        <span className="tl-mono" style={{ fontSize: 11, color: COLORS.gray }}>
          {mdate(run.createdAt)}
        </span>
        <span className="tl-mono" style={{ fontSize: 11, color: COLORS.inkSoft }}>
          {total} タスク
        </span>
        {total > 0 &&
          (done > 0 ? (
            <>
              <span style={{ color: COLORS.line }}>·</span>
              <span className="tl-mono" style={{ fontSize: 11, color: COLORS.inkSoft }}>
                {done}/{total} 計測
              </span>
              <span style={{ marginLeft: 'auto', display: 'flex', alignItems: 'center', gap: 8 }}>
                <DeltaPill delta={delta} />
                {absDelta != null && absDelta !== Math.abs(delta ?? 0) && (
                  <span
                    className="tl-mono"
                    style={{ fontSize: 11, fontWeight: 700, color: COLORS.inkSoft }}
                  >
                    ±{fmt(absDelta)}
                  </span>
                )}
              </span>
            </>
          ) : (
            <>
              <span style={{ color: COLORS.line }}>·</span>
              <span className="tl-mono" style={{ fontSize: 11, color: COLORS.gray }}>
                未計測
              </span>
            </>
          ))}
      </div>

      <div
        style={{
          display: 'flex',
          gap: 14,
          marginTop: 12,
          paddingTop: 11,
          borderTop: `1px solid ${COLORS.line}`,
        }}
      >
        <button
          className="tl-btn tl-ghost"
          onClick={(e) => {
            e.stopPropagation()
            onDuplicate(run.id)
          }}
          style={miniBtn}
        >
          複製
        </button>
        <button
          className="tl-btn tl-ghost"
          onClick={(e) => {
            e.stopPropagation()
            onDelete(run.id)
          }}
          style={{ ...miniBtn, color: COLORS.rose }}
        >
          削除
        </button>
      </div>
    </div>
  )
}

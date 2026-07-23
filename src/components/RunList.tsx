// ラン一覧画面（ホーム）（仕様書 §3.1）
import { COLORS } from '../constants'
import { computeMetrics, fmtSigned, fmtDuration } from '../metrics'
import type { Run } from '../types'

function fmtMD(epoch: number): string {
  const d = new Date(epoch)
  return `${d.getMonth() + 1}/${d.getDate()}`
}

function deltaColor(delta: number, measured: number): string {
  if (measured === 0) return COLORS.gray
  if (delta > 0) return COLORS.rose
  if (delta < 0) return COLORS.green
  return COLORS.gray
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
    <div style={{ maxWidth: 480, margin: '0 auto', padding: '0 16px 40px' }}>
      <header
        style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          padding: '18px 2px 14px',
        }}
      >
        <div
          style={{
            fontFamily: 'var(--font-display)',
            fontWeight: 700,
            fontSize: 22,
            letterSpacing: '-0.02em',
          }}
        >
          <span style={{ color: COLORS.accent }}>Δ</span> TaskLab
        </div>
        <button
          onClick={onOpenSettings}
          aria-label="設定"
          style={{
            width: 40,
            height: 40,
            borderRadius: 10,
            border: `1px solid ${COLORS.line}`,
            background: COLORS.surface,
            fontSize: 18,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
          }}
        >
          ⚙
        </button>
      </header>

      <button
        onClick={onNew}
        style={{
          width: '100%',
          background: COLORS.accent,
          color: '#fff',
          border: 'none',
          borderRadius: 14,
          padding: '14px',
          fontWeight: 700,
          fontSize: 15,
          marginBottom: 18,
          minHeight: 48,
        }}
      >
        ＋ 新しいランをつくる
      </button>

      {runs.length === 0 ? (
        <EmptyState />
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
          {runs.map((run) => (
            <RunCard
              key={run.id}
              run={run}
              onOpen={() => onOpen(run.id)}
              onDuplicate={() => onDuplicate(run.id)}
              onDelete={() => onDelete(run.id)}
            />
          ))}
        </div>
      )}
    </div>
  )
}

function EmptyState() {
  return (
    <div
      style={{
        textAlign: 'center',
        padding: '48px 20px',
        color: COLORS.inkSoft,
        border: `1px dashed ${COLORS.line}`,
        borderRadius: 16,
        background: COLORS.surface,
      }}
    >
      <div style={{ fontSize: 32, marginBottom: 12 }}>Δ</div>
      <div style={{ fontWeight: 700, color: COLORS.ink, marginBottom: 6 }}>
        まだランがありません
      </div>
      <div style={{ fontSize: 14, lineHeight: 1.7 }}>
        「＋ 新しいランをつくる」から
        <br />
        最初のタスク計測をはじめましょう。
      </div>
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
  onOpen: () => void
  onDuplicate: () => void
  onDelete: () => void
}) {
  const m = computeMetrics(run)
  const dColor = deltaColor(m.delta, m.measuredCount)
  // ばらつきは相殺が起きている場合のみ表示（|Δ合計| と Σ|Δ| が異なるとき）
  const showSpread = m.measuredCount > 0 && m.absSum !== Math.abs(m.delta)

  return (
    <div
      style={{
        background: COLORS.surface,
        border: `1px solid ${COLORS.line}`,
        borderRadius: 16,
        padding: 16,
      }}
    >
      <div role="button" tabIndex={0} onClick={onOpen} onKeyDown={(e) => e.key === 'Enter' && onOpen()} style={{ cursor: 'pointer' }}>
        <div
          style={{
            fontWeight: 700,
            fontSize: 16,
            whiteSpace: 'nowrap',
            overflow: 'hidden',
            textOverflow: 'ellipsis',
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
            minHeight: 18,
          }}
        >
          {run.description || '説明なし'}
        </div>

        <div
          style={{
            display: 'flex',
            gap: 12,
            flexWrap: 'wrap',
            fontSize: 12,
            color: COLORS.inkSoft,
            marginTop: 10,
          }}
        >
          <span>{fmtMD(run.createdAt)}</span>
          <span>タスク {m.totalCount}</span>
          <span>
            計測 {m.measuredCount}/{m.totalCount}
          </span>
        </div>

        <div
          style={{
            display: 'flex',
            alignItems: 'baseline',
            gap: 12,
            marginTop: 12,
            flexWrap: 'wrap',
          }}
        >
          <div style={{ display: 'flex', alignItems: 'baseline', gap: 6 }}>
            <span style={{ fontSize: 11, color: COLORS.inkSoft }}>Δ 合計</span>
            <span className="mono" style={{ fontSize: 18, fontWeight: 700, color: dColor }}>
              {m.measuredCount > 0 ? fmtSigned(m.delta) : '—'}
            </span>
          </div>
          {showSpread && (
            <div style={{ display: 'flex', alignItems: 'baseline', gap: 5 }}>
              <span style={{ fontSize: 11, color: COLORS.inkSoft }}>ばらつき</span>
              <span className="mono" style={{ fontSize: 13, color: COLORS.inkSoft }}>
                ±{fmtDuration(m.absSum)}
              </span>
            </div>
          )}
        </div>
      </div>

      <div
        style={{
          display: 'flex',
          gap: 8,
          marginTop: 14,
          paddingTop: 12,
          borderTop: `1px solid ${COLORS.line}`,
        }}
      >
        <button onClick={onDuplicate} style={cardActionStyle}>
          複製
        </button>
        <button onClick={onDelete} style={{ ...cardActionStyle, color: COLORS.rose }}>
          削除
        </button>
      </div>
    </div>
  )
}

const cardActionStyle: React.CSSProperties = {
  flex: 1,
  background: 'transparent',
  border: `1px solid ${COLORS.line}`,
  borderRadius: 9,
  padding: '8px',
  fontSize: 13,
  fontWeight: 600,
  color: COLORS.inkSoft,
  minHeight: 36,
}

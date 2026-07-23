// ラン詳細画面（仕様書 §3.2 / モック DetailScreen 準拠）
import { useMemo, useRef, useState } from 'react'
import { COLORS } from '../constants'
import { barMax, computeMetrics, fmt } from '../metrics'
import { buildPrompt } from '../prompt'
import { canShare, copyText, sharePrompt } from '../share'
import { randomId } from '../storage'
import type { Run, Task } from '../types'
import { ConfirmDialog, DeltaPill, Overlay } from './common'
import { TaskList } from './TaskRow'

function mdatetime(ts: number): string {
  const d = new Date(ts)
  const p = (n: number) => String(n).padStart(2, '0')
  return `${d.getMonth() + 1}/${d.getDate()} ${p(d.getHours())}:${p(d.getMinutes())}`
}

function parseEstimate(v: string): number {
  if (v === '') return 0
  return Math.max(0, parseInt(v, 10) || 0)
}
function parseActual(v: string): number | null {
  if (v === '') return null
  return Math.max(0, parseInt(v, 10) || 0)
}

function stripHist(r: Run): string {
  const { history, ...rest } = r
  void history
  return JSON.stringify(rest)
}

export function RunDetail({
  savedRun,
  promptTemplate,
  onSave,
  onDuplicate,
  onDelete,
  onBack,
}: {
  savedRun: Run
  promptTemplate: string
  onSave: (updated: Run) => void
  onDuplicate: () => void
  onDelete: () => void
  onBack: () => void
}) {
  const [draft, setDraft] = useState<Run>(savedRun)
  const [saved, setSaved] = useState<Run>(savedRun)
  const [copied, setCopied] = useState(false)
  const [saveOpen, setSaveOpen] = useState(false)
  const [comment, setComment] = useState('')
  const [showHistory, setShowHistory] = useState(false)
  const [confirmBack, setConfirmBack] = useState(false)
  const [confirmDelete, setConfirmDelete] = useState(false)

  const up = (fn: (r: Run) => Run) => setDraft((d) => fn(d))
  const ops = {
    rename: (v: string) => up((r) => ({ ...r, name: v })),
    renameBlur: () => up((r) => (r.name.trim() ? r : { ...r, name: '無題のラン' })),
    describe: (v: string) => up((r) => ({ ...r, description: v })),
    addTask: (name: string, est: number) =>
      up((r) => ({ ...r, tasks: [...r.tasks, { id: randomId(), name, estimateMin: est, actualMin: null }] })),
    setName: (id: string, v: string) =>
      up((r) => ({ ...r, tasks: r.tasks.map((x) => (x.id === id ? { ...x, name: v } : x)) })),
    setEstimate: (id: string, v: string) =>
      up((r) => ({ ...r, tasks: r.tasks.map((x) => (x.id === id ? { ...x, estimateMin: parseEstimate(v) } : x)) })),
    setActual: (id: string, v: string) =>
      up((r) => ({ ...r, tasks: r.tasks.map((x) => (x.id === id ? { ...x, actualMin: parseActual(v) } : x)) })),
    removeTask: (id: string) => up((r) => ({ ...r, tasks: r.tasks.filter((x) => x.id !== id) })),
    reorder: (next: Task[]) => up((r) => ({ ...r, tasks: next })),
  }

  const dirty = stripHist(draft) !== stripHist(saved)

  const doSave = () => {
    if (!comment.trim()) return
    const entry = { at: Date.now(), comment: comment.trim() }
    const final: Run = { ...draft, history: [entry, ...draft.history] }
    onSave(final)
    setSaved(final)
    setDraft(final)
    setComment('')
    setSaveOpen(false)
  }

  const tasks = draft.tasks
  const m = useMemo(() => computeMetrics(draft), [draft])
  const maxMin = Math.max(1, barMax(draft))
  const history = draft.history

  return (
    <div className="tl-view">
      {/* ナビ */}
      <div
        style={{
          position: 'sticky',
          top: 0,
          zIndex: 5,
          background: COLORS.paper,
          display: 'flex',
          alignItems: 'center',
          gap: 8,
          padding: '6px 0 12px',
          marginBottom: 4,
        }}
      >
        <button
          className="tl-btn tl-ghost"
          onClick={() => (dirty ? setConfirmBack(true) : onBack())}
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: 4,
            border: 'none',
            background: 'transparent',
            color: COLORS.accent,
            fontSize: 15,
            fontWeight: 600,
            cursor: 'pointer',
            padding: '6px 8px 6px 0',
          }}
        >
          ‹ 一覧
        </button>
        {dirty && (
          <span className="tl-mono" style={{ fontSize: 10.5, color: COLORS.rose, fontWeight: 700 }}>
            ●
          </span>
        )}
        <div style={{ marginLeft: 'auto', display: 'flex', gap: 6 }}>
          <button
            className="tl-btn"
            onClick={() => setSaveOpen(true)}
            disabled={!dirty}
            style={{
              padding: '7px 16px',
              border: 'none',
              borderRadius: 8,
              background: dirty ? COLORS.accent : COLORS.line,
              color: '#fff',
              fontSize: 13,
              fontWeight: 600,
              cursor: 'pointer',
            }}
          >
            保存
          </button>
          <button
            className="tl-btn tl-ghost"
            onClick={onDuplicate}
            style={{
              padding: '7px 12px',
              border: `1px solid ${COLORS.line}`,
              borderRadius: 8,
              background: '#fff',
              color: COLORS.inkSoft,
              fontSize: 13,
              cursor: 'pointer',
            }}
          >
            複製
          </button>
          <button
            className="tl-btn tl-ghost"
            onClick={() => setConfirmDelete(true)}
            style={{
              padding: '7px 12px',
              border: `1px solid ${COLORS.line}`,
              borderRadius: 8,
              background: '#fff',
              color: COLORS.rose,
              fontSize: 13,
              cursor: 'pointer',
            }}
          >
            削除
          </button>
        </div>
      </div>

      {/* 名前 + 説明 */}
      <div style={{ marginBottom: 16 }}>
        <input
          value={draft.name}
          onChange={(e) => ops.rename(e.target.value)}
          onBlur={ops.renameBlur}
          className="tl-input"
          placeholder="ラン名"
          aria-label="ラン名"
          style={{
            width: '100%',
            boxSizing: 'border-box',
            padding: '6px 2px',
            border: 'none',
            borderBottom: `2px solid ${COLORS.line}`,
            fontSize: 22,
            fontWeight: 600,
            background: 'transparent',
            color: COLORS.ink,
            fontFamily: "'Space Grotesk',sans-serif",
            marginBottom: 10,
          }}
        />
        <textarea
          value={draft.description}
          onChange={(e) => ops.describe(e.target.value)}
          rows={2}
          className="tl-input"
          placeholder="このランの説明（目的・状況などをメモ）"
          aria-label="説明"
          style={{
            width: '100%',
            boxSizing: 'border-box',
            padding: '10px 12px',
            border: `1px solid ${COLORS.line}`,
            borderRadius: 9,
            fontSize: 13.5,
            background: COLORS.surface,
            color: COLORS.ink,
            lineHeight: 1.5,
          }}
        />
      </div>

      {/* タスク */}
      <div
        style={{
          background: COLORS.surface,
          border: `1px solid ${COLORS.line}`,
          borderRadius: 12,
          overflow: 'hidden',
          marginBottom: 14,
        }}
      >
        <div
          style={{
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            padding: '11px 14px',
            borderBottom: `1px solid ${COLORS.line}`,
          }}
        >
          <span
            className="tl-disp"
            style={{ fontSize: 12.5, fontWeight: 600, letterSpacing: '0.04em', color: COLORS.inkSoft }}
          >
            タスク {tasks.length ? `（${tasks.length}）` : ''}
            {tasks.length > 1 && (
              <span
                style={{
                  fontFamily: "'Inter',sans-serif",
                  fontWeight: 400,
                  fontSize: 11,
                  color: COLORS.gray,
                  marginLeft: 6,
                }}
              >
                · 長押しで並べ替え
              </span>
            )}
          </span>
          <span className="tl-mono" style={{ fontSize: 10, color: COLORS.gray }}>
            計画<span style={{ color: COLORS.plan }}> ■</span>　実測
            <span style={{ color: COLORS.actual }}> ■</span>
          </span>
        </div>
        {tasks.length > 0 && (
          <TaskList
            tasks={tasks}
            maxMin={maxMin}
            onName={ops.setName}
            onEstimate={ops.setEstimate}
            onActual={ops.setActual}
            onRemove={ops.removeTask}
            onReorder={ops.reorder}
          />
        )}
        <NewTaskRow nextIndex={tasks.length + 1} onAdd={ops.addTask} />
      </div>

      {/* 集計 */}
      {tasks.length > 0 && (
        <div
          style={{
            display: 'grid',
            gridTemplateColumns: '1fr 1fr',
            gap: 1,
            background: COLORS.line,
            border: `1px solid ${COLORS.line}`,
            borderRadius: 12,
            overflow: 'hidden',
            marginBottom: 14,
          }}
        >
          <Cell label="計画 合計" value={fmt(m.planTotal)} color={COLORS.plan} />
          <Cell
            label={`実測 合計${m.measuredCount < tasks.length ? ` (${m.measuredCount}/${tasks.length})` : ''}`}
            value={m.measuredCount ? fmt(m.actualTotal) : '—'}
            color={COLORS.actual}
          />
          <div
            style={{
              gridColumn: '1 / -1',
              background: COLORS.surface,
              padding: '14px 16px',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
            }}
          >
            <div>
              <div
                className="tl-mono"
                style={{ fontSize: 10, color: COLORS.inkSoft, letterSpacing: '0.06em', marginBottom: 3 }}
              >
                差分 Δ（実測 − 計画）
              </div>
              {m.measuredCount > 0 && m.planTotalMeasured > 0 && m.deltaPct != null && (
                <div className="tl-mono" style={{ fontSize: 11, color: COLORS.inkSoft }}>
                  {m.delta > 0 ? '超過' : m.delta < 0 ? '短縮' : 'ぴったり'} ・ 計画比{' '}
                  {Math.round(m.deltaPct)}%
                </div>
              )}
            </div>
            <DeltaPill delta={m.measuredCount ? m.delta : null} big />
          </div>
          {m.measuredCount > 0 && (
            <div
              style={{
                gridColumn: '1 / -1',
                background: COLORS.surface,
                padding: '14px 16px',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
              }}
            >
              <div>
                <div
                  className="tl-mono"
                  style={{ fontSize: 10, color: COLORS.inkSoft, letterSpacing: '0.06em', marginBottom: 3 }}
                >
                  ばらつき（|Δ| 合計）
                </div>
                <div className="tl-mono" style={{ fontSize: 11, color: COLORS.inkSoft }}>
                  平均 {fmt(m.avgAbs)}/タスク
                  {m.absPct != null ? ` ・ 計画比 ${Math.round(m.absPct)}%` : ''}
                </div>
              </div>
              <span
                className="tl-disp"
                style={{
                  fontSize: 30,
                  fontWeight: 700,
                  lineHeight: 1,
                  color:
                    m.absSum === 0
                      ? COLORS.green
                      : m.absPct != null && m.absPct > 25
                        ? COLORS.rose
                        : COLORS.ink,
                }}
              >
                ±{fmt(m.absSum)}
              </span>
            </div>
          )}
          {m.hasCancellation && (
            <div style={{ gridColumn: '1 / -1', background: COLORS.surface, padding: '9px 16px 12px' }}>
              <span style={{ fontSize: 11.5, color: COLORS.gray, lineHeight: 1.5 }}>
                ※ Δ合計は0ですが、各タスクのズレは打ち消し合っています。ばらつきを見てください。
              </span>
            </div>
          )}
        </div>
      )}

      {/* AI 考察ハンドオフ */}
      {tasks.length > 0 && (
        <div
          style={{
            background: COLORS.surface,
            border: `1px solid ${COLORS.line}`,
            borderRadius: 12,
            padding: 16,
            marginBottom: 14,
          }}
        >
          <div
            className="tl-disp"
            style={{ fontSize: 12.5, fontWeight: 600, letterSpacing: '0.04em', color: COLORS.accent, marginBottom: 6 }}
          >
            AIからの考察
          </div>
          <p style={{ fontSize: 12.5, color: COLORS.inkSoft, margin: '0 0 12px', lineHeight: 1.6 }}>
            このランのデータ入りプロンプトをAIアプリに渡し、ズレの考察と組み直しのヒントをもらいます。
          </p>
          <div style={{ display: 'flex', gap: 8 }}>
            {canShare() && (
              <button
                className="tl-btn"
                onClick={() => sharePrompt(`${draft.name} の分析`, buildPrompt(draft, promptTemplate))}
                style={{
                  flex: 1,
                  padding: '10px 12px',
                  minHeight: 42,
                  border: 'none',
                  borderRadius: 9,
                  background: COLORS.ink,
                  color: '#fff',
                  fontSize: 13.5,
                  fontWeight: 600,
                  cursor: 'pointer',
                  whiteSpace: 'nowrap',
                }}
              >
                プロンプトを共有
              </button>
            )}
            <button
              className="tl-btn"
              onClick={async () => {
                const ok = await copyText(buildPrompt(draft, promptTemplate))
                if (ok) {
                  setCopied(true)
                  setTimeout(() => setCopied(false), 1800)
                }
              }}
              style={{
                flex: 1,
                padding: '10px 12px',
                minHeight: 42,
                borderRadius: 9,
                cursor: 'pointer',
                fontSize: 13.5,
                fontWeight: 600,
                whiteSpace: 'nowrap',
                border: canShare() ? `1px solid ${COLORS.line}` : 'none',
                background: canShare() ? '#fff' : COLORS.ink,
                color: canShare() ? COLORS.ink : '#fff',
              }}
            >
              {copied ? '✓ コピーしました' : 'プロンプトをコピー'}
            </button>
          </div>
          {m.measuredCount === 0 && (
            <p style={{ fontSize: 11.5, color: COLORS.gray, margin: '10px 0 0' }}>
              ※ 実測が未入力でも考察できます（粒度チェックが中心になります）。
            </p>
          )}
          <p style={{ fontSize: 11.5, color: COLORS.gray, margin: '8px 0 0' }}>
            プロンプトの内容は一覧画面の「設定」から編集できます。
          </p>
        </div>
      )}

      {/* 変更履歴 */}
      {history.length > 0 && (
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
            onClick={() => setShowHistory((v) => !v)}
            style={{
              width: '100%',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              padding: '13px 16px',
              border: 'none',
              background: 'transparent',
              cursor: 'pointer',
            }}
          >
            <span
              className="tl-disp"
              style={{ fontSize: 12.5, fontWeight: 600, letterSpacing: '0.04em', color: COLORS.inkSoft }}
            >
              変更履歴（{history.length}）
            </span>
            <span style={{ color: COLORS.gray, fontSize: 11 }}>{showHistory ? '▲' : '▼'}</span>
          </button>
          {showHistory && (
            <div style={{ borderTop: `1px solid ${COLORS.line}` }}>
              {history.map((h, i) => (
                <div
                  key={i}
                  style={{
                    display: 'flex',
                    gap: 10,
                    padding: '11px 16px',
                    borderBottom: i < history.length - 1 ? `1px solid ${COLORS.line}` : 'none',
                  }}
                >
                  <span
                    className="tl-mono"
                    style={{ fontSize: 10.5, color: COLORS.gray, flexShrink: 0, marginTop: 1, width: 74 }}
                  >
                    {mdatetime(h.at)}
                  </span>
                  <span style={{ fontSize: 13, color: COLORS.ink, lineHeight: 1.5, whiteSpace: 'pre-wrap' }}>
                    {h.comment}
                  </span>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* 保存モーダル */}
      {saveOpen && (
        <Overlay onBackdrop={() => setSaveOpen(false)}>
          <div
            style={{
              background: COLORS.surface,
              borderRadius: 16,
              boxShadow: '0 20px 50px rgba(30,38,44,.3)',
              padding: 18,
            }}
          >
            <div className="tl-disp" style={{ fontSize: 16, fontWeight: 600, color: COLORS.ink, marginBottom: 4 }}>
              変更を保存
            </div>
            <p style={{ fontSize: 12.5, color: COLORS.inkSoft, margin: '0 0 12px', lineHeight: 1.5 }}>
              なぜ変更したのか、理由を記録します。
            </p>
            <textarea
              value={comment}
              onChange={(e) => setComment(e.target.value)}
              rows={3}
              autoFocus
              className="tl-input"
              placeholder="例：見積もりが甘かったタスクを分割した"
              style={{
                width: '100%',
                boxSizing: 'border-box',
                padding: '11px 12px',
                border: `1px solid ${COLORS.line}`,
                borderRadius: 10,
                fontSize: 14,
                background: '#fff',
                color: COLORS.ink,
                lineHeight: 1.5,
                marginBottom: 12,
              }}
            />
            <div style={{ display: 'flex', gap: 8 }}>
              <button
                className="tl-btn"
                onClick={doSave}
                disabled={!comment.trim()}
                style={{
                  flex: 1,
                  padding: '13px',
                  border: 'none',
                  borderRadius: 10,
                  background: COLORS.accent,
                  color: '#fff',
                  fontSize: 14.5,
                  fontWeight: 600,
                  cursor: 'pointer',
                }}
              >
                この理由で保存
              </button>
              <button
                className="tl-btn tl-ghost"
                onClick={() => setSaveOpen(false)}
                style={{
                  padding: '13px 18px',
                  border: `1px solid ${COLORS.line}`,
                  borderRadius: 10,
                  background: '#fff',
                  color: COLORS.inkSoft,
                  fontSize: 14,
                  cursor: 'pointer',
                }}
              >
                キャンセル
              </button>
            </div>
          </div>
        </Overlay>
      )}

      {confirmBack && (
        <ConfirmDialog
          title="変更を破棄しますか？"
          message="保存していない変更は失われます。"
          confirmLabel="破棄して戻る"
          danger
          onConfirm={() => {
            setConfirmBack(false)
            onBack()
          }}
          onCancel={() => setConfirmBack(false)}
        />
      )}
      {confirmDelete && (
        <ConfirmDialog
          title={`「${draft.name}」を削除しますか？`}
          message="この操作は取り消せません。"
          confirmLabel="削除する"
          danger
          onConfirm={() => {
            setConfirmDelete(false)
            onDelete()
          }}
          onCancel={() => setConfirmDelete(false)}
        />
      )}
    </div>
  )
}

// --- 新規タスク行（常設）---
function NewTaskRow({ nextIndex, onAdd }: { nextIndex: number; onAdd: (name: string, est: number) => void }) {
  const [name, setName] = useState('')
  const [est, setEst] = useState('')
  const nameRef = useRef<HTMLInputElement>(null)

  const ready = name.trim() !== '' && parseInt(est, 10) > 0
  const submit = () => {
    const n = name.trim()
    const e = parseInt(est, 10)
    if (!n || !e || e <= 0) return
    onAdd(n, e)
    setName('')
    setEst('')
    nameRef.current?.focus()
  }

  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '10px 12px', background: `${COLORS.plan}06` }}>
      <span className="tl-mono" style={{ fontSize: 10.5, color: COLORS.gray, flexShrink: 0 }}>
        {String(nextIndex).padStart(2, '0')}
      </span>
      <input
        ref={nameRef}
        value={name}
        onChange={(e) => setName(e.target.value)}
        onKeyDown={(e) => e.key === 'Enter' && submit()}
        placeholder="新しいタスク…"
        aria-label="新しいタスク名"
        className="tl-input"
        style={{
          flex: 1,
          minWidth: 0,
          padding: '9px 10px',
          border: `1px solid ${COLORS.line}`,
          borderRadius: 8,
          fontSize: 14,
          background: '#fff',
          color: COLORS.ink,
        }}
      />
      <input
        className="tl-input tl-mono"
        type="number"
        min="1"
        inputMode="numeric"
        value={est}
        onChange={(e) => setEst(e.target.value)}
        onKeyDown={(e) => e.key === 'Enter' && submit()}
        placeholder="30"
        aria-label="見積もり（分）"
        style={{
          width: 56,
          padding: '9px 6px',
          textAlign: 'right',
          border: `1px solid ${COLORS.line}`,
          borderRadius: 8,
          fontSize: 14,
          background: '#fff',
          color: COLORS.plan,
          flexShrink: 0,
        }}
      />
      <span style={{ fontSize: 10.5, color: COLORS.inkSoft, flexShrink: 0 }}>分</span>
      <button
        className="tl-btn"
        onClick={submit}
        disabled={!ready}
        aria-label="タスクを追加"
        style={{
          width: 36,
          height: 36,
          border: 'none',
          borderRadius: 9,
          flexShrink: 0,
          background: ready ? COLORS.accent : COLORS.line,
          color: '#fff',
          fontSize: 19,
          fontWeight: 600,
          cursor: 'pointer',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          padding: 0,
          lineHeight: 1,
        }}
      >
        ＋
      </button>
    </div>
  )
}

// --- 集計セル ---
function Cell({ label, value, color }: { label: string; value: string; color: string }) {
  return (
    <div style={{ background: COLORS.surface, padding: '13px 12px' }}>
      <div className="tl-mono" style={{ fontSize: 10, color: COLORS.inkSoft, letterSpacing: '0.05em', marginBottom: 4 }}>
        {label}
      </div>
      <div className="tl-disp" style={{ fontSize: 20, fontWeight: 700, lineHeight: 1, color }}>
        {value}
      </div>
    </div>
  )
}

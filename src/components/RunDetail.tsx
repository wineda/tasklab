// ラン詳細画面（仕様書 §3.2）
import { useEffect, useMemo, useRef, useState } from 'react'
import { COLORS } from '../constants'
import { barMax, computeMetrics, fmtDuration, fmtSigned, fmtPct } from '../metrics'
import { buildPrompt } from '../prompt'
import { canShare, copyText, sharePrompt } from '../share'
import { randomId } from '../storage'
import { useLongPressDrag } from '../useLongPressDrag'
import type { Run, Task } from '../types'
import { ConfirmDialog, Overlay, btnGhost } from './common'
import { TaskRow } from './TaskRow'

// 履歴を除いた比較用スナップショット（dirty 判定）
function editableSnapshot(run: Run): string {
  return JSON.stringify({ name: run.name, description: run.description, tasks: run.tasks })
}

function parseIntClamp(v: string, min: number): number | null {
  const digits = v.replace(/[^0-9]/g, '')
  if (digits === '') return null
  const n = parseInt(digits, 10)
  if (Number.isNaN(n)) return null
  return Math.max(min, n)
}

const usePrefersReducedMotion = () => {
  const [reduced, setReduced] = useState(
    () => window.matchMedia?.('(prefers-reduced-motion: reduce)').matches ?? false,
  )
  useEffect(() => {
    const mq = window.matchMedia('(prefers-reduced-motion: reduce)')
    const h = () => setReduced(mq.matches)
    mq.addEventListener('change', h)
    return () => mq.removeEventListener('change', h)
  }, [])
  return reduced
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
  onSave: (updated: Run, comment: string) => void
  onDuplicate: () => void
  onDelete: () => void
  onBack: () => void
}) {
  const [draft, setDraft] = useState<Run>(savedRun)
  const reducedMotion = usePrefersReducedMotion()

  // 親が savedRun を差し替えたら（保存・複製後など）下書きをリセット
  useEffect(() => {
    setDraft(savedRun)
  }, [savedRun])

  const dirty = editableSnapshot(draft) !== editableSnapshot(savedRun)

  const [showSaveModal, setShowSaveModal] = useState(false)
  const [confirmBack, setConfirmBack] = useState(false)
  const [confirmDelete, setConfirmDelete] = useState(false)

  const metrics = useMemo(() => computeMetrics(draft), [draft])
  const barMaxValue = useMemo(() => barMax(draft), [draft])

  // --- 下書きミューテーション ---
  const patch = (p: Partial<Run>) => setDraft((d) => ({ ...d, ...p }))
  const patchTask = (id: string, p: Partial<Task>) =>
    setDraft((d) => ({ ...d, tasks: d.tasks.map((t) => (t.id === id ? { ...t, ...p } : t)) }))
  const deleteTask = (id: string) =>
    setDraft((d) => ({ ...d, tasks: d.tasks.filter((t) => t.id !== id) }))
  const moveTask = (from: number, to: number) =>
    setDraft((d) => {
      const tasks = d.tasks.slice()
      const [m] = tasks.splice(from, 1)
      tasks.splice(to, 0, m)
      return { ...d, tasks }
    })

  const drag = useLongPressDrag({ itemCount: draft.tasks.length, onMove: moveTask })

  const handleBack = () => {
    if (dirty) setConfirmBack(true)
    else onBack()
  }

  const handleSaveConfirm = (comment: string) => {
    const entry = { at: Date.now(), comment }
    onSave({ ...draft, history: [entry, ...draft.history] }, comment)
    setShowSaveModal(false)
  }

  return (
    <div style={{ maxWidth: 480, margin: '0 auto', padding: '0 16px 60px' }}>
      {/* スクロール追従ナビ */}
      <nav
        style={{
          position: 'sticky',
          top: 0,
          zIndex: 20,
          background: COLORS.paper,
          display: 'flex',
          alignItems: 'center',
          gap: 8,
          padding: '12px 0',
          borderBottom: `1px solid ${COLORS.line}`,
        }}
      >
        <button onClick={handleBack} style={{ ...navBtn, paddingLeft: 4 }}>
          ‹ 一覧
        </button>
        {dirty && (
          <span
            title="未保存の変更があります"
            style={{ color: COLORS.accent, fontSize: 18, lineHeight: 1 }}
          >
            ●
          </span>
        )}
        <div style={{ flex: 1 }} />
        <button
          onClick={() => setShowSaveModal(true)}
          disabled={!dirty}
          style={{
            ...navBtn,
            fontWeight: 700,
            color: dirty ? '#fff' : COLORS.gray,
            background: dirty ? COLORS.accent : COLORS.line,
            padding: '8px 14px',
          }}
        >
          保存
        </button>
        <button onClick={onDuplicate} style={navBtn}>
          複製
        </button>
        <button onClick={() => setConfirmDelete(true)} style={{ ...navBtn, color: COLORS.rose }}>
          削除
        </button>
      </nav>

      {/* ラン名 / 説明 */}
      <input
        value={draft.name}
        onChange={(e) => patch({ name: e.target.value })}
        placeholder="無題のラン"
        aria-label="ラン名"
        style={{
          width: '100%',
          border: 'none',
          borderBottom: `2px solid ${COLORS.line}`,
          background: 'transparent',
          fontFamily: 'var(--font-display)',
          fontSize: 24,
          fontWeight: 700,
          padding: '18px 0 8px',
          color: COLORS.ink,
        }}
      />
      <textarea
        value={draft.description}
        onChange={(e) => patch({ description: e.target.value })}
        placeholder="説明（任意）"
        aria-label="説明"
        rows={2}
        style={{
          width: '100%',
          border: 'none',
          background: 'transparent',
          resize: 'vertical',
          fontSize: 14,
          color: COLORS.inkSoft,
          padding: '10px 0',
          lineHeight: 1.6,
        }}
      />

      {/* タスクリスト */}
      <div
        style={{
          background: COLORS.surface,
          border: `1px solid ${COLORS.line}`,
          borderRadius: 16,
          padding: 14,
          marginTop: 6,
        }}
      >
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            marginBottom: 8,
            gap: 8,
            flexWrap: 'wrap',
          }}
        >
          <span style={{ fontWeight: 700, fontSize: 13 }}>タスク {draft.tasks.length}</span>
          {draft.tasks.length >= 2 && (
            <span style={{ fontSize: 11, color: COLORS.gray }}>⠿ 長押しで並べ替え</span>
          )}
          <div style={{ display: 'flex', gap: 10, fontSize: 11, color: COLORS.inkSoft }}>
            <Legend color={COLORS.plan} label="計画" />
            <Legend color={COLORS.actual} label="実測" />
          </div>
        </div>

        <div ref={drag.containerRef}>
          {draft.tasks.map((t, i) => (
            <TaskRow
              key={t.id}
              index={i}
              task={t}
              barMaxValue={barMaxValue}
              canReorder={draft.tasks.length >= 2}
              isDragging={drag.draggingIndex === i}
              isPending={drag.pendingIndex === i}
              reducedMotion={reducedMotion}
              onPointerDown={drag.onRowPointerDown(i)}
              onName={(v) => patchTask(t.id, { name: v })}
              onEstimate={(v) => patchTask(t.id, { estimateMin: parseIntClamp(v, 0) ?? 0 })}
              onActual={(v) => patchTask(t.id, { actualMin: parseIntClamp(v, 0) })}
              onDelete={() => deleteTask(t.id)}
            />
          ))}

          <NewTaskRow nextIndex={draft.tasks.length} onAdd={(task) => patch({ tasks: [...draft.tasks, task] })} />
        </div>
      </div>

      {draft.tasks.length > 0 && (
        <>
          <SummaryCard metrics={metrics} />
          <AiCard run={draft} promptTemplate={promptTemplate} measuredCount={metrics.measuredCount} />
        </>
      )}

      {draft.history.length > 0 && <HistoryCard history={draft.history} />}

      {/* --- モーダル / ダイアログ --- */}
      {showSaveModal && (
        <SaveModal onConfirm={handleSaveConfirm} onCancel={() => setShowSaveModal(false)} />
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
          title="このランを削除しますか？"
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

function Legend({ color, label }: { color: string; label: string }) {
  return (
    <span style={{ display: 'inline-flex', alignItems: 'center', gap: 4 }}>
      <span style={{ width: 10, height: 4, borderRadius: 2, background: color }} />
      {label}
    </span>
  )
}

// --- 新規タスク行（常設） ---
function NewTaskRow({ nextIndex, onAdd }: { nextIndex: number; onAdd: (t: Task) => void }) {
  const [name, setName] = useState('')
  const [estimate, setEstimate] = useState('')
  const nameRef = useRef<HTMLInputElement>(null)

  const est = parseIntClamp(estimate, 1)
  const canAdd = name.trim() !== '' && est !== null && est >= 1

  const add = () => {
    if (!canAdd || est === null) return
    onAdd({ id: randomId(), name: name.trim(), estimateMin: est, actualMin: null })
    setName('')
    setEstimate('')
    nameRef.current?.focus()
  }

  return (
    <div
      style={{
        display: 'flex',
        alignItems: 'center',
        gap: 8,
        marginTop: nextIndex === 0 ? 0 : 10,
        paddingTop: nextIndex === 0 ? 0 : 10,
        borderTop: nextIndex === 0 ? 'none' : `1px dashed ${COLORS.line}`,
      }}
    >
      <span
        className="mono"
        style={{ fontSize: 12, color: COLORS.gray, width: 18, textAlign: 'right', flexShrink: 0 }}
      >
        {nextIndex + 1}
      </span>
      <input
        ref={nameRef}
        value={name}
        onChange={(e) => setName(e.target.value)}
        onKeyDown={(e) => e.key === 'Enter' && add()}
        placeholder="新しいタスク"
        aria-label="新しいタスク名"
        style={{
          flex: 1,
          minWidth: 0,
          border: `1px solid ${COLORS.line}`,
          borderRadius: 8,
          background: COLORS.surface,
          fontSize: 14,
          padding: '8px 10px',
          minHeight: 36,
        }}
      />
      <input
        value={estimate}
        onChange={(e) => setEstimate(e.target.value)}
        onKeyDown={(e) => e.key === 'Enter' && add()}
        inputMode="numeric"
        placeholder="見積"
        aria-label="見積もり（分）"
        style={{
          width: 52,
          flexShrink: 0,
          textAlign: 'right',
          border: `1px solid ${COLORS.line}`,
          borderRadius: 8,
          background: COLORS.surface,
          fontSize: 13,
          fontFamily: 'var(--font-mono)',
          padding: '8px 6px',
          minHeight: 36,
        }}
      />
      <button
        onClick={add}
        disabled={!canAdd}
        aria-label="タスクを追加"
        style={{
          width: 36,
          height: 36,
          borderRadius: 9,
          border: 'none',
          flexShrink: 0,
          fontSize: 20,
          fontWeight: 700,
          color: '#fff',
          background: canAdd ? COLORS.accent : COLORS.line,
        }}
      >
        ＋
      </button>
    </div>
  )
}

// --- 集計カード ---
function SummaryCard({ metrics }: { metrics: ReturnType<typeof computeMetrics> }) {
  const {
    planTotal,
    actualTotal,
    measuredCount,
    delta,
    absSum,
    avgAbs,
    deltaPct,
    absPct,
    hasCancellation,
  } = metrics
  const dColor = measuredCount === 0 ? COLORS.gray : delta > 0 ? COLORS.rose : delta < 0 ? COLORS.green : COLORS.gray
  const deltaWord = measuredCount === 0 ? '未計測' : delta > 0 ? '超過' : delta < 0 ? '短縮' : 'ぴったり'
  const spreadWarn = absPct !== null && absPct > 25
  const spreadColor = absSum === 0 ? COLORS.green : spreadWarn ? COLORS.warn : COLORS.ink

  return (
    <div style={cardStyle}>
      <div style={{ display: 'flex', gap: 12 }}>
        <Stat label="計画 合計" value={fmtDuration(planTotal)} />
        <Stat
          label="実測 合計"
          value={measuredCount > 0 ? fmtDuration(actualTotal) : '—'}
          sub={`計測 ${measuredCount}`}
        />
      </div>

      <div
        style={{
          marginTop: 14,
          paddingTop: 14,
          borderTop: `1px solid ${COLORS.line}`,
          display: 'flex',
          alignItems: 'baseline',
          justifyContent: 'space-between',
          gap: 10,
        }}
      >
        <div>
          <div style={{ fontSize: 11, color: COLORS.inkSoft }}>差分 Δ</div>
          <div style={{ fontSize: 12, color: dColor, fontWeight: 700 }}>{deltaWord}</div>
        </div>
        <div style={{ textAlign: 'right' }}>
          <span className="mono" style={{ fontSize: 26, fontWeight: 700, color: dColor }}>
            {measuredCount > 0 ? fmtSigned(delta) : '—'}
          </span>
          {deltaPct !== null && (
            <span style={{ fontSize: 12, color: COLORS.inkSoft, marginLeft: 8 }}>
              計画比 {fmtPct(deltaPct)}
            </span>
          )}
        </div>
      </div>

      <div
        style={{
          marginTop: 12,
          display: 'flex',
          alignItems: 'baseline',
          justifyContent: 'space-between',
          gap: 10,
        }}
      >
        <div style={{ fontSize: 11, color: COLORS.inkSoft }}>
          ばらつき
          {measuredCount > 0 && (
            <span style={{ marginLeft: 6, color: COLORS.gray }}>
              平均 ±{fmtDuration(avgAbs)}/タスク
            </span>
          )}
        </div>
        <div style={{ textAlign: 'right' }}>
          <span className="mono" style={{ fontSize: 16, fontWeight: 700, color: spreadColor }}>
            ±{fmtDuration(absSum)}
          </span>
          {absPct !== null && (
            <span
              style={{
                fontSize: 12,
                marginLeft: 8,
                color: spreadWarn ? COLORS.warn : COLORS.inkSoft,
              }}
            >
              計画比 {fmtPct(absPct)}
            </span>
          )}
        </div>
      </div>

      {hasCancellation && (
        <div
          style={{
            marginTop: 12,
            fontSize: 12,
            color: COLORS.inkSoft,
            background: COLORS.accentSoft,
            borderRadius: 10,
            padding: '10px 12px',
            lineHeight: 1.6,
          }}
        >
          Δ 合計は 0 ですが、各タスクではズレが生じています（超過と短縮が
          <strong>相殺</strong>されています）。ばらつき ±{fmtDuration(absSum)} に注目してください。
        </div>
      )}
    </div>
  )
}

function Stat({ label, value, sub }: { label: string; value: string; sub?: string }) {
  return (
    <div style={{ flex: 1 }}>
      <div style={{ fontSize: 11, color: COLORS.inkSoft }}>{label}</div>
      <div className="mono" style={{ fontSize: 20, fontWeight: 700, marginTop: 2 }}>
        {value}
      </div>
      {sub && <div style={{ fontSize: 11, color: COLORS.gray, marginTop: 2 }}>{sub}</div>}
    </div>
  )
}

// --- AI からの考察カード ---
function AiCard({
  run,
  promptTemplate,
  measuredCount,
}: {
  run: Run
  promptTemplate: string
  measuredCount: number
}) {
  const [copied, setCopied] = useState(false)
  const shareable = canShare()

  const doShare = async () => {
    await sharePrompt('TaskLab の考察依頼', buildPrompt(run, promptTemplate))
  }
  const doCopy = async () => {
    const ok = await copyText(buildPrompt(run, promptTemplate))
    if (ok) {
      setCopied(true)
      setTimeout(() => setCopied(false), 1800)
    }
  }

  return (
    <div style={cardStyle}>
      <div style={{ fontWeight: 700, fontSize: 14, marginBottom: 4 }}>AI からの考察</div>
      <div style={{ fontSize: 12, color: COLORS.inkSoft, lineHeight: 1.6, marginBottom: 12 }}>
        プロンプトを生成し、共有シートやコピーで外部 AI アプリ（Claude 等）に渡します。
      </div>

      <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
        {shareable && (
          <button onClick={doShare} style={{ ...btnPrimary, flex: 1 }}>
            プロンプトを共有
          </button>
        )}
        <button onClick={doCopy} style={{ ...(shareable ? btnGhost : btnPrimary), flex: 1 }}>
          {copied ? '✓ コピーしました' : 'プロンプトをコピー'}
        </button>
      </div>

      {measuredCount === 0 && (
        <div style={{ fontSize: 12, color: COLORS.inkSoft, marginTop: 12, lineHeight: 1.6 }}>
          実測がまだ未入力です。実測を入れると、ズレを踏まえた考察を依頼できます。
        </div>
      )}
      <div style={{ fontSize: 11, color: COLORS.gray, marginTop: 10, lineHeight: 1.6 }}>
        プロンプトの内容は設定画面で編集できます。
      </div>
    </div>
  )
}

// --- 変更履歴カード（折りたたみ） ---
function HistoryCard({ history }: { history: Run['history'] }) {
  const [open, setOpen] = useState(false)
  const fmt = (at: number) => {
    const d = new Date(at)
    const pad = (n: number) => String(n).padStart(2, '0')
    return `${d.getMonth() + 1}/${d.getDate()} ${pad(d.getHours())}:${pad(d.getMinutes())}`
  }
  return (
    <div style={cardStyle}>
      <button
        onClick={() => setOpen((v) => !v)}
        style={{
          width: '100%',
          background: 'transparent',
          border: 'none',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          padding: 0,
          fontWeight: 700,
          fontSize: 14,
          color: COLORS.ink,
        }}
      >
        <span>変更履歴（{history.length}）</span>
        <span style={{ color: COLORS.gray }}>{open ? '▾' : '▸'}</span>
      </button>
      {open && (
        <div style={{ marginTop: 12, display: 'flex', flexDirection: 'column', gap: 10 }}>
          {history.map((h, i) => (
            <div key={i} style={{ display: 'flex', gap: 10 }}>
              <span
                className="mono"
                style={{ fontSize: 11, color: COLORS.gray, flexShrink: 0, width: 78 }}
              >
                {fmt(h.at)}
              </span>
              <span style={{ fontSize: 13, color: COLORS.ink, lineHeight: 1.5, whiteSpace: 'pre-wrap' }}>
                {h.comment}
              </span>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}

// --- 保存モーダル ---
function SaveModal({
  onConfirm,
  onCancel,
}: {
  onConfirm: (comment: string) => void
  onCancel: () => void
}) {
  const [comment, setComment] = useState('')
  const canSave = comment.trim() !== ''
  return (
    <Overlay onBackdrop={onCancel}>
      <div
        style={{
          background: COLORS.surface,
          borderRadius: 16,
          padding: 20,
          boxShadow: '0 12px 40px rgba(0,0,0,0.25)',
        }}
      >
        <div style={{ fontWeight: 700, fontSize: 16, marginBottom: 6 }}>変更を保存</div>
        <div style={{ fontSize: 13, color: COLORS.inkSoft, marginBottom: 12, lineHeight: 1.6 }}>
          今回の変更理由を記録します（必須）。
        </div>
        <textarea
          autoFocus
          value={comment}
          onChange={(e) => setComment(e.target.value)}
          placeholder="例: タスクをより細かく分割した / 実測を入力した"
          rows={3}
          style={{
            width: '100%',
            border: `1px solid ${COLORS.line}`,
            borderRadius: 10,
            padding: 10,
            fontSize: 14,
            resize: 'vertical',
            lineHeight: 1.6,
            marginBottom: 16,
          }}
        />
        <div style={{ display: 'flex', gap: 10, justifyContent: 'flex-end' }}>
          <button onClick={onCancel} style={btnGhost}>
            キャンセル
          </button>
          <button
            onClick={() => canSave && onConfirm(comment.trim())}
            disabled={!canSave}
            style={{ ...btnPrimary, background: canSave ? COLORS.accent : COLORS.line }}
          >
            この理由で保存
          </button>
        </div>
      </div>
    </Overlay>
  )
}

// --- 共通スタイル ---
const cardStyle: React.CSSProperties = {
  background: COLORS.surface,
  border: `1px solid ${COLORS.line}`,
  borderRadius: 16,
  padding: 16,
  marginTop: 12,
}

const navBtn: React.CSSProperties = {
  background: 'transparent',
  border: 'none',
  fontSize: 14,
  fontWeight: 600,
  color: COLORS.ink,
  padding: '8px 8px',
  borderRadius: 8,
  minHeight: 36,
}

const btnPrimary: React.CSSProperties = {
  background: COLORS.accent,
  color: '#fff',
  border: 'none',
  borderRadius: 10,
  padding: '11px 14px',
  fontWeight: 700,
  fontSize: 14,
  minHeight: 42,
}

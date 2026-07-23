// プロンプト設定画面（仕様書 §3.3）+ エクスポート/インポート（§6.4）
import { useEffect, useRef, useState } from 'react'
import { COLORS, DEFAULT_PROMPT } from '../constants'
import { isValidAppData, normalizeAppData } from '../storage'
import type { AppData } from '../types'
import { ConfirmDialog, btnGhost, btnSolid } from './common'

export function SettingsView({
  promptTemplate,
  onSavePrompt,
  getData,
  onImport,
  onBack,
}: {
  promptTemplate: string
  onSavePrompt: (template: string) => void
  getData: () => AppData
  onImport: (data: AppData) => void
  onBack: () => void
}) {
  const [draft, setDraft] = useState(promptTemplate)
  const [savedTick, setSavedTick] = useState(false)
  const [confirmBack, setConfirmBack] = useState(false)
  const [pendingImport, setPendingImport] = useState<AppData | null>(null)
  const [importError, setImportError] = useState<string | null>(null)
  const fileRef = useRef<HTMLInputElement>(null)

  useEffect(() => setDraft(promptTemplate), [promptTemplate])

  const dirty = draft !== promptTemplate
  // 空文字は「既定を使用」を意味するため、既定プロンプトを基準に判定
  const effective = draft.trim() ? draft : DEFAULT_PROMPT
  const hasDataToken = effective.includes('{{DATA}}')

  const handleBack = () => {
    if (dirty) setConfirmBack(true)
    else onBack()
  }

  const save = () => {
    onSavePrompt(draft)
    setSavedTick(true)
    setTimeout(() => setSavedTick(false), 1800)
  }

  const resetDefault = () => {
    // 既定に戻す = 空文字（＝既定プロンプトを使用）
    setDraft('')
  }

  // --- エクスポート ---
  const doExport = () => {
    const data = getData()
    const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    const d = new Date()
    const pad = (n: number) => String(n).padStart(2, '0')
    a.href = url
    a.download = `tasklab-${d.getFullYear()}${pad(d.getMonth() + 1)}${pad(d.getDate())}.json`
    document.body.appendChild(a)
    a.click()
    document.body.removeChild(a)
    URL.revokeObjectURL(url)
  }

  // --- インポート ---
  const onFile = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    e.target.value = '' // 同じファイル再選択を可能に
    if (!file) return
    const reader = new FileReader()
    reader.onload = () => {
      try {
        const parsed = JSON.parse(String(reader.result))
        if (!isValidAppData(parsed)) {
          setImportError('ファイル形式が TaskLab のデータではありません。')
          return
        }
        setImportError(null)
        setPendingImport(normalizeAppData(parsed))
      } catch {
        setImportError('JSON を読み込めませんでした。')
      }
    }
    reader.readAsText(file)
  }

  return (
    <div style={{ maxWidth: 480, margin: '0 auto', padding: '0 16px 60px' }}>
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
        <button
          onClick={handleBack}
          style={{ background: 'transparent', border: 'none', fontSize: 14, fontWeight: 600, padding: '8px 4px', minHeight: 36 }}
        >
          ‹ 一覧
        </button>
        {dirty && <span style={{ color: COLORS.accent, fontSize: 18, lineHeight: 1 }}>●</span>}
        <div style={{ flex: 1 }} />
        <span style={{ fontWeight: 700, fontSize: 15 }}>設定</span>
      </nav>

      <h2 style={{ fontSize: 15, fontWeight: 700, margin: '20px 0 8px' }}>AI プロンプト</h2>
      <p style={{ fontSize: 13, color: COLORS.inkSoft, lineHeight: 1.7, margin: '0 0 6px' }}>
        <code style={codeChip}>{'{{DATA}}'}</code>{' '}
        の位置にランのデータ（JSON）が挿入されます。空欄で保存すると既定のプロンプトを使用します。
      </p>
      {!hasDataToken && (
        <div style={warnBox}>
          <code style={codeChip}>{'{{DATA}}'}</code>{' '}
          が見つかりません。このままではデータはプロンプト末尾に自動で追記されます。
        </div>
      )}

      <textarea
        value={draft}
        onChange={(e) => setDraft(e.target.value)}
        placeholder={DEFAULT_PROMPT}
        rows={14}
        aria-label="プロンプト本文"
        style={{
          width: '100%',
          border: `1px solid ${COLORS.line}`,
          borderRadius: 12,
          padding: 12,
          fontSize: 13,
          fontFamily: 'var(--font-mono)',
          lineHeight: 1.6,
          resize: 'vertical',
          background: COLORS.surface,
          color: COLORS.ink,
          marginTop: 6,
        }}
      />

      <div style={{ display: 'flex', gap: 10, marginTop: 12 }}>
        <button onClick={resetDefault} style={btnGhost}>
          既定に戻す
        </button>
        <div style={{ flex: 1 }} />
        <button
          onClick={save}
          disabled={!dirty && !savedTick}
          style={{
            ...btnSolid,
            background: dirty ? COLORS.accent : savedTick ? COLORS.green : COLORS.line,
            color: dirty || savedTick ? '#fff' : COLORS.gray,
          }}
        >
          {savedTick ? '✓ 保存しました' : '保存'}
        </button>
      </div>

      {/* --- データ管理 --- */}
      <h2 style={{ fontSize: 15, fontWeight: 700, margin: '28px 0 8px' }}>データ管理</h2>
      <p style={{ fontSize: 13, color: COLORS.inkSoft, lineHeight: 1.7, margin: '0 0 12px' }}>
        端末変更やバックアップ用に、すべてのランと設定を JSON で書き出し / 読み込みできます。
      </p>
      <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap' }}>
        <button onClick={doExport} style={{ ...btnGhost, flex: 1 }}>
          データを書き出す
        </button>
        <button onClick={() => fileRef.current?.click()} style={{ ...btnGhost, flex: 1 }}>
          データを読み込む
        </button>
        <input
          ref={fileRef}
          type="file"
          accept="application/json,.json"
          onChange={onFile}
          style={{ display: 'none' }}
        />
      </div>
      {importError && (
        <div style={{ ...warnBox, marginTop: 10 }}>{importError}</div>
      )}

      {/* --- ダイアログ --- */}
      {confirmBack && (
        <ConfirmDialog
          title="変更を破棄しますか？"
          message="保存していないプロンプトの変更は失われます。"
          confirmLabel="破棄して戻る"
          danger
          onConfirm={() => {
            setConfirmBack(false)
            onBack()
          }}
          onCancel={() => setConfirmBack(false)}
        />
      )}
      {pendingImport && (
        <ConfirmDialog
          title="データを読み込みますか？"
          message={`現在のすべてのデータが、読み込むファイルの内容（ラン ${pendingImport.runs.length} 件）で置き換えられます。この操作は取り消せません。`}
          confirmLabel="置き換える"
          danger
          onConfirm={() => {
            onImport(pendingImport)
            setPendingImport(null)
          }}
          onCancel={() => setPendingImport(null)}
        />
      )}
    </div>
  )
}

const codeChip: React.CSSProperties = {
  fontFamily: 'var(--font-mono)',
  background: COLORS.accentSoft,
  color: COLORS.accent,
  padding: '1px 6px',
  borderRadius: 6,
  fontSize: 12,
}

const warnBox: React.CSSProperties = {
  fontSize: 12.5,
  color: '#8a5a1a',
  background: '#fbf1dd',
  border: '1px solid #e9d6a8',
  borderRadius: 10,
  padding: '10px 12px',
  lineHeight: 1.6,
  margin: '6px 0',
}

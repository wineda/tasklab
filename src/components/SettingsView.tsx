// プロンプト設定画面（仕様書 §3.3 / モック SettingsScreen 準拠）+ データ入出力（§6.4）
import { useRef, useState } from 'react'
import { COLORS, DEFAULT_PROMPT } from '../constants'
import { isValidAppData, normalizeAppData } from '../storage'
import type { AppData } from '../types'
import { ConfirmDialog } from './common'

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
  const base = promptTemplate || DEFAULT_PROMPT
  const [text, setText] = useState(base)
  const [savedTick, setSavedTick] = useState(false)
  const [confirmBack, setConfirmBack] = useState(false)
  const [pendingImport, setPendingImport] = useState<AppData | null>(null)
  const [importError, setImportError] = useState<string | null>(null)
  const [exportedTick, setExportedTick] = useState(false)
  const fileRef = useRef<HTMLInputElement>(null)

  const dirty = text !== base
  const hasData = text.includes('{{DATA}}')

  const doSave = () => {
    // 既定と同一なら空文字（＝既定を使用）で保存
    onSavePrompt(text === DEFAULT_PROMPT ? '' : text)
    setSavedTick(true)
    setTimeout(() => setSavedTick(false), 1800)
  }

  const doExport = () => {
    const blob = new Blob([JSON.stringify(getData(), null, 2)], { type: 'application/json' })
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
    setExportedTick(true)
    setTimeout(() => setExportedTick(false), 1800)
  }

  const onFile = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    e.target.value = ''
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
    <div className="tl-view">
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
            ● 未保存
          </span>
        )}
      </div>

      <h1 className="tl-disp" style={{ fontSize: 22, fontWeight: 600, margin: '0 0 6px', letterSpacing: '-0.01em' }}>
        プロンプト設定
      </h1>
      <p style={{ fontSize: 13, color: COLORS.inkSoft, margin: '0 0 16px', lineHeight: 1.6 }}>
        「AIからの考察」で渡すプロンプトの本文を編集できます。
        <span className="tl-mono" style={{ color: COLORS.accent }}>
          {' '}
          {'{{DATA}}'}
        </span>{' '}
        の位置に、そのランのデータ（JSON）が自動で挿入されます。
      </p>

      <textarea
        value={text}
        onChange={(e) => setText(e.target.value)}
        rows={16}
        className="tl-input"
        aria-label="プロンプト本文"
        style={{
          width: '100%',
          boxSizing: 'border-box',
          padding: '12px 13px',
          border: `1px solid ${COLORS.line}`,
          borderRadius: 10,
          fontSize: 12.5,
          background: '#fff',
          color: COLORS.ink,
          lineHeight: 1.6,
          fontFamily: "'Space Mono',monospace",
          marginBottom: 8,
        }}
      />

      {!hasData && (
        <p style={{ fontSize: 12, color: COLORS.rose, margin: '0 0 8px' }}>
          ※ <span className="tl-mono">{'{{DATA}}'}</span>{' '}
          が含まれていません。この場合、データは末尾に自動追記されます。
        </p>
      )}

      <div style={{ display: 'flex', gap: 8, marginBottom: 24 }}>
        <button
          className="tl-btn"
          onClick={doSave}
          disabled={!dirty && !savedTick}
          style={{
            flex: 1,
            padding: '13px',
            border: 'none',
            borderRadius: 9,
            background: !dirty && !savedTick ? COLORS.inkSoft : savedTick ? COLORS.green : COLORS.accent,
            color: '#fff',
            fontSize: 14.5,
            fontWeight: 600,
            cursor: 'pointer',
          }}
        >
          {savedTick ? '✓ 保存しました' : '保存'}
        </button>
        <button
          className="tl-btn tl-ghost"
          onClick={() => setText(DEFAULT_PROMPT)}
          style={{
            padding: '13px 18px',
            border: `1px solid ${COLORS.line}`,
            borderRadius: 9,
            background: '#fff',
            color: COLORS.inkSoft,
            fontSize: 14,
            cursor: 'pointer',
          }}
        >
          既定に戻す
        </button>
      </div>

      {/* データ管理 */}
      <h1 className="tl-disp" style={{ fontSize: 22, fontWeight: 600, margin: '0 0 6px', letterSpacing: '-0.01em' }}>
        データ管理
      </h1>
      <p style={{ fontSize: 13, color: COLORS.inkSoft, margin: '0 0 12px', lineHeight: 1.6 }}>
        端末変更やバックアップ用に、すべてのランと設定を JSON で書き出し / 読み込みできます。
        読み込みは現在のデータを全置換します。
      </p>
      <div style={{ display: 'flex', gap: 8 }}>
        <button
          className="tl-btn tl-ghost"
          onClick={doExport}
          style={{
            flex: 1,
            padding: '13px',
            border: `1px solid ${exportedTick ? COLORS.green : COLORS.line}`,
            borderRadius: 9,
            background: '#fff',
            color: exportedTick ? COLORS.green : COLORS.inkSoft,
            fontSize: 14,
            fontWeight: 600,
            cursor: 'pointer',
          }}
        >
          {exportedTick ? '✓ 書き出しました' : 'データを書き出す'}
        </button>
        <button
          className="tl-btn tl-ghost"
          onClick={() => fileRef.current?.click()}
          style={{
            flex: 1,
            padding: '13px',
            border: `1px solid ${COLORS.line}`,
            borderRadius: 9,
            background: '#fff',
            color: COLORS.inkSoft,
            fontSize: 14,
            fontWeight: 600,
            cursor: 'pointer',
          }}
        >
          データを読み込む
        </button>
        <input ref={fileRef} type="file" accept="application/json,.json" onChange={onFile} style={{ display: 'none' }} />
      </div>
      {importError && (
        <p style={{ fontSize: 12, color: COLORS.rose, margin: '10px 0 0' }}>※ {importError}</p>
      )}

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
